"""Test portfolio accounting and ledger reconciliation."""
import pytest
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.order import Order
from backend.app.models.trade import Trade
from backend.app.paper_engine.ledger import portfolio_ledger
from backend.app.paper_engine.execution_simulator import SimulationExecutionResult
from backend.app.schemas.portfolio import FeeBreakdown


def test_initial_portfolio_balance(test_user):
    """Initial paper portfolio must start with exactly INR 500.00 virtual cash."""
    portfolio = test_user.portfolio
    assert portfolio.initial_cash == 500.00
    assert portfolio.cash_balance == 500.00
    assert portfolio.realized_pnl == 0.00
    assert portfolio.total_fees_paid == 0.00


def test_buy_accounting_debit(db, test_user):
    """Buy order must debit cash by gross + fees, create position, and update fees."""
    portfolio = test_user.portfolio

    order = Order(
        portfolio_id=portfolio.id,
        user_id=test_user.id,
        idempotency_key="test-buy-1",
        symbol="SUZLON",
        side="BUY",
        order_type="MARKET",
        requested_quantity=1,
        filled_quantity=0,
        price=54.50,
        status="SUBMITTED"
    )
    db.add(order)
    db.flush()

    fees = FeeBreakdown(brokerage=0.02, stt=0.0, exchange_charges=0.01, gst=0.01, total_charges=0.04)
    sim_res = SimulationExecutionResult(
        is_fillable=True,
        symbol="SUZLON",
        side="BUY",
        quantity=1,
        benchmark_price=54.50,
        execution_price=54.50,
        gross_amount=54.50,
        fees=fees,
        net_cash_impact=-54.54
    )

    trade = portfolio_ledger.apply_trade_execution(db, portfolio, order, sim_res)

    assert trade is not None
    assert trade.side == "BUY"
    assert round(portfolio.cash_balance, 2) == round(500.00 - 54.54, 2)
    assert round(portfolio.total_fees_paid, 2) == 0.04

    # Verify position created
    position = db.query(Position).filter(Position.portfolio_id == portfolio.id, Position.symbol == "SUZLON").first()
    assert position is not None
    assert position.quantity == 1
    assert position.average_buy_price == 54.50


def test_sell_accounting_credit_and_pnl(db, test_user):
    """Sell order must credit cash by gross - fees, calculate net realized P&L, and clear position."""
    portfolio = test_user.portfolio

    # First simulate position
    position = Position(
        portfolio_id=portfolio.id,
        symbol="SUZLON",
        quantity=1,
        average_buy_price=50.00,
        current_price=50.00,
        unrealized_pnl=0.0
    )
    db.add(position)
    portfolio.cash_balance = 50.00  # 100 - 50
    db.commit()

    order = Order(
        portfolio_id=portfolio.id,
        user_id=test_user.id,
        idempotency_key="test-sell-1",
        symbol="SUZLON",
        side="SELL",
        order_type="MARKET",
        requested_quantity=1,
        filled_quantity=0,
        price=55.00,
        status="SUBMITTED"
    )
    db.add(order)
    db.flush()

    fees = FeeBreakdown(brokerage=0.02, stt=0.01, exchange_charges=0.01, gst=0.01, total_charges=0.05)
    sim_res = SimulationExecutionResult(
        is_fillable=True,
        symbol="SUZLON",
        side="SELL",
        quantity=1,
        benchmark_price=55.00,
        execution_price=55.00,
        gross_amount=55.00,
        fees=fees,
        net_cash_impact=54.95
    )

    trade = portfolio_ledger.apply_trade_execution(db, portfolio, order, sim_res)

    # Gross gain = 55.00 - 50.00 = 5.00. Net realized = 5.00 - 0.05 fees = 4.95
    assert trade.realized_pnl == 4.95
    assert round(portfolio.realized_pnl, 2) == 4.95
    assert round(portfolio.cash_balance, 2) == round(50.00 + 54.95, 2)

    # Position must be cleared
    pos_after = db.query(Position).filter(Position.portfolio_id == portfolio.id, Position.symbol == "SUZLON").first()
    assert pos_after is None
