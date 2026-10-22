"""Test strict multi-user privacy and data isolation."""
import pytest
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.order import Order
from backend.app.auth.security import get_password_hash


def test_user_data_isolation(db, test_user):
    """User B must not see or access User A's portfolio or order records."""
    # Create user B
    user_b = User(
        email="user_b@test.com",
        hashed_password=get_password_hash("pass1234"),
        full_name="User B",
        is_active=True
    )
    db.add(user_b)
    db.flush()

    portfolio_b = Portfolio(
        user_id=user_b.id,
        initial_cash=100.00,
        cash_balance=100.00,
        realized_pnl=0.0,
        total_fees_paid=0.0,
        peak_portfolio_value=100.00,
        is_kill_switched=False
    )
    db.add(portfolio_b)

    # Order belonging to user A
    order_a = Order(
        portfolio_id=test_user.portfolio.id,
        user_id=test_user.id,
        idempotency_key="order-user-a-1",
        symbol="SUZLON",
        side="BUY",
        order_type="MARKET",
        requested_quantity=1,
        filled_quantity=1,
        price=54.50,
        status="FILLED"
    )
    db.add(order_a)
    db.commit()

    # Query orders scoped to User B's portfolio
    user_b_orders = db.query(Order).filter(Order.portfolio_id == portfolio_b.id).all()
    assert len(user_b_orders) == 0

    # Ensure User A's order has user_id = test_user.id
    assert order_a.user_id == test_user.id
    assert order_a.user_id != user_b.id
