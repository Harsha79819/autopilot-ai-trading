"""Cost-Aware Gate protecting micro portfolios from fee erosion."""
from backend.app.schemas.strategy import CostGateResult
from backend.app.schemas.market import Quote
from backend.app.paper_engine.fee_calculator import FeeCalculator
from backend.app.config import settings


class CostAwareGate:
    """
    Enforces the formula:
    expected_move_pct >= K * (round_trip_cost_pct + spread_pct + slippage_pct)
    Protects small INR 100 accounts from trading setups where transaction drag eats all edge.
    """

    @staticmethod
    def evaluate(
        quote: Quote,
        expected_move_pct: float,
        multiplier_k: float = None,
        is_intraday: bool = True
    ) -> CostGateResult:
        k = multiplier_k if multiplier_k is not None else settings.COST_AWARE_GATE_MULTIPLIER

        price = quote.current_price
        round_trip_cost_pct = FeeCalculator.calculate_round_trip_cost_pct(price, is_intraday)
        spread_pct = quote.spread_pct

        # Round-trip slippage in %
        slippage_pct = (settings.SIMULATED_SLIPPAGE_BPS / 10000.0) * 2.0 * 100.0  # e.g., 0.10%

        total_friction_pct = round(round_trip_cost_pct + spread_pct + slippage_pct, 3)
        hurdle_rate_pct = round(k * total_friction_pct, 3)

        passed = expected_move_pct >= hurdle_rate_pct

        if passed:
            reason = (
                f"Cost gate PASSED: Expected move ({expected_move_pct:.2f}%) exceeds "
                f"required hurdle rate ({hurdle_rate_pct:.2f}% = {k}x total friction of {total_friction_pct:.2f}%)."
            )
        else:
            reason = (
                f"Cost gate FAILED (NO TRADE): Expected move ({expected_move_pct:.2f}%) is below "
                f"minimum hurdle rate ({hurdle_rate_pct:.2f}% = {k}x total friction of {total_friction_pct:.2f}%). "
                f"Fees would consume the majority of gross profit."
            )

        return CostGateResult(
            passed=passed,
            multiplier_k=k,
            expected_move_pct=expected_move_pct,
            round_trip_cost_pct=round_trip_cost_pct,
            spread_pct=spread_pct,
            slippage_pct=slippage_pct,
            total_friction_pct=total_friction_pct,
            hurdle_rate_pct=hurdle_rate_pct,
            reason=reason
        )


cost_aware_gate = CostAwareGate()
