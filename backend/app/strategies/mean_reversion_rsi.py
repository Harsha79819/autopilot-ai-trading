"""Mean Reversion RSI Strategy with Bollinger Bands."""
from typing import List, Dict, Any
from datetime import datetime
import math
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.strategy import StrategySignal
from backend.app.schemas.market import Quote, Candle
from backend.app.strategies.cost_gate import cost_aware_gate


class MeanReversionRSIStrategy(BaseStrategy):
    """
    Mean Reversion Strategy:
    Enters when an asset is severely oversold (RSI 14 < 30) and touches the lower Bollinger Band,
    anticipating a reversion to the 20-period moving average.
    """

    def __init__(self):
        super().__init__(
            name="MeanReversionRSI",
            display_name="RSI Mean Reversion",
            description="Capitalizes on oversold conditions using RSI(14) and Bollinger Bands lower boundary bounce."
        )

    def get_entry_conditions(self) -> List[str]:
        return [
            "Relative Strength Index (RSI 14) is below 32 (oversold)",
            "Price touches or pierces below the lower 2-sigma Bollinger Band",
            "Current candle closes green (close > open), indicating rejection of lows",
            "Cost-Aware Gate confirms expected mean-reversion move clears 3x transaction drag"
        ]

    def get_exit_conditions(self) -> List[str]:
        return [
            "RSI crosses above 55 (mean reached)",
            "Price touches 20-period SMA middle band",
            "Stop-loss triggered at 1.8% below entry"
        ]

    def get_assumptions(self) -> List[str]:
        return [
            "Prices fluctuate around their statistical mean in consolidated regimes",
            "Oversold extremes trigger institutional value buying and short covering"
        ]

    def get_risk_limits(self) -> List[str]:
        return [
            "Stop loss set at 1.8%",
            "No trade if market is in strong downward trend (SMA slope strongly negative)"
        ]

    def get_required_market_data(self) -> List[str]:
        return ["Historical 1-minute OHLCV candles (minimum 30 bars)", "Latest Quote"]

    def get_known_limitations(self) -> List[str]:
        return [
            "Can suffer extended drawdowns if an asset enters an aggressive secular downtrend ('catching a falling knife')",
            "Requires volatile oscillators to trigger"
        ]

    def get_default_parameters(self) -> Dict[str, Any]:
        return {
            "rsi_period": 14,
            "rsi_oversold": 32,
            "rsi_exit": 55,
            "bb_period": 20,
            "bb_std": 2.0,
            "expected_move_pct": 2.5
        }

    def _calc_rsi(self, closes: List[float], period: int = 14) -> float:
        if len(closes) <= period:
            return 50.0
        gains, losses = [], []
        for i in range(1, len(closes)):
            diff = closes[i] - closes[i - 1]
            if diff >= 0:
                gains.append(diff)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(diff))

        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100.0 - (100.0 / (1.0 + rs)), 2)

    def _calc_bollinger_bands(self, closes: List[float], period: int = 20, std_dev_mult: float = 2.0):
        if len(closes) < period:
            return None, None, None
        window = closes[-period:]
        sma = sum(window) / period
        variance = sum((x - sma) ** 2 for x in window) / period
        std_dev = math.sqrt(variance)
        upper = sma + (std_dev_mult * std_dev)
        lower = sma - (std_dev_mult * std_dev)
        return sma, upper, lower

    def evaluate(
        self,
        quote: Quote,
        candles: List[Candle],
        owned_quantity: int = 0,
        available_cash: float = 100.0
    ) -> StrategySignal:
        now = datetime.utcnow()
        default_cost_gate = cost_aware_gate.evaluate(quote, expected_move_pct=2.0)

        if len(candles) < 25:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="NO_TRADE",
                confidence=0.0,
                rationale="Insufficient historical data (need >= 25 bars).",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        closes = [c.close for c in candles]
        rsi = self._calc_rsi(closes, 14)
        sma, upper_bb, lower_bb = self._calc_bollinger_bands(closes, 20, 2.0)

        if sma is None or lower_bb is None:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="NO_TRADE",
                confidence=0.0,
                rationale="Could not compute Bollinger Bands.",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        cur_price = quote.current_price
        last_candle = candles[-1]
        is_green = last_candle.close >= last_candle.open

        # Exit check if holding
        if owned_quantity > 0:
            if rsi >= 55 or cur_price >= sma:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="SELL",
                    confidence=0.80,
                    rationale=f"Mean reached: RSI is {rsi:.1f} (>= 55) or price reached SMA middle band ₹{sma:.2f}.",
                    timestamp=now,
                    price=cur_price,
                    suggested_quantity=owned_quantity,
                    cost_gate=default_cost_gate,
                    is_actionable=True
                )
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="HOLD",
                confidence=0.50,
                rationale=f"Holding position: RSI is {rsi:.1f}, target is SMA middle band ₹{sma:.2f}.",
                timestamp=now,
                price=cur_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        # Bullish entry check
        is_oversold = rsi <= 35
        is_near_lower_band = cur_price <= (lower_bb * 1.015)

        if is_oversold and is_near_lower_band and is_green:
            expected_move_pct = round(((sma - cur_price) / cur_price) * 100.0, 2)
            expected_move_pct = max(expected_move_pct, 1.8)

            gate_res = cost_aware_gate.evaluate(quote, expected_move_pct=expected_move_pct)
            if not gate_res.passed:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="NO_TRADE",
                    confidence=0.35,
                    rationale=f"Oversold bounce detected, but rejected by Cost-Aware Gate: {gate_res.reason}",
                    timestamp=now,
                    price=cur_price,
                    suggested_quantity=0,
                    cost_gate=gate_res,
                    is_actionable=False
                )

            max_qty = math.floor(available_cash / cur_price)
            if max_qty < 1:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="NO_TRADE",
                    confidence=0.0,
                    rationale=f"Oversold setup valid, but share price ₹{cur_price:.2f} > cash ₹{available_cash:.2f}.",
                    timestamp=now,
                    price=cur_price,
                    suggested_quantity=0,
                    cost_gate=gate_res,
                    is_actionable=False
                )

            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="BUY",
                confidence=0.80,
                rationale=f"RSI oversold ({rsi:.1f}) + lower Bollinger Band bounce (₹{cur_price:.2f} near ₹{lower_bb:.2f}). Cost Gate passed.",
                timestamp=now,
                price=cur_price,
                suggested_quantity=max(max_qty, 1),
                cost_gate=gate_res,
                is_actionable=True
            )

        return StrategySignal(
            strategy_name=self.name,
            symbol=quote.symbol,
            action="NO_TRADE",
            confidence=0.15,
            rationale=f"Market condition normal: RSI is {rsi:.1f} (not oversold <= 35).",
            timestamp=now,
            price=cur_price,
            suggested_quantity=0,
            cost_gate=default_cost_gate,
            is_actionable=False
        )
