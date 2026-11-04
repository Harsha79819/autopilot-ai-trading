"""Tests for Task 5: PositionRiskState persistence across runner restarts."""
import pytest
from datetime import datetime
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.position_risk_state import PositionRiskState
from backend.app.services.auto_trader import AutoPilotRunner


def test_trailing_stop_survives_runner_restart(db):
    """Open a position, move peak/trailed stop, create fresh runner, assert state survives."""
    user = User(
        email="persistence_test@autopilot.ai",
        hashed_password="hashed",
        full_name="Persistence Test",
        is_active=True
    )
    db.add(user)
    db.flush()

    portfolio = Portfolio(
        user_id=user.id,
        initial_cash=5000.0,
        cash_balance=4000.0,
        realized_pnl=0.0,
        total_fees_paid=0.0,
        peak_portfolio_value=5000.0
    )
    db.add(portfolio)
    db.flush()

    pos = Position(
        portfolio_id=portfolio.id,
        symbol="RELIANCE",
        quantity=5,
        average_buy_price=2000.0,
        current_price=2060.0
    )
    db.add(pos)
    db.flush()

    # Create initial persisted risk state with trailed stop
    risk_state = PositionRiskState(
        user_id=user.id,
        symbol="RELIANCE",
        entry_price=2000.0,
        stop_loss=1970.0,       # Initial -1.5% SL
        take_profit=2060.0,     # Initial +3.0% TP
        peak_price=2050.0,      # Peak gain +2.5%
        trailed_stop=2019.25,   # Trailed at 1.5% below peak
        opened_at=datetime.utcnow()
    )
    db.add(risk_state)
    db.commit()

    # Simulate fresh runner reboot
    fresh_runner = AutoPilotRunner()
    key = (user.id, "RELIANCE")

    # Verify memory is initially empty before state load
    assert key not in fresh_runner._position_highs
    assert key not in fresh_runner._position_targets

    # Load persisted state
    fresh_runner._load_persisted_risk_state(db)

    # Verify peak price and trailed stop were restored exactly
    assert fresh_runner._position_highs[key] == 2050.0
    targets = fresh_runner._position_targets[key]
    assert targets["entry"] == 2000.0
    assert targets["take_profit"] == 2060.0
    assert targets["stop_loss"] == 2019.25
    assert targets["is_trailed"] is True


def test_rebuild_safe_defaults_for_untracked_position(db):
    """If an open Position has no PositionRiskState row, rebuild safe defaults."""
    user = User(
        email="untracked_test@autopilot.ai",
        hashed_password="hashed",
        full_name="Untracked Test",
        is_active=True
    )
    db.add(user)
    db.flush()

    portfolio = Portfolio(
        user_id=user.id,
        initial_cash=5000.0,
        cash_balance=3500.0
    )
    db.add(portfolio)
    db.flush()

    pos = Position(
        portfolio_id=portfolio.id,
        symbol="TCS",
        quantity=2,
        average_buy_price=3500.0,
        current_price=3500.0
    )
    db.add(pos)
    db.commit()

    fresh_runner = AutoPilotRunner()
    fresh_runner._load_persisted_risk_state(db)

    key = (user.id, "TCS")
    assert key in fresh_runner._position_targets
    targets = fresh_runner._position_targets[key]
    assert targets["entry"] == 3500.0
    assert targets["stop_loss"] == 3447.50   # 3500 * (1 - 0.015)
    assert targets["take_profit"] == 3605.00  # 3500 * (1 + 0.030)

    # Verify a state row was inserted into the database
    persisted = db.query(PositionRiskState).filter(
        PositionRiskState.user_id == user.id,
        PositionRiskState.symbol == "TCS"
    ).first()
    assert persisted is not None
    assert persisted.entry_price == 3500.0
    assert persisted.stop_loss == 3447.50
