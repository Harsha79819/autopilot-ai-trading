"""2-Stage Market Scanner with Whole-Share and Capital Filter."""
from datetime import datetime
import math
from typing import List, Tuple
from backend.app.schemas.scanner import ScannerResponse, ScannerOpportunity, NoTradeReason
from backend.app.market_data import market_provider
from backend.app.strategies import STRATEGY_REGISTRY
from backend.app.strategies.cost_gate import cost_aware_gate
from backend.app.paper_engine.fee_calculator import FeeCalculator
from backend.app.scanner.universe import UNIVERSE_SYMBOLS


class MarketScanner:
    """
    2-Stage Market Scanner:
    - Stage 1: Universe Gating (Capital affordability for whole shares, liquidity, bid-ask spread)
    - Stage 2: Technical Gating & Cost Gate (Strategy pattern match, hurdle rate clearance)
    """

    @staticmethod
    def scan_market(available_cash: float = 100.0) -> ScannerResponse:
        now = datetime.utcnow()
        quotes = market_provider.get_quotes(UNIVERSE_SYMBOLS)

        opportunities: List[ScannerOpportunity] = []
        no_trade_reasons: List[NoTradeReason] = []

        eligible_under_capital = 0
        actionable_count = 0

        for symbol, quote in quotes.items():
            price = quote.current_price
            max_shares = math.floor(available_cash / price) if price > 0 else 0
            eligible_for_capital = max_shares >= 1

            # Stage 1: Capital filter
            if not eligible_for_capital:
                no_trade_reasons.append(NoTradeReason(
                    symbol=symbol,
                    stage="STAGE_1_CAPITAL",
                    reason=f"Share price ₹{price:.2f} exceeds available cash ₹{available_cash:.2f}. Minimum 1 whole share required.",
                    details={"price": price, "available_cash": available_cash, "max_shares": 0}
                ))

            # Stage 1: Liquidity & Spread check
            if quote.spread_pct > 0.35:
                no_trade_reasons.append(NoTradeReason(
                    symbol=symbol,
                    stage="STAGE_1_LIQUIDITY",
                    reason=f"Spread too wide ({quote.spread_pct:.2f}% > 0.35%). Execution friction prohibitive.",
                    details={"spread_pct": quote.spread_pct}
                ))

            if eligible_for_capital:
                eligible_under_capital += 1

            # Fetch candles for technical scoring
            candles = market_provider.get_historical_candles(symbol, timeframe="1m", limit=30)
            closes = [c.close for c in candles] if candles else [price]

            # Indicators
            momentum_score = round(quote.change_pct, 2)
            rsi_val = 50.0
            if len(closes) >= 15:
                gains = [max(closes[i] - closes[i - 1], 0) for i in range(1, len(closes))]
                losses = [max(closes[i - 1] - closes[i], 0) for i in range(1, len(closes))]
                avg_g = sum(gains[-14:]) / 14.0
                avg_l = sum(losses[-14:]) / 14.0
                rs = avg_g / avg_l if avg_l > 0 else 1.0
                rsi_val = round(100.0 - (100.0 / (1.0 + rs)), 1)

            trend = "BULLISH" if momentum_score > 0.5 else ("BEARISH" if momentum_score < -0.5 else "NEUTRAL")

            # Stage 2: Strategy signal evaluation
            matched_strategy = None
            expected_move = 0.0
            best_action = "NO_TRADE"

            for strat_name, strat in STRATEGY_REGISTRY.items():
                sig = strat.evaluate(quote, candles, owned_quantity=0, available_cash=available_cash)
                if sig.action == "BUY" and sig.is_actionable:
                    matched_strategy = strat_name
                    expected_move = sig.cost_gate.expected_move_pct
                    best_action = "BUY"
                    break

            round_trip_cost_pct = FeeCalculator.calculate_round_trip_cost_pct(price, is_intraday=True)
            gate_res = cost_aware_gate.evaluate(quote, expected_move_pct=expected_move or 2.0)

            is_actionable = (best_action == "BUY" and eligible_for_capital and gate_res.passed)

            if eligible_for_capital and not is_actionable:
                if not matched_strategy:
                    no_trade_reasons.append(NoTradeReason(
                        symbol=symbol,
                        stage="STAGE_2_TECHNICAL",
                        reason="No technical strategy entry pattern matched current price action.",
                        details={"rsi": rsi_val, "trend": trend}
                    ))
                elif not gate_res.passed:
                    no_trade_reasons.append(NoTradeReason(
                        symbol=symbol,
                        stage="STAGE_2_COST_GATE",
                        reason=gate_res.reason,
                        details={"hurdle_rate_pct": gate_res.hurdle_rate_pct, "expected_move_pct": expected_move}
                    ))

            if is_actionable:
                actionable_count += 1
                reason_short = "Eligible"
            elif getattr(quote, "is_stale", False):
                reason_short = "Stale quote"
            elif not eligible_for_capital:
                reason_short = "Price above cash"
            elif not gate_res.passed:
                reason_short = "Edge below 3x costs"
            elif not matched_strategy:
                reason_short = "No setup pattern"
            else:
                reason_short = "Filtered"

            opportunities.append(ScannerOpportunity(
                symbol=symbol,
                company_name=quote.company_name,
                current_price=price,
                eligible_for_capital=eligible_for_capital,
                max_affordable_shares=max_shares,
                spread_pct=quote.spread_pct,
                volume_24h=quote.volume,
                momentum_score=momentum_score,
                rsi_14=rsi_val,
                trend_direction=trend,
                strategy_recommendation=matched_strategy,
                expected_move_pct=expected_move,
                estimated_roundtrip_cost_pct=round_trip_cost_pct,
                cost_gate_passed=gate_res.passed,
                is_actionable=is_actionable,
                rejection_reason_short=reason_short
            ))

        decision = "Decision: NO TRADE"
        actionable_ops = [op for op in opportunities if op.is_actionable]
        if actionable_ops:
            best = max(actionable_ops, key=lambda x: x.momentum_score)
            decision = f"Decision: BUY {best.symbol}"

        return ScannerResponse(
            available_cash=available_cash,
            total_scanned=len(UNIVERSE_SYMBOLS),
            eligible_under_capital_count=eligible_under_capital,
            actionable_count=actionable_count,
            scanner_decision=decision,
            opportunities=opportunities,
            no_trade_reasons=no_trade_reasons,
            scanned_at=now,
            is_demo=market_provider.is_demo()
        )


market_scanner = MarketScanner()
