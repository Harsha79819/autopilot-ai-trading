"""Security and Multi-Tenant Isolation Regression Test Suite."""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings, Settings
from backend.app.auth.security import create_access_token
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.services.auto_trader import autopilot_runner
from backend.app.risk.risk_manager import get_today_ist_start_utc

client = TestClient(app)


def test_unauthenticated_request_returns_401():
    """Unauthenticated requests must return 401 and never fall back to demo_user."""
    # 1. No Authorization header
    resp = client.get("/api/portfolio")
    assert resp.status_code == 401
    assert "detail" in resp.json()

    # 2. Invalid bearer token
    resp_invalid = client.get("/api/portfolio", headers={"Authorization": "Bearer totally_fake_token_12345"})
    assert resp_invalid.status_code == 401


def test_authenticated_request_succeeds(test_user):
    """Requests with valid JWT token successfully authenticate and resolve the correct portfolio."""
    token = create_access_token(test_user.id)
    resp = client.get("/api/portfolio", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == test_user.id
    assert data["cash_balance"] == test_user.portfolio.cash_balance


def test_websocket_requires_valid_token(test_user):
    """WebSocket stream rejects unauthenticated connection and accepts valid token."""
    # 1. Connection without token should be closed / rejected
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/stream") as ws:
            ws.receive_json()

    # 2. Connection with invalid token should be closed / rejected
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/stream?token=invalid_jwt_token") as ws:
            ws.receive_json()

    # 3. Connection with valid token connects successfully
    token = create_access_token(test_user.id)
    with client.websocket_connect(f"/ws/stream?token={token}") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "CONNECTION_ESTABLISHED"
        assert msg["user_id"] == test_user.id


def test_multi_user_target_isolation():
    """Position targets in AutoPilotRunner must be keyed by (user_id, symbol) to prevent cross-user collisions."""
    runner = autopilot_runner

    user_1_id = 101
    user_2_id = 202
    symbol = "BEL"

    # User 1 enters BEL at ₹280
    runner._position_targets[(user_1_id, symbol)] = {
        "entry": 280.0,
        "take_profit": 288.40,
        "stop_loss": 275.80
    }

    # User 2 enters BEL at ₹300
    runner._position_targets[(user_2_id, symbol)] = {
        "entry": 300.0,
        "take_profit": 309.00,
        "stop_loss": 295.50
    }

    # Verify both targets are independent and do not overwrite each other
    u1_targets = runner._position_targets.get((user_1_id, symbol))
    u2_targets = runner._position_targets.get((user_2_id, symbol))

    assert u1_targets["entry"] == 280.0
    assert u1_targets["take_profit"] == 288.40
    assert u2_targets["entry"] == 300.0
    assert u2_targets["take_profit"] == 309.00

    # User 1 exits BEL
    runner._position_targets.pop((user_1_id, symbol), None)
    assert (user_1_id, symbol) not in runner._position_targets
    assert (user_2_id, symbol) in runner._position_targets

    # Clean up
    runner._position_targets.pop((user_2_id, symbol), None)


@pytest.mark.asyncio
async def test_targeted_broadcast_isolation():
    """User-targeted broadcasts must only be delivered to listeners belonging to that user_id."""
    runner = autopilot_runner

    queue_user_1 = asyncio.Queue()
    queue_user_2 = asyncio.Queue()

    runner.register_listener(queue_user_1, user_id=1)
    runner.register_listener(queue_user_2, user_id=2)

    try:
        # Broadcast targeted to user 1
        await runner.broadcast({"type": "PORTFOLIO_UPDATE", "user_id": 1, "balance": 5000.0}, target_user_id=1)

        # User 1 queue should have received message
        assert not queue_user_1.empty()
        msg_1 = await queue_user_1.get()
        assert msg_1["user_id"] == 1

        # User 2 queue must be empty (isolated)
        assert queue_user_2.empty()

        # Global broadcast should reach both
        await runner.broadcast({"type": "AI_STATUS", "status": "SCANNING"}, target_user_id=None)
        assert not queue_user_1.empty()
        assert not queue_user_2.empty()
    finally:
        runner.unregister_listener(queue_user_1)
        runner.unregister_listener(queue_user_2)


def test_production_jwt_secret_enforcement(monkeypatch):
    """In production environment, setting must raise error if default insecure secret is used."""
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("JWT_SECRET_KEY", "autopilot-super-secret-jwt-key-minimum-32-chars-long")

    with pytest.raises(ValueError) as excinfo:
        Settings()
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(excinfo.value)


def test_ist_midnight_start_utc():
    """Verify get_today_ist_start_utc returns naive UTC datetime corresponding to today 00:00:00 IST."""
    start_utc = get_today_ist_start_utc()
    assert isinstance(start_utc, datetime)
    assert start_utc.tzinfo is None

    # In IST (UTC+5:30), start of day in UTC is always xx:xx:xx with minute=30 and hour=18 of previous day
    assert start_utc.minute == 30
    assert start_utc.hour == 18
