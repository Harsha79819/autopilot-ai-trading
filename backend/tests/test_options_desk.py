"""Unit and integration tests for Options Trading Desk."""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.options_engine import (
    OptionsEngine,
    black_scholes_price,
    calculate_greeks,
    SUPPORTED_UNDERLYINGS
)
from backend.app.models.options_models import OptionsPortfolio, OptionPosition, OptionTrade
from backend.app.models.user import User


def test_black_scholes_and_greeks():
    """Verify Black-Scholes price and Greeks for Call and Put."""
    spot = 24000.0
    strike = 24000.0
    t_years = 4 / 365.0
    r = 0.07
    sigma = 0.14

    # ATM Call & Put prices should be positive and reasonable (~₹60-120)
    ce_price = black_scholes_price(spot, strike, t_years, r, sigma, "CE")
    pe_price = black_scholes_price(spot, strike, t_years, r, sigma, "PE")

    assert ce_price > 10.0
    assert pe_price > 10.0

    # Greeks
    ce_greeks = calculate_greeks(spot, strike, t_years, r, sigma, "CE")
    pe_greeks = calculate_greeks(spot, strike, t_years, r, sigma, "PE")

    # ATM Call delta should be around ~0.5, Put delta around ~ -0.5
    assert 0.40 <= ce_greeks["delta"] <= 0.60
    assert -0.60 <= pe_greeks["delta"] <= -0.40

    # Theta should be negative (decaying with time)
    assert ce_greeks["theta"] < 0
    assert pe_greeks["theta"] < 0


def test_option_chain_structure_and_multi_underlyings():
    """Verify option chain generates spot, ATM strike, and 11 strike rungs across NIFTY and stocks."""
    # NIFTY Index
    chain_nifty = OptionsEngine.get_option_chain("NIFTY")
    assert chain_nifty["underlying"] == "NIFTY"
    assert chain_nifty["spot_price"] > 10000
    assert chain_nifty["lot_size"] == 25
    assert len(chain_nifty["strikes"]) == 11

    # Stock option (e.g. RELIANCE)
    chain_rel = OptionsEngine.get_option_chain("RELIANCE")
    assert chain_rel["underlying"] == "RELIANCE"
    assert chain_rel["lot_size"] == 250
    assert len(chain_rel["strikes"]) == 11
    assert chain_rel["strikes"][5]["is_atm"] is True


def test_options_portfolio_and_order_execution(db, test_user):
    """Verify order execution, margin check, and risk stops."""
    portfolio = OptionsEngine.get_or_create_portfolio(db, test_user.id)
    assert portfolio.cash_balance == 5000.00
    assert portfolio.is_autopilot_enabled is True

    chain = OptionsEngine.get_option_chain("NIFTY")
    strike_item = next(s for s in chain["strikes"] if s["ce"]["margin_required"] <= 4500.0)
    strike = strike_item["strike"]
    expiry = chain["expiry_date"]
    ce_sym = strike_item["ce"]["symbol"]

    # 1. Place valid order
    res = OptionsEngine.place_order(
        db=db,
        user_id=test_user.id,
        symbol=ce_sym,
        strike_price=strike,
        option_type="CE",
        expiry_date=expiry,
        quantity=25,
        underlying="NIFTY"
    )

    assert res["status"] == "SUCCESS"
    pos_data = res["position"]
    assert pos_data["stop_loss_premium"] < pos_data["entry_premium"]
    assert pos_data["target_premium"] > pos_data["entry_premium"]

    # 2. Portfolio balance should be deducted (margin + statutory fees)
    db.refresh(portfolio)
    assert portfolio.cash_balance < 5000.00
    assert portfolio.total_fees >= 20.0

    # 3. Reject second concurrent position (strict 1-position discipline)
    with pytest.raises(ValueError, match="Active option position already open"):
        OptionsEngine.place_order(
            db=db,
            user_id=test_user.id,
            symbol=ce_sym,
            strike_price=strike,
            option_type="CE",
            expiry_date=expiry,
            quantity=25,
            underlying="NIFTY"
        )

    # 4. Square off position
    pos_id = pos_data["id"]
    exit_res = OptionsEngine.square_off_position(db, pos_id, exit_reason="MANUAL_EXIT")
    assert exit_res["status"] == "SUCCESS"
    assert "MANUAL_EXIT" in exit_res["exit_reason"]

    # Check position is closed and trade recorded
    db.refresh(portfolio)
    assert len(portfolio.trades) == 1
    assert portfolio.trades[0].symbol == ce_sym
    assert portfolio.total_fees >= 40.0  # entry + exit brokerage + statutory levies


