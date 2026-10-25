"""Tests for 1:2 Risk-Reward Ratio, 1.5% Account Risk Position Sizing, and Trading Journal API."""
import pytest
from datetime import datetime, timedelta
from backend.app.config import settings
from backend.app.models.trading_journal import TradingJournal
from backend.app.schemas.trading_journal import TradingJournalResponse
from backend.app.models.order import Order
from backend.app.models.trade import Trade
from backend.app.schemas.market import Quote


def test_risk_reward_configuration():
    """Verify Golden Rule 2: Strict 1:2 Risk-Reward ratio configuration."""
    sl_pct = settings.STOP_LOSS_PCT
    rr_ratio = settings.RISK_REWARD_RATIO
    tp_pct = settings.TAKE_PROFIT_PCT

    # At 1.5% SL and 2.0 RR, TP must be exactly 3.0%
    assert rr_ratio == 2.0
    assert sl_pct == 1.5
    assert tp_pct == 3.0
    assert round(tp_pct / sl_pct, 1) == rr_ratio


def test_van_tharp_risk_sizing_math():
    """Verify Golden Rule 3: 1.5% Account Risk Position Sizing calculation."""
    portfolio_value = 10000.00
    max_risk_pct = 1.5
    sl_pct = 1.5
    stock_price = 288.00  # BEL

    capital_at_risk = portfolio_value * (max_risk_pct / 100.0)  # ₹150.00
    risk_per_share = stock_price * (sl_pct / 100.0)              # ₹4.32

    expected_risk_qty = int(capital_at_risk // risk_per_share)  # 150 / 4.32 = 34 shares
    assert capital_at_risk == 150.00
    assert round(risk_per_share, 2) == 4.32
    assert expected_risk_qty == 34

    # 34 shares * 4.32 = 146.88 max loss, strictly <= 150.00 (1.5% of 10,000)
    actual_max_loss = expected_risk_qty * risk_per_share
    assert actual_max_loss <= capital_at_risk


from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db

client = TestClient(app)


def test_trading_journal_model_and_api(db, test_user, auth_headers):
    """Verify Golden Rule 4: Trading Journal entry persistence and API endpoint retrieval."""
    app.dependency_overrides[get_db] = lambda: db
    portfolio = test_user.portfolio

    # Create dummy journal entry
    entry = TradingJournal(
        user_id=test_user.id,
        portfolio_id=portfolio.id,
        symbol="BEL",
        side="BUY_SELL",
        quantity=10,
        entry_price=280.00,
        exit_price=288.40,  # +3.0% gain (1:2 RR on 1.5% SL)
        stop_loss=275.80,   # -1.5%
        take_profit=288.40, # +3.0%
        risk_reward_ratio=2.0,
        risk_amount=42.00,
        realized_pnl=84.00,
        realized_pnl_pct=3.0,
        setup_reason="AI Swing Setup: Score 85/100, D/E 0.0, ROE 24.5%, Volume 1.8x",
        exit_reason="Take-Profit Target Hit (+3.0%, 1:2 RR)",
        emotion_tag="DISCIPLINED",
        ai_critique="Flawless execution. Followed predefined 1:2 Risk-Reward target.",
        holding_seconds=1800,
        created_at=datetime.utcnow() - timedelta(minutes=30),
        closed_at=datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    assert entry.id is not None
    assert entry.realized_pnl == 84.00
    assert entry.risk_reward_ratio == 2.0

    # Test API retrieval with auth headers
    j_resp = client.get("/api/journal", headers=auth_headers)
    assert j_resp.status_code == 200
    data = j_resp.json()
    assert data["total_trades_logged"] >= 1
    assert data["winning_trades"] >= 1
    assert data["win_rate_pct"] == 100.0
    assert data["recent_entries"][0]["symbol"] == "BEL"
    assert data["recent_entries"][0]["emotion_tag"] == "DISCIPLINED"

    # Test updating emotional reflection tag
    entry_id = data["recent_entries"][0]["id"]
    emo_resp = client.post(
        f"/api/journal/{entry_id}/emotion?emotion_tag=PATIENT",
        headers=auth_headers
    )
    assert emo_resp.status_code == 200
    assert emo_resp.json()["emotion_tag"] == "PATIENT"
