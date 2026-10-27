import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import get_db
from backend.app.config import settings
from backend.tests.conftest import TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_health_endpoint():
    """Verify health check endpoint returns active status and paper mode assertion."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["paper_trading_mode"] is True
    assert data["live_trading_enabled"] is False
    assert data["initial_capital_inr"] == settings.INITIAL_VIRTUAL_CAPITAL_INR


def test_auth_and_portfolio_lifecycle():
    """Verify complete registration, login, portfolio initialization with initial capital, deposit, and quotes."""
    email = "integration_test@autopilot.ai"
    # Register
    reg_resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "Integration Tester"
    })
    assert reg_resp.status_code in [201, 400]

    # Login
    login_resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch Portfolio
    port_resp = client.get("/api/portfolio", headers=headers)
    assert port_resp.status_code == 200
    pdata = port_resp.json()
    assert pdata["initial_cash"] == settings.INITIAL_VIRTUAL_CAPITAL_INR
    assert pdata["is_paper_trading"] is True

    # Test Simulated Deposit
    dep_resp = client.post("/api/portfolio/deposit", headers=headers, json={"amount": 500.0, "note": "Test Deposit"})
    assert dep_resp.status_code == 200
    assert dep_resp.json()["cash_balance"] == settings.INITIAL_VIRTUAL_CAPITAL_INR + 500.00

    # Market Quotes
    quotes_resp = client.get("/api/market/quotes")
    assert quotes_resp.status_code == 200
    assert len(quotes_resp.json()) >= 5

    # Scanner
    scan_resp = client.get("/api/scanner/opportunities", headers=headers)
    assert scan_resp.status_code == 200
    sdata = scan_resp.json()
    assert "opportunities" in sdata
    assert "no_trade_reasons" in sdata

    # Strategies
    strat_resp = client.get("/api/strategies")
    assert strat_resp.status_code == 200
    strats = strat_resp.json()
    assert len(strats) >= 3

    # Place Order: BUY 1 share of SUZLON (affordable under ₹100)
    order_resp = client.post("/api/orders", headers=headers, json={
        "symbol": "SUZLON",
        "side": "BUY",
        "order_type": "MARKET",
        "quantity": 1
    })
    assert order_resp.status_code == 201
    odata = order_resp.json()
    assert odata["status"] in ["FILLED", "REJECTED"]

    # Check Risk Status
    risk_resp = client.get("/api/risk/status", headers=headers)
    assert risk_resp.status_code == 200
    rdata = risk_resp.json()
    assert "risk_state" in rdata

    # Kill Switch Trigger
    ks_resp = client.post("/api/risk/kill-switch", headers=headers, json={
        "activate": True,
        "reason": "Test activation"
    })
    assert ks_resp.status_code == 200
    assert ks_resp.json()["is_emergency_stopped"] is True

    # Deactivate Kill Switch
    ks_deact = client.post("/api/risk/kill-switch", headers=headers, json={
        "activate": False,
        "reason": "Test deactivation"
    })
    assert ks_deact.status_code == 200
    assert ks_deact.json()["is_emergency_stopped"] is False

    # AutoPilot Bot Status
    ap_resp = client.get("/api/autopilot/status")
    assert ap_resp.status_code == 200
    ap_data = ap_resp.json()
    assert "status" in ap_data
    assert "autopilot_enabled" in ap_data

    # AutoPilot Toggle
    ap_toggle = client.post("/api/autopilot/toggle", headers=headers, json={"enabled": False})
    assert ap_toggle.status_code == 200
    assert ap_toggle.json()["autopilot_enabled"] is False

    ap_toggle_on = client.post("/api/autopilot/toggle", headers=headers, json={"enabled": True})
    assert ap_toggle_on.status_code == 200
    assert ap_toggle_on.json()["autopilot_enabled"] is True

    # AutoPilot Trigger Scan
    ap_scan = client.post("/api/autopilot/scan", headers=headers)
    assert ap_scan.status_code == 200
    assert ap_scan.json()["success"] is True