def test_autonomous_options_cycle(db, test_user):
    """Verify autonomous options scanning and execution."""
    portfolio = OptionsEngine.get_or_create_portfolio(db, test_user.id)
    assert portfolio.is_autopilot_enabled is True

    # Run single cycle
    res = OptionsEngine.autonomous_options_cycle(db, test_user.id)
    assert "status" in res
    assert res["status"] in ("ENTERED", "NO_SETUP", "POSITION_HELD", "CUTOFF_PASSED")


def test_options_api_endpoints(auth_headers):
    """Verify options REST API routes with test client."""
    client = TestClient(app)

    # 1. Underlyings list endpoint
    res_under = client.get("/api/options/underlyings")
    assert res_under.status_code == 200
    under_list = res_under.json()
    assert len(under_list) >= 8
    symbols = [u["symbol"] for u in under_list]
    assert "NIFTY" in symbols
    assert "RELIANCE" in symbols
    assert "TCS" in symbols

    # 2. Option Chain endpoint with underlying
    res_chain = client.get("/api/options/chain?underlying=RELIANCE")
    assert res_chain.status_code == 200
    chain_json = res_chain.json()
    assert chain_json["underlying"] == "RELIANCE"
    assert "strikes" in chain_json

    # 3. Options Signal endpoint
    res_sig = client.get("/api/options/signal?underlying=NIFTY")
    assert res_sig.status_code == 200
    assert "bias" in res_sig.json()

    # 4. Portfolio endpoint
    res_port = client.get("/api/options/portfolio", headers=auth_headers)
    assert res_port.status_code == 200
    port_json = res_port.json()
    assert port_json["initial_capital"] == 5000.00
    assert port_json["is_autopilot_enabled"] is True

    # 5. Autopilot toggle endpoint
    res_toggle = client.post("/api/options/autopilot/toggle", headers=auth_headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_autopilot_enabled"] is False

    # 6. Comparison endpoint
    res_comp = client.get("/api/options/comparison", headers=auth_headers)
    assert res_comp.status_code == 200
    comp_json = res_comp.json()
    assert "equity" in comp_json
    assert "options" in comp_json
    assert "ai_insight_telugu" in comp_json


def test_pcr_and_max_pain():
    """Verify PCR calculation and Institutional Max Pain strike."""
    res = OptionsEngine.calculate_pcr_and_max_pain("NIFTY")
    assert res["underlying"] == "NIFTY"
    assert res["spot_price"] > 10000
    assert res["pcr"] > 0
    assert res["pcr_sentiment"] in ("BULLISH", "BEARISH", "NEUTRAL")
    assert res["max_pain_strike"] > 0
    assert len(res["pain_levels"]) == 11
    assert any(p["is_max_pain"] for p in res["pain_levels"])
    assert "మ్యాక్స్ పెయిన్" in res["ai_interpretation_telugu"]


def test_hedged_spread_execution(db, test_user):
    """Verify 1-Click Hedged Spreads (Bull Call Spread & Bear Put Spread)."""
    # 1. Bull Call Spread
    res = OptionsEngine.execute_hedged_spread(
        db=db,
        user_id=test_user.id,
        underlying="NIFTY",
        spread_type="BULL_CALL_SPREAD"
    )
    assert res["status"] == "SUCCESS"
    assert res["strategy"] == "BULL_CALL_SPREAD"
    assert "BULL CALL SPREAD" in res["position"]["symbol"]
    assert res["position"]["paired_strike"] is not None

    # Verify active position exists and second spread is rejected
    with pytest.raises(ValueError, match="Active position already open"):
        OptionsEngine.execute_hedged_spread(
            db=db,
            user_id=test_user.id,
            underlying="NIFTY",
            spread_type="BEAR_PUT_SPREAD"
        )

    # Clean up position
    OptionsEngine.square_off_position(db, res["position"]["id"], exit_reason="MANUAL_EXIT")


def test_challenge_and_trade_replay(db, test_user):
    """Verify 30-Day ₹5k Compounding Challenge and Tick-by-Tick Trade Replay."""
    # 1. Challenge status
    chall = OptionsEngine.get_challenge_progress(db, test_user.id)
    assert chall["initial_capital"] == 5000.0
    assert chall["target_capital"] == 15000.0
    assert len(chall["stages"]) == 4
    assert len(chall["badges"]) == 4
    assert "₹5,000" in chall["daily_advice_telugu"]

    # 2. Replay for a trade: place an order and square it off to create a trade record
    order_res = OptionsEngine.execute_hedged_spread(
        db=db,
        user_id=test_user.id,
        underlying="NIFTY",
        spread_type="BULL_CALL_SPREAD"
    )
    pos_id = order_res["position"]["id"]
    exit_res = OptionsEngine.square_off_position(db, pos_id, exit_reason="TARGET_HIT")

    portfolio = OptionsEngine.get_or_create_portfolio(db, test_user.id)
    assert len(portfolio.trades) > 0
    last_trade = portfolio.trades[-1]

    replay = OptionsEngine.get_trade_replay(db, last_trade.id)
    assert replay["trade_id"] == last_trade.id
    assert len(replay["trajectory"]) >= 10
    assert replay["trajectory"][0]["step_index"] == 1
    assert "క్రమశిక్షణ" in replay["post_mortem_telugu"] or "విజయవంతమైన" in replay["post_mortem_telugu"]


def test_advanced_api_routes(auth_headers):
    """Verify REST endpoints for PCR, WhatsApp, Broker Bridge, Challenge, and Replay."""
    client = TestClient(app)

    # 1. PCR & Max Pain route
    r_pcr = client.get("/api/options/pcr-maxpain?underlying=BANKNIFTY")
    assert r_pcr.status_code == 200
    assert r_pcr.json()["underlying"] == "BANKNIFTY"

    # 2. Challenge route
    r_chall = client.get("/api/options/challenge", headers=auth_headers)
    assert r_chall.status_code == 200
    assert r_chall.json()["target_capital"] == 15000.0

    # 3. WhatsApp config & test route
    r_wa_conf = client.post("/api/options/whatsapp/configure", json={"phone": "9876543210", "alerts_enabled": True}, headers=auth_headers)
    assert r_wa_conf.status_code == 200
    assert r_wa_conf.json()["whatsapp_phone"] == "9876543210"

    r_wa_test = client.post("/api/options/whatsapp/test", json={"phone": "9876543210"}, headers=auth_headers)
    assert r_wa_test.status_code == 200
    assert "whatsapp_link" in r_wa_test.json()

    # 4. Broker bridge route
    r_brk_conf = client.post("/api/options/broker/configure", json={
        "broker_name": "ZERODHA",
        "broker_api_key": "kite_key_12345",
        "broker_client_code": "AB1234",
        "is_live_broker_routing": False
    }, headers=auth_headers)
    assert r_brk_conf.status_code == 200
    assert r_brk_conf.json()["broker_name"] == "ZERODHA"

    r_brk_test = client.post("/api/options/broker/test-connection", json={
        "broker_name": "ZERODHA",
        "broker_api_key": "kite_key_12345",
        "broker_client_code": "AB1234",
        "is_live_broker_routing": False
    })
    assert r_brk_test.status_code == 200
    assert r_brk_test.json()["status"] == "CONNECTED"


def test_capital_vault_and_transfer_routes(auth_headers):
    """Verify Capital Vault status, strategy toggle (sleep/active), and transfer endpoints."""
    client = TestClient(app)
    # 1. Vault Status
    res_status = client.get("/api/options/vault/status", headers=auth_headers)
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "main_equity_cash_balance" in status_data
    assert "options_cash_balance" in status_data
    assert "strategies" in status_data
    assert status_data["strategies"]["option_1_vault"]["status"] == "ACTIVE"
    assert status_data["strategies"]["option_2_dynamic_spreads"]["status"] == "SLEEP"
    assert status_data["strategies"]["option_3_bluechip_swing"]["status"] == "SLEEP"

    # 2. Toggle Strategy (Wake up and Put to Sleep)
    res_toggle = client.post("/api/options/vault/strategy/toggle", json={
        "strategy_key": "dynamic_spreads",
        "enabled": True
    }, headers=auth_headers)
    assert res_toggle.status_code == 200
    assert res_toggle.json()["status"] == "ACTIVE"

    # Put back to sleep
    res_sleep = client.post("/api/options/vault/strategy/toggle", json={
        "strategy_key": "dynamic_spreads",
        "enabled": False
    }, headers=auth_headers)
    assert res_sleep.status_code == 200
    assert res_sleep.json()["status"] == "SLEEP"

    # 3. Vault Transfer route
    res_transfer = client.post("/api/options/vault/transfer", json={
        "amount": 500.0,
        "from_desk": "OPTIONS",
        "to_desk": "VAULT",
        "pin": "7981",
        "note": "Test Vault Sweep"
    }, headers=auth_headers)
    assert res_transfer.status_code == 200
    assert res_transfer.json()["success"] is True
    assert res_transfer.json()["transferred_amount"] == 500.0

    # 4. Vault Undo route
    res_undo = client.post("/api/options/vault/undo", headers=auth_headers)
    assert res_undo.status_code == 200
    assert res_undo.json()["success"] is True
    assert res_undo.json()["undone_amount"] == 500.0

    # 5. Indian F&O Taxes & Cutoffs Breakdown route
    res_taxes = client.get("/api/options/taxes", headers=auth_headers)
    assert res_taxes.status_code == 200
    tax_data = res_taxes.json()
    assert "summary" in tax_data
    assert "reality_check" in tax_data
    assert "trade_slips" in tax_data
    assert "total_charges_and_taxes" in tax_data["summary"]
    assert "net_take_home_profit" in tax_data["summary"]




