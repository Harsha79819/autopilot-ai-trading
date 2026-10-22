"""Test risk management, daily loss limits, and kill switch."""
import pytest
from datetime import datetime
from backend.app.risk.risk_manager import risk_manager
from backend.app.risk.kill_switch import kill_switch_manager
from backend.app.models.trade import Trade
from backend.app.models.order import Order


def test_kill_switch_blocks_trade(db, test_user):
    """When kill switch is engaged, all new orders must be blocked."""
    portfolio = test_user.portfolio
    kill_switch_manager.set_emergency_stop(db, portfolio, activate=True, reason="Unit test kill switch")

    passed, reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="SUZLON",
        side="BUY",
        quantity=1,
        price=54.50
    )
    assert not passed
    assert "Emergency Stop / Kill Switch is active" in reason


def test_daily_loss_limit_blocks_trade(db, test_user):
    """When today's realized loss exceeds 5% of starting capital (₹5.00 on ₹100), halt trading."""
    portfolio = test_user.portfolio

    # Create dummy order for trade
    order = Order(
        portfolio_id=portfolio.id,
        user_id=test_user.id,
        idempotency_key="risk-loss-order-1",
        symbol="SUZLON",
        side="SELL",
        order_type="MARKET",
        requested_quantity=1,
        filled_quantity=1,
        price=45.0,
        status="FILLED"
    )
    db.add(order)
    db.flush()

    # Simulate losing trade with realized loss = -12.00 INR (exceeds ₹10.00 limit)
    losing_trade = Trade(
        order_id=order.id,
        portfolio_id=portfolio.id,
        user_id=test_user.id,
        symbol="SUZLON",
        side="SELL",
        quantity=1,
        execution_price=45.0,
        gross_amount=45.0,
        net_amount=44.95,
        realized_pnl=-12.00,
        executed_at=datetime.utcnow()
    )
    db.add(losing_trade)
    portfolio.realized_pnl = -12.00
    db.commit()

    passed, reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="SUZLON",
        side="BUY",
        quantity=1,
        price=54.50
    )
    assert not passed
    assert "Maximum daily loss threshold reached" in reason


def test_portfolio_drawdown_limit_blocks_trade(db, test_user):
    """When portfolio drawdown exceeds 15%, trading must halt."""
    portfolio = test_user.portfolio
    portfolio.peak_portfolio_value = 500.00
    portfolio.cash_balance = 400.00  # 20% drawdown (exceeds 15% threshold)
    db.commit()

    passed, reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="SUZLON",
        side="BUY",
        quantity=1,
        price=54.50
    )
    assert not passed
    assert "Maximum portfolio drawdown threshold exceeded" in reason
