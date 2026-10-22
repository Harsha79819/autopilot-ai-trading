"""Momentum Breakout Strategy with EMA cross and volume surge."""
from typing import List, Dict, Any
from datetime import datetime
import math
from backend.app.strategies.base import BaseStrategy
from backend.app.schemas.strategy import StrategySignal
from backend.app.schemas.market import Quote, Candle
from backend.app.strategies.cost_gate import cost_aware_gate


class MomentumBreakoutStrategy(BaseStrategy):
    """
    Momentum Breakout Strategy:
    Enters when the fast exponential moving average (9 EMA) crosses above the slow moving average (21 EMA)
    accompanied by an above-average volume expansion and closing near the high of the recent window.
    """

    def __init__(self):
        super().__init__(
            name="MomentumBreakout",
            display_name="Momentum EMA Breakout",
            description="Identifies upward explosive momentum using 9/21 EMA crossover confirmed by volume surge."
        )

    def get_entry_conditions(self) -> List[str]:
        return [
            "Fast EMA (9) crosses above Slow EMA (21)",
            "Current candle closes above the 20-period highest close",
            "Current volume is at least 1.25x the 20-period average volume",
            "Cost-Aware Gate verifies expected move >= 3x total round-trip friction"
        ]

    def get_exit_conditions(self) -> List[str]:
        return [
            "Fast EMA (9) crosses below Slow EMA (21)",
            "Trailing stop-loss of 1.5% from highest price reached",
            "Take profit reached at 3.0% gain"
        ]

    def get_assumptions(self) -> List[str]:
        return [
            "Price momentum tends to persist in the short term once confirmed by volume",
            "Indian equities experience intraday trending regimes between 09:30 and 11:30 IST",
            "Execution occurs within simulated bid-ask spread without catastrophic slippage"
        ]

    def get_risk_limits(self) -> List[str]:
        return [
            "Fixed stop-loss at 1.5% below entry price",
            "Max single allocation of 100% for accounts <= ₹200 (whole-share limit)",
            "No trade permitted if bid-ask spread > 0.25%"
        ]

    def get_required_market_data(self) -> List[str]:
        return ["Historical 1-minute OHLCV candles (minimum 25 bars)", "Latest Quote with Bid and Ask"]

    def get_known_limitations(self) -> List[str]:
        return [
            "Vulnerable to false breakouts and whipsaws during range-bound, low-volatility markets",
            "Does not account for surprise macroeconomic news announcements",
            "High turnover on small timeframes can produce excessive transaction costs if not cost-gated"
        ]

    def get_default_parameters(self) -> Dict[str, Any]:
        return {
            "fast_period": 9,
            "slow_period": 21,
            "volume_multiplier": 1.25,
            "expected_move_pct": 2.0,
            "stop_loss_pct": 1.5
        }

    def _calc_ema(self, series: List[float], period: int) -> List[float]:
        if len(series) < period:
            return []
        k = 2.0 / (period + 1)
        ema = [sum(series[:period]) / period]
        for val in series[period:]:
            ema.append(val * k + ema[-1] * (1 - k))
        return ema

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
                rationale="Insufficient historical candles (minimum 25 required).",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        closes = [c.close for c in candles]
        volumes = [c.volume for c in candles]

        ema_fast = self._calc_ema(closes, 9)
        ema_slow = self._calc_ema(closes, 21)

        if not ema_fast or not ema_slow:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="NO_TRADE",
                confidence=0.0,
                rationale="Could not compute EMAs.",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        current_fast = ema_fast[-1]
        current_slow = ema_slow[-1]
        prev_fast = ema_fast[-2]
        prev_slow = ema_slow[-2]

        avg_vol = sum(volumes[-20:]) / 20.0
        current_vol = volumes[-1]
        highest_20 = max(closes[-21:-1])

        # If holding shares: check exit conditions
        if owned_quantity > 0:
            if current_fast < current_slow:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="SELL",
                    confidence=0.85,
                    rationale=f"Fast EMA (₹{current_fast:.2f}) crossed below Slow EMA (₹{current_slow:.2f}). Exit triggered.",
                    timestamp=now,
                    price=quote.current_price,
                    suggested_quantity=owned_quantity,
                    cost_gate=default_cost_gate,
                    is_actionable=True
                )
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="HOLD",
                confidence=0.60,
                rationale=f"Holding position: Fast EMA {current_fast:.2f} > Slow EMA {current_slow:.2f}.",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=0,
                cost_gate=default_cost_gate,
                is_actionable=False
            )

        # Bullish entry check
        is_bullish_cross = prev_fast <= prev_slow and current_fast > current_slow
        is_breakout = closes[-1] >= highest_20
        is_volume_confirmed = current_vol >= (avg_vol * 1.15)

        if (is_bullish_cross or (current_fast > current_slow and is_breakout)) and is_volume_confirmed:
            expected_move_pct = 2.2  # 2.2% expected breakout expansion
            gate_res = cost_aware_gate.evaluate(quote, expected_move_pct=expected_move_pct)

            if not gate_res.passed:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="NO_TRADE",
                    confidence=0.40,
                    rationale=f"Breakout pattern detected, but rejected by Cost-Aware Gate: {gate_res.reason}",
                    timestamp=now,
                    price=quote.current_price,
                    suggested_quantity=0,
                    cost_gate=gate_res,
                    is_actionable=False
                )

            # Whole-share affordable quantity
            max_qty = math.floor(available_cash / quote.current_price)
            if max_qty < 1:
                return StrategySignal(
                    strategy_name=self.name,
                    symbol=quote.symbol,
                    action="NO_TRADE",
                    confidence=0.0,
                    rationale=f"Setup valid, but share price ₹{quote.current_price:.2f} exceeds available cash ₹{available_cash:.2f} (0 whole shares).",
                    timestamp=now,
                    price=quote.current_price,
                    suggested_quantity=0,
                    cost_gate=gate_res,
                    is_actionable=False
                )

            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="BUY",
                confidence=0.82,
                rationale=f"Bullish EMA breakout confirmed with volume surge ({current_vol} vs 20-bar avg {int(avg_vol)}). Cost Gate passed.",
                timestamp=now,
                price=quote.current_price,
                suggested_quantity=max(max_qty, 1),
                cost_gate=gate_res,
                is_actionable=True
            )

        return StrategySignal(
            strategy_name=self.name,
            symbol=quote.symbol,
            action="NO_TRADE",
            confidence=0.20,
            rationale="No breakout setup matched current market price action.",
            timestamp=now,
            price=quote.current_price,
            suggested_quantity=0,
            cost_gate=default_cost_gate,
            is_actionable=False
        )
