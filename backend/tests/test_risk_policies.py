"""Tests for Task 9: Overnight & Gap Risk Policy (Intraday 15:00 cutoff, 15:15 square-off, GAP_STOP, Kill Switch liquidation)."""
import pytest
from datetime import datetime, time
from zoneinfo import ZoneInfo
from unittest.mock import patch

from backend.app.config import settings
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.audit_log import AuditLog
from backend.app.models.position_risk_state import PositionRiskState
from backend.app.risk.kill_switch import kill_switch_manager
from backend.app.services.auto_trader import AutoPilotRunner
from backend.app.schemas.market import Quote

IST = ZoneInfo("Asia/Kolkata")


def make_test_quote(symbol="INFY", price=1000.0) -> Quote:
    return Quote(
        symbol=symbol,
        company_name=f"{symbol} Ltd",
        current_price=price,
        open=price,
        high=price * 1.01,
        low=price * 0.99,
        close=price,
        previous_close=price,
        change=0.0,
        change_pct=0.0,
        bid=round(price * 0.999, 2),
        ask=round(price * 1.001, 2),
        spread_pct=0.2,
        volume=100000,
        timestamp=datetime.utcnow(),
        is_stale=False,
    )


@pytest.fixture
def test_user_and_portfolio(db):
    user = User(
        email="risk_policy_test@autopilot.ai",
        hashed_password="hash",
        full_name="Risk Policy Tester",
        is_active=True
    )
    db.add(user)
    db.flush()

    portfolio = Portfolio(
        user_id=user.id,
        initial_cash=5000.0,
        cash_balance=3000.0,
        realized_pnl=0.0,
        total_fees_paid=0.0,
        peak_portfolio_value=5000.0
    )
    db.add(portfolio)
    db.flush()

    pos = Position(
        portfolio_id=portfolio.id,
        symbol="INFY",
        quantity=2,
        average_buy_price=1000.0,
        current_price=1000.0
    )
    db.add(pos)
    db.commit()
    return user, portfolio, pos


def test_kill_switch_closes_positions_when_flag_enabled(db, test_user_and_portfolio, monkeypatch):
    user, portfolio, pos = test_user_and_portfolio
    monkeypatch.setattr(settings, "KILL_SWITCH_CLOSES_POSITIONS", True)

    assert len(portfolio.positions) == 1

    # Trigger kill switch
    kill_switch_manager.set_emergency_stop(db, portfolio, activate=True, reason="Emergency market drop")

    # Verify positions are liquidated
    open_positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    assert len(open_positions) == 0

    # Verify AuditLog has liquidation entry
    liquidation_log = db.query(AuditLog).filter(
        AuditLog.user_id == user.id,
        AuditLog.event_type == "KILL_SWITCH_LIQUIDATION"
    ).first()
    assert liquidation_log is not None
    assert liquidation_log.symbol == "INFY"
    assert liquidation_log.decision == "EXECUTED"


def test_kill_switch_leaves_positions_open_when_flag_disabled(db, test_user_and_portfolio, monkeypatch):
    user, portfolio, pos = test_user_and_portfolio
    monkeypatch.setattr(settings, "KILL_SWITCH_CLOSES_POSITIONS", False)

    assert len(portfolio.positions) == 1

    # Trigger kill switch
    kill_switch_manager.set_emergency_stop(db, portfolio, activate=True, reason="Routine maintenance halt")

    # Verify positions remain open
    open_positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    assert len(open_positions) == 1
    assert portfolio.is_kill_switched is True


@pytest.mark.asyncio
async def test_intraday_entry_cutoff_rejects_new_deployment(db, test_user_and_portfolio, monkeypatch):
    user, portfolio, _ = test_user_and_portfolio
    monkeypatch.setattr(settings, "INTRADAY_ONLY", True)

    runner = AutoPilotRunner()
    fake_time = datetime(2026, 1, 14, 15, 5, 0, tzinfo=IST)

    with patch("backend.app.services.auto_trader.SessionLocal", return_value=db):
        with patch("backend.app.services.auto_trader.to_ist_datetime", return_value=fake_time):
            res = await runner.deploy_remaining_capital(user_id=user.id)
            assert res["success"] is False
            assert "Intraday entry cutoff reached" in res["message"]


@pytest.mark.asyncio
async def test_gap_stop_loss_executed_and_audited(db, test_user_and_portfolio, monkeypatch):
    user, portfolio, pos = test_user_and_portfolio
    runner = AutoPilotRunner()

    # Setup targets: entry 1000, SL = 985.0 (-1.5%)
    runner._position_targets[(user.id, "INFY")] = {
        "entry": 1000.0,
        "take_profit": 1030.0,
        "stop_loss": 985.0
    }

    # Simulate market opening with gap down to 960.0 (below stop loss 985.0)
    gap_quote = make_test_quote(symbol="INFY", price=960.0)

    with patch("backend.app.services.auto_trader.SessionLocal", return_value=db):
        with patch("backend.app.services.auto_trader.market_provider.get_quote", return_value=gap_quote):
            trading_time = datetime(2026, 1, 14, 9, 20, 0, tzinfo=IST)
            with patch("backend.app.services.auto_trader.is_market_session_active", return_value=(True, "Market Open")):
                with patch("backend.app.services.auto_trader.to_ist_datetime", return_value=trading_time):
                    await runner.run_single_cycle()

    # Assert INFY position was sold
    infy_pos = db.query(Position).filter(Position.portfolio_id == portfolio.id, Position.symbol == "INFY").first()
    assert infy_pos is None

    # Assert GAP_STOP was logged in AuditLog
    gap_audit = db.query(AuditLog).filter(
        AuditLog.user_id == user.id,
        AuditLog.event_type == "GAP_STOP"
    ).first()
    assert gap_audit is not None
    assert "Gap-through Stop-Loss" in gap_audit.reason
    assert gap_audit.decision == "EXECUTED"
    assert gap_audit.symbol == "INFY"


@pytest.mark.asyncio
async def test_intraday_square_off_at_1515(db, test_user_and_portfolio, monkeypatch):
    user, portfolio, pos = test_user_and_portfolio
    monkeypatch.setattr(settings, "INTRADAY_ONLY", True)
    runner = AutoPilotRunner()

    normal_quote = make_test_quote(symbol="INFY", price=1005.0)
    square_off_time = datetime(2026, 1, 14, 15, 16, 0, tzinfo=IST)

    with patch("backend.app.services.auto_trader.SessionLocal", return_value=db):
        with patch("backend.app.services.auto_trader.market_provider.get_quote", return_value=normal_quote):
            with patch("backend.app.services.auto_trader.is_market_session_active", return_value=(True, "Market Open")):
                with patch("backend.app.services.auto_trader.to_ist_datetime", return_value=square_off_time):
                    await runner.run_single_cycle()

    # Position should be closed via square-off
    positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    assert len(positions) == 0

    # AuditLog should contain INTRADAY_SQUARE_OFF
    sq_off_audit = db.query(AuditLog).filter(
        AuditLog.user_id == user.id,
        AuditLog.event_type == "INTRADAY_SQUARE_OFF"
    ).first()
    assert sq_off_audit is not None
    assert sq_off_audit.decision == "EXECUTED"
    assert "15:15 IST" in sq_off_audit.reason
