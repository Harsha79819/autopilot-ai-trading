"""Trend Following Supertrend Strategy using ATR bands."""
from typing import List, Dict, Any
from datetime import datetime
import math
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.strategy import StrategySignal
from backend.app.schemas.market import Quote, Candle
from backend.app.strategies.cost_gate import cost_aware_gate


class TrendFollowingSupertrendStrategy(BaseStrategy):
    """
    Trend Following Strategy:
    Uses Average True Range (ATR) dynamic bands to detect sustained regime shifts and ride momentum.
    """

    def __init__(self):
        super().__init__(
            name="TrendFollowing",
            display_name="Supertrend Trend Rider",
            description="Tracks medium-term directional shifts using ATR-derived dynamic bands."
        )

    def get_entry_conditions(self) -> List[str]:
        return [
            "Current candle closes above dynamic ATR upper resistance band",
            "Supertrend flips from Bearish to Bullish",
            "Cost-Aware Gate confirms expected trend run clears 3x transaction drag"
        ]

    def get_exit_conditions(self) -> List[str]:
        return [
            "Current candle closes below dynamic ATR trailing support band (trend flip to Bearish)",
            "Trailing stop reached"
        ]

    def get_assumptions(self) -> List[str]:
        return [
            "Financial markets demonstrate fat-tailed persistent trends over medium timeframes",
            "Cut losses quickly and let winning trends run"
        ]

    def get_risk_limits(self) -> List[str]:
        return [
            "Stop loss set dynamically at Supertrend trailing band",
            "No trade during high slippage / wide spread regimes"
        ]

    def get_required_market_data(self) -> List[str]:
        return ["Historical 1-minute OHLCV candles (minimum 20 bars)", "Latest Quote"]

    def get_known_limitations(self) -> List[str]:
        return [
            "Gives back significant portions of profits at trend exhaustion peaks",
            "High whipsaw rate during choppy, sideways trading"
        ]

    def get_default_parameters(self) -> Dict[str, Any]:
        return {
            "atr_period": 10,
            "atr_multiplier": 3.0,
            "expected_move_pct": 2.5
        }

    def _calc_atr(self, candles: List[Candle], period: int = 10) -> float:
        if len(candles) < 2:
            return 1.0
        trs = []
        for i in range(1, len(candles)):
            high = candles[i].high
            low = candles[i].low
            prev_close = candles[i - 1].close
            tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
            trs.append(tr)
        return sum(trs[-period:]) / min(len(trs), period)

    def evaluate(
        self,
        quote: Quote,
        candles: List[Candle],
        owned_quantity: int = 0,
        available_cash: float = 100.0
    ) -> StrategySignal:
        now = datetime.utcnow()
        default_cost_gate = cost_aware_gate.evaluate(quote, expected_move_pct=2.5)

        if len(candles) < 20:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="NO_TRADE",
                confidence=0.0,
                rationale="Insufficient candles for ATR trend calculation.",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        atr = self._calc_atr(candles, 10)
        cur_price = quote.current_price
        mid = (candles[-1].high + candles[-1].low) / 2.0
        upper_band = mid + (2.0 * atr)
        lower_band = mid - (2.0 * atr)

        # Holding exit check
        if owned_quantity > 0:
            if cur_price < lower_band:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="SELL",
                    confidence=0.85,
                    rationale=f"Trend reversed: price ₹{cur_price:.2f} closed below lower band ₹{lower_band:.2f}.",
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
                confidence=0.65,
                rationale=f"Riding trend: price ₹{cur_price:.2f} safely above trailing band ₹{lower_band:.2f}.",
                timestamp=now,
                price=cur_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        # Bullish trend entry
        if cur_price >= upper_band:
            expected_move = round((atr * 2.0 / cur_price) * 100.0, 2)
            expected_move = max(expected_move, 2.0)
            gate_res = cost_aware_gate.evaluate(quote, expected_move_pct=expected_move)

            if not gate_res.passed:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="NO_TRADE",
                    confidence=0.30,
                    rationale=f"Trend breakout detected, but rejected by Cost-Aware Gate: {gate_res.reason}",
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
                    rationale=f"Trend setup valid, but price ₹{cur_price:.2f} > cash ₹{available_cash:.2f}.",
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
                confidence=0.78,
                rationale=f"Supertrend bullish expansion (price ₹{cur_price:.2f} crossed upper band ₹{upper_band:.2f}). Cost Gate passed.",
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
            confidence=0.20,
            rationale=f"No trend breakout: price ₹{cur_price:.2f} is within bands [₹{lower_band:.2f} - ₹{upper_band:.2f}].",
            timestamp=now,
            price=cur_price,
            suggested_quantity=0,
            cost_gate=default_cost_gate,
            is_actionable=False
        )
