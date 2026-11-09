"""Test suite for Full Capital Utilization Mode."""
import pytest
from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.risk.risk_manager import RiskManager
from backend.app.database import get_db, SessionLocal
from backend.app.schemas.order import OrderCreate
from backend.app.schemas.market import Quote


def test_tcs_high_conviction_single_share_passes_risk():
    """Verify that 1 share of TCS at ₹3,850 passes risk in a ₹4,293 portfolio."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@autopilot.ai").first()
        if not user or not user.portfolio:
            pytest.skip("Demo user not found")

        # Temporarily mock portfolio cash to ₹4,293.19
        portfolio = user.portfolio
        original_cash = portfolio.cash_balance
        portfolio.cash_balance = 4293.19

        # Test 1 share of TCS at ₹3,850
        passed, reason = RiskManager.validate_pre_trade_risk(
            db=db,
            portfolio=portfolio,
            symbol="TCS",
            side="BUY",
            quantity=1,
            price=3850.00
        )
        assert passed is True, f"TCS risk verification failed: {reason}"

        # Test that downside risk at -1.5% SL is ~₹57.75, which is <= MAX_DAILY_LOSS_INR (₹100)
        downside_risk = 1 * 3850.00 * (settings.STOP_LOSS_PCT / 100.0)
        assert downside_risk <= settings.MAX_DAILY_LOSS_INR
        assert downside_risk == 57.75

        # Restore original cash
        portfolio.cash_balance = original_cash
        db.commit()
    finally:
        db.close()


def test_tatasteel_full_capital_utilization_sizing():
    """Verify that TATASTEEL at ₹150 can deploy ~₹4,000 cash (27 shares) safely."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@autopilot.ai").first()
        if not user or not user.portfolio:
            pytest.skip("Demo user not found")

        portfolio = user.portfolio
        original_cash = portfolio.cash_balance
        portfolio.cash_balance = 4293.19

        # Sizing 27 shares at ₹150 = ₹4,050
        quantity = 27
        price = 150.00
        passed, reason = RiskManager.validate_pre_trade_risk(
            db=db,
            portfolio=portfolio,
            symbol="TATASTEEL",
            side="BUY",
            quantity=quantity,
            price=price
        )
        assert passed is True, f"TATASTEEL 27-share risk verification failed: {reason}"

        # Downside risk at -1.5% SL = 27 * 150 * 0.015 = ₹60.75 <= ₹100
        downside_risk = quantity * price * (settings.STOP_LOSS_PCT / 100.0)
        assert downside_risk <= settings.MAX_DAILY_LOSS_INR
        assert downside_risk == 60.75

        portfolio.cash_balance = original_cash
        db.commit()
    finally:
        db.close()


def test_excessive_risk_blocked_by_daily_loss_check():
    """Verify that an order whose Stop Loss risk exceeds ₹100 is blocked."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@autopilot.ai").first()
        if not user or not user.portfolio:
            pytest.skip("Demo user not found")

        portfolio = user.portfolio
        original_cash = portfolio.cash_balance
        portfolio.cash_balance = 10000.00

        # Buying 50 shares of TCS at ₹3,850 has downside risk of 50 * 3850 * 0.015 = ₹2,887.50 >> ₹100
        passed, reason = RiskManager.validate_pre_trade_risk(
            db=db,
            portfolio=portfolio,
            symbol="TCS",
            side="BUY",
            quantity=50,
            price=3850.00
        )
        assert passed is False
        assert "exceeds remaining daily loss allowance" in reason or "exceeds max allowed allocation" in reason

        portfolio.cash_balance = original_cash
        db.commit()
    finally:
        db.close()
