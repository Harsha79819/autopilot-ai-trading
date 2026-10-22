"""Execution simulator enforcing whole-share rules and realistic slippage."""
import math
from typing import Tuple, Optional
from backend.app.schemas.market import Quote
from backend.app.schemas.portfolio import FeeBreakdown
from backend.app.paper_engine.fee_calculator import FeeCalculator
from backend.app.config import settings


class SimulationExecutionResult:
    def __init__(
        self,
        is_fillable: bool,
        rejection_reason: Optional[str] = None,
        symbol: str = "",
        side: str = "",
        quantity: int = 0,
        benchmark_price: float = 0.0,
        execution_price: float = 0.0,
        gross_amount: float = 0.0,
        fees: Optional[FeeBreakdown] = None,
        net_cash_impact: float = 0.0,
    ):
        self.is_fillable = is_fillable
        self.rejection_reason = rejection_reason
        self.symbol = symbol
        self.side = side
        self.quantity = quantity
        self.benchmark_price = benchmark_price
        self.execution_price = execution_price
        self.gross_amount = gross_amount
        self.fees = fees or FeeBreakdown()
        self.net_cash_impact = net_cash_impact


class ExecutionSimulator:
    """Simulates realistic execution on Indian markets with whole-share rules."""

    @staticmethod
    def simulate_order(
        symbol: str,
        side: str,
        quantity: int,
        quote: Quote,
        available_cash: float,
        owned_quantity: int = 0,
        order_type: str = "MARKET",
        limit_price: Optional[float] = None,
        is_intraday: bool = True
    ) -> SimulationExecutionResult:
        side_upper = side.upper()

        # Rule 1: Whole share constraint
        if not isinstance(quantity, int) or quantity < 1:
            return SimulationExecutionResult(
                is_fillable=False,
                rejection_reason=f"Whole-share constraint violated: quantity must be an integer >= 1 (got {quantity})."
            )

        # Rule 2: Valid price quote
        if quote.current_price <= 0:
            return SimulationExecutionResult(
                is_fillable=False,
                rejection_reason=f"Invalid market quote for {symbol}: price must be positive."
            )

        # Rule 3: Stale quote check
        if quote.is_stale:
            return SimulationExecutionResult(
                is_fillable=False,
                rejection_reason=f"Stale market data detected for {symbol}. Order rejected for safety."
            )

        # Slippage calculations (0.05% - 0.10% buffer)
        slippage_rate = settings.SIMULATED_SLIPPAGE_BPS / 10000.0  # 0.00075 (0.075%)
        spread_rate = settings.SIMULATED_SPREAD_BPS / 10000.0      # 0.0010 (0.10%)

        if side_upper == "BUY":
            # Buy fills at ask price + slippage buffer
            if quote.ask > 0:
                benchmark_price = quote.ask
            else:
                benchmark_price = round(quote.current_price * (1.0 + spread_rate / 2.0), 2)
            execution_price = round(benchmark_price * (1.0 + slippage_rate), 2)

            # Limit order check
            if order_type == "LIMIT" and limit_price is not None:
                if execution_price > limit_price:
                    return SimulationExecutionResult(
                        is_fillable=False,
                        rejection_reason=f"Limit price {limit_price} exceeded by simulated execution price {execution_price}."
                    )
                execution_price = min(execution_price, limit_price)

            gross_amount = round(quantity * execution_price, 2)
            fees = FeeCalculator.calculate_fees(
                symbol=symbol,
                side="BUY",
                quantity=quantity,
                price=execution_price,
                is_intraday=is_intraday
            )
            total_cash_needed = round(gross_amount + fees.total_charges, 2)

            # Rule 4: Solvency check
            if total_cash_needed > available_cash:
                return SimulationExecutionResult(
                    is_fillable=False,
                    rejection_reason=(
                        f"Insufficient available cash. Required: INR {total_cash_needed:.2f} "
                        f"(Gross: ₹{gross_amount:.2f} + Fees: ₹{fees.total_charges:.2f}), "
                        f"Available: INR {available_cash:.2f}."
                    )
                )

            return SimulationExecutionResult(
                is_fillable=True,
                symbol=symbol,
                side="BUY",
                quantity=quantity,
                benchmark_price=benchmark_price,
                execution_price=execution_price,
                gross_amount=gross_amount,
                fees=fees,
                net_cash_impact=-total_cash_needed  # Cash decreases
            )

        elif side_upper == "SELL":
            # Rule 5: Position check
            if owned_quantity < quantity:
                return SimulationExecutionResult(
                    is_fillable=False,
                    rejection_reason=(
                        f"Insufficient owned shares to sell. Owned: {owned_quantity}, "
                        f"Requested to sell: {quantity}."
                    )
                )

            # Sell fills at bid price - slippage buffer
            if quote.bid > 0:
                benchmark_price = quote.bid
            else:
                benchmark_price = round(quote.current_price * (1.0 - spread_rate / 2.0), 2)
            execution_price = max(round(benchmark_price * (1.0 - slippage_rate), 2), 0.05)

            # Limit order check
            if order_type == "LIMIT" and limit_price is not None:
                if execution_price < limit_price:
                    return SimulationExecutionResult(
                        is_fillable=False,
                        rejection_reason=f"Simulated execution price {execution_price} is below limit price {limit_price}."
                    )
                execution_price = max(execution_price, limit_price)

            gross_amount = round(quantity * execution_price, 2)
            fees = FeeCalculator.calculate_fees(
                symbol=symbol,
                side="SELL",
                quantity=quantity,
                price=execution_price,
                is_intraday=is_intraday
            )
            net_proceeds = round(gross_amount - fees.total_charges, 2)

            return SimulationExecutionResult(
                is_fillable=True,
                symbol=symbol,
                side="SELL",
                quantity=quantity,
                benchmark_price=benchmark_price,
                execution_price=execution_price,
                gross_amount=gross_amount,
                fees=fees,
                net_cash_impact=net_proceeds  # Cash increases
            )

        return SimulationExecutionResult(
            is_fillable=False,
            rejection_reason=f"Invalid order side: {side}. Must be BUY or SELL."
        )


execution_simulator = ExecutionSimulator()
