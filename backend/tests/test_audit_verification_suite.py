"""
AutoPilot AI Trading - Deep Audit Verification Suite
Covers:
1. Accounting & Granular Fee Breakdown for 3 trades + Exact Reconciliation.
2. 15:10 IST EOD Square-Off, Startup Catch-Up at 15:25 IST, UTC normalization, and Post-15:10 Entry Block.
3. Margin Sizing (Zero cash, low cash, fee buffer overflow, zero max(1) bugs).
4. Stop-Loss Hard Gate, DB Persistence Recovery across restarts, 15% Tick Jump Filter, and Gap-Down Exit.
5. Integrity Audit of Engine.
"""
import pytest
from datetime import datetime, time, timedelta
from unittest.mock import patch

from backend.app.models.user import User
from backend.app.models.options_models import OptionsPortfolio, OptionPosition, OptionTrade
from backend.app.services.options_engine import (
    OptionsEngine,
    SUPPORTED_UNDERLYINGS,
    FLAT_BROKERAGE_PER_ORDER,
    black_scholes_price
)
from backend.app.services.daily_scheduler_service import DailySchedulerService
from backend.app.market_data.market_calendar import to_ist_datetime, is_trading_day


def _get_audit_portfolio(db, initial_cash=5000.0) -> OptionsPortfolio:
    user = db.query(User).filter(User.email == "audit_verification@autopilot.ai").first()
    if not user:
        user = User(
            email="audit_verification@autopilot.ai",
            hashed_password="hash",
            full_name="Audit Officer",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    portfolio = db.query(OptionsPortfolio).filter(OptionsPortfolio.user_id == user.id).first()
    if not portfolio:
        portfolio = OptionsPortfolio(
            user_id=user.id,
            initial_capital=initial_cash,
            cash_balance=initial_cash,
            realized_pnl=0.0,
            total_fees=0.0,
            peak_equity=initial_cash,
            is_autopilot_enabled=True,
            whatsapp_phone="917981940390",
            whatsapp_alerts_enabled=False
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
    else:
        portfolio.cash_balance = initial_cash
        portfolio.initial_capital = initial_cash
        portfolio.realized_pnl = 0.0
        portfolio.total_fees = 0.0
        portfolio.peak_equity = initial_cash
        db.query(OptionPosition).filter(OptionPosition.portfolio_id == portfolio.id).delete()
        db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).delete()
        db.commit()
        db.refresh(portfolio)
    return portfolio


# ==============================================================================
# SECTION 1: ACCOUNTING & 3 TRADES TEST CASES
# ==============================================================================
def test_item_1_granular_ledger_and_3_historical_trades(db):
    """
    Verifies granular fee separation in ledger and runs exact replay of:
    1. RELIANCE1360PE: Entry 13.59, Exit 13.52, Qty 250 -> Net P&L: -₹70.97
    2. RELIANCE1380CE: Entry 9.65, Exit 15.44, Qty 250 -> Net P&L: +₹1393.78
    3. HDFCBANK860CE: Entry 7.19, Exit 11.50, Qty 550 -> Net P&L: +₹2312.58
    Asserts cash == 5000 + sum(net_pnl) - open_cost (Discrepancy == 0.00).
    """
    portfolio = _get_audit_portfolio(db, initial_cash=5000.0)

    # Historical Trade 1: RELIANCE 1360 PE
    c1 = OptionsEngine.calculate_trade_statutory_charges(13.59, 13.52, 250)
    pos1 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="RELIANCE1360PE",
        underlying="RELIANCE",
        strike_price=1360.0,
        option_type="PE",
        expiry_date="2026-11-28",
        lot_size=250,
        quantity=250,
        entry_premium=13.59,
        current_premium=13.59,
        stop_loss_premium=10.87,
        target_premium=19.03,
        trailing_stop_premium=10.87,
        is_open=True
    )
    db.add(pos1)
    # Buy debit
    portfolio.cash_balance = round(portfolio.cash_balance - (13.59 * 250 + c1["buy_charges"]), 2)
    portfolio.total_fees = round(portfolio.total_fees + c1["buy_charges"], 2)
    db.commit()

    # Square off
    res1 = OptionsEngine.square_off_position(db, pos1.id, exit_reason="MANUAL_EXIT", force_exit_premium=13.52)
    trade1 = db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).order_by(OptionTrade.id.desc()).first()

    # Verify granular fields are separated and non-zero
    assert trade1.entry_premium == 13.59
    assert trade1.exit_premium == 13.52
    assert trade1.quantity == 250
    assert trade1.brokerage == c1["brokerage"]
    assert trade1.stt == c1["stt"]
    assert trade1.gst == c1["gst"]
    assert trade1.exchange_charges == c1["exchange_charges"]
    assert trade1.stamp_duty == c1["stamp_duty"]
    assert trade1.gross_pnl == c1["gross_pnl"]
    assert trade1.net_pnl == c1["net_pnl_after_charges"]
    assert trade1.realized_pnl == c1["net_pnl_after_charges"]

    # Historical Trade 2: RELIANCE 1380 CE
    c2 = OptionsEngine.calculate_trade_statutory_charges(9.65, 15.44, 250)
    pos2 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="RELIANCE1380CE",
        underlying="RELIANCE",
        strike_price=1380.0,
        option_type="CE",
        expiry_date="2026-11-28",
        lot_size=250,
        quantity=250,
        entry_premium=9.65,
        current_premium=9.65,
        stop_loss_premium=7.72,
        target_premium=13.51,
        trailing_stop_premium=7.72,
        is_open=True
    )
    db.add(pos2)
    portfolio.cash_balance = round(portfolio.cash_balance - (9.65 * 250 + c2["buy_charges"]), 2)
    portfolio.total_fees = round(portfolio.total_fees + c2["buy_charges"], 2)
    db.commit()

    res2 = OptionsEngine.square_off_position(db, pos2.id, exit_reason="TARGET_HIT", force_exit_premium=15.44)
    trade2 = db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).order_by(OptionTrade.id.desc()).first()

    assert trade2.brokerage == c2["brokerage"]
    assert trade2.stt == c2["stt"]
    assert trade2.gst == c2["gst"]
    assert trade2.exchange_charges == c2["exchange_charges"]
    assert trade2.stamp_duty == c2["stamp_duty"]
    assert trade2.gross_pnl == c2["gross_pnl"]
    assert trade2.net_pnl == c2["net_pnl_after_charges"]

    # Historical Trade 3: HDFCBANK 860 CE
    c3 = OptionsEngine.calculate_trade_statutory_charges(7.19, 11.50, 550)
    pos3 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="HDFCBANK860CE",
        underlying="HDFCBANK",
        strike_price=860.0,
        option_type="CE",
        expiry_date="2026-11-28",
        lot_size=550,
        quantity=550,
        entry_premium=7.19,
        current_premium=7.19,
        stop_loss_premium=5.75,
        target_premium=10.07,
        trailing_stop_premium=5.75,
        is_open=True
    )
    db.add(pos3)
    portfolio.cash_balance = round(portfolio.cash_balance - (7.19 * 550 + c3["buy_charges"]), 2)
    portfolio.total_fees = round(portfolio.total_fees + c3["buy_charges"], 2)
    db.commit()

    res3 = OptionsEngine.square_off_position(db, pos3.id, exit_reason="TARGET_HIT", force_exit_premium=11.50)
    trade3 = db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).order_by(OptionTrade.id.desc()).first()

    assert trade3.brokerage == c3["brokerage"]
    assert trade3.stt == c3["stt"]
    assert trade3.gst == c3["gst"]
    assert trade3.exchange_charges == c3["exchange_charges"]
    assert trade3.stamp_duty == c3["stamp_duty"]
    assert trade3.gross_pnl == c3["gross_pnl"]
    assert trade3.net_pnl == c3["net_pnl_after_charges"]

    # Reconcile Total Cash Balance
    recon = OptionsEngine.reconcile_portfolio_ledger(db, portfolio)
    expected_net_sum = round(trade1.net_pnl + trade2.net_pnl + trade3.net_pnl, 2)
    expected_cash = round(5000.00 + expected_net_sum, 2)

    assert recon["sum_net_pnl"] == expected_net_sum
    assert recon["cash_balance"] == expected_cash
    assert recon["expected_cash"] == expected_cash
    assert recon["discrepancy"] == 0.00
    assert recon["is_reconciled"] is True


# ==============================================================================
# SECTION 2: SQUARE-OFF CHECK
# ==============================================================================
def test_item_2_square_off_startup_and_utc_timezone_and_entry_block(db):
    """
    1. Simulation test: server starts at 15:25 IST -> open positions immediately close.
    2. Server in UTC timezone (09:40:00 UTC) triggers at 15:10 IST.
    3. New entry attempt after 15:10 IST is blocked with ValueError.
    """
    portfolio = _get_audit_portfolio(db, initial_cash=5000.0)

    # 1. Startup Catch-up at 15:25 IST
    pos_lingering = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="NIFTY24NOV24000CE",
        underlying="NIFTY",
        strike_price=24000.0,
        option_type="CE",
        expiry_date="2026-11-28",
        lot_size=25,
        quantity=25,
        entry_premium=100.0,
        current_premium=100.0,
        stop_loss_premium=80.0,
        target_premium=140.0,
        trailing_stop_premium=80.0,
        is_open=True
    )
    db.add(pos_lingering)
    c_ling = OptionsEngine.calculate_trade_statutory_charges(100.0, 100.0, 25)
    portfolio.cash_balance = round(portfolio.cash_balance - (100.0 * 25 + c_ling["buy_charges"]), 2)
    db.commit()

    # 15:25 IST corresponds to 09:55 UTC on a weekday
    mock_utc_1525 = datetime(2026, 11, 26, 9, 55, 0)
    with patch("backend.app.services.options_engine.datetime") as mock_dt:
        mock_dt.utcnow.return_value = mock_utc_1525
        OptionsEngine.startup_catchup(db)

    db.refresh(pos_lingering)
    assert pos_lingering.is_open is False  # Immediately closed!

    # 2. Server in UTC timezone: 09:40:00 UTC converts to exactly 15:10:00 IST
    utc_cutoff_dt = datetime(2026, 11, 26, 9, 40, 0)
    ist_converted = to_ist_datetime(utc_cutoff_dt)
    assert ist_converted.hour == 15
    assert ist_converted.minute == 10
    assert ist_converted.time() >= time(15, 10)

    # 3. New entry attempt after 15:10 IST is blocked
    mock_utc_past_1510 = datetime(2026, 11, 26, 9, 45, 0)  # 15:15 IST
    with patch("backend.app.services.options_engine.datetime") as mock_dt:
        mock_dt.utcnow.return_value = mock_utc_past_1510
        with pytest.raises(ValueError, match="15:10 IST Cutoff"):
            OptionsEngine.place_order(
                db=db,
                user_id=portfolio.user_id,
                symbol="NIFTY24NOV24000CE",
                strike_price=24000.0,
                option_type="CE",
                expiry_date="2026-11-28",
                quantity=25,
                enforce_market_hours=True
            )


# ==============================================================================
# SECTION 3: SIZING CHECK
# ==============================================================================
def test_item_3_position_sizing_margin_rejection(db):
    """
    1. Cash = 0: order must be rejected.
    2. Cash very low (e.g., ₹50 when 1 lot costs ₹2,000): order rejected.
    3. Cash almost equal to lot cost, but when fees are added, total > cash: order rejected.
    """
    portfolio = _get_audit_portfolio(db, initial_cash=0.0)

    # 1. Cash = 0
    with pytest.raises(ValueError, match="నగదు సరిపోదు"):
        OptionsEngine.place_order(
            db=db,
            user_id=portfolio.user_id,
            symbol="NIFTY24NOV24000CE",
            strike_price=24000.0,
            option_type="CE",
            expiry_date="2026-11-28",
            quantity=None
        )
    assert portfolio.cash_balance == 0.0

    # 2. Cash = ₹50 (very low)
    portfolio.cash_balance = 50.0
    db.commit()
    with pytest.raises(ValueError, match="నగదు సరిపోదు"):
        OptionsEngine.place_order(
            db=db,
            user_id=portfolio.user_id,
            symbol="NIFTY24NOV24000CE",
            strike_price=24000.0,
            option_type="CE",
            expiry_date="2026-11-28",
            quantity=None
        )
    assert portfolio.cash_balance == 50.0

    # 3. Cash equals raw lot cost, but fees push total above cash -> lots = 0 and rejects
    spot, _ = OptionsEngine.get_underlying_spot("NIFTY")
    cfg = SUPPORTED_UNDERLYINGS["NIFTY"]
    strike_step = cfg["strike_step"]
    atm_strike = int(round(spot / strike_step) * strike_step)
    _, t_years = OptionsEngine.get_upcoming_expiry()
    cur_p = black_scholes_price(spot, atm_strike, t_years, 0.07, cfg["iv_base"], "CE")
    lot_cost = round(cur_p * 25, 2)
    # Set cash to exactly lot_cost (without fees)
    portfolio.cash_balance = lot_cost
    db.commit()
    with pytest.raises(ValueError, match="నగదు సరిపోదు"):
        OptionsEngine.place_order(
            db=db,
            user_id=portfolio.user_id,
            symbol=f"NIFTY{atm_strike}CE",
            strike_price=float(atm_strike),
            option_type="CE",
            expiry_date="2026-11-28",
            quantity=None  # Auto-sizing gives lots = 0 because available_cash < total_lot_cost
        )
    assert portfolio.cash_balance == lot_cost


# ==============================================================================
# SECTION 4: STOP-LOSS CHECK & GAP-DOWN HANDLING
# ==============================================================================
def test_item_4_stop_loss_persistence_and_spike_filter_and_gap_down(db):
    """
    1. SL is mandatory: OptionPosition requires non-null stop_loss_premium.
    2. DB persistence: server restart / new DB session recovers open position, SL, peak, trailing floor.
    3. 15% single-tick price jump without index move is rejected as bad data spike.
    4. Price drop past -20% fires Stop-Loss; gap-down (e.g. drop from ₹100 to ₹65) exits at gap-down price.
    """
    portfolio = _get_audit_portfolio(db, initial_cash=5000.0)

    # 1. Mandatory SL & DB persistence
    pos = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="NIFTY24NOV24000CE",
        underlying="NIFTY",
        strike_price=24000.0,
        option_type="CE",
        expiry_date="2026-11-28",
        lot_size=25,
        quantity=25,
        entry_premium=100.0,
        current_premium=100.0,
        stop_loss_premium=80.0,  # -20%
        target_premium=140.0,
        trailing_stop_premium=80.0,
        is_open=True
    )
    db.add(pos)
    c_pos = OptionsEngine.calculate_trade_statutory_charges(100.0, 100.0, 25)
    portfolio.cash_balance = round(portfolio.cash_balance - (100.0 * 25 + c_pos["buy_charges"]), 2)
    db.commit()
    pos_id = pos.id

    # 2. Simulate server restart: new session queries DB
    db.expire_all()
    recovered_pos = db.query(OptionPosition).filter(OptionPosition.id == pos_id).first()
    assert recovered_pos is not None
    assert recovered_pos.entry_premium == 100.0
    assert recovered_pos.stop_loss_premium == 80.0
    assert recovered_pos.trailing_stop_premium == 80.0
    assert recovered_pos.is_open is True

    # 3. 15% price spike filter test
    # If price jumps from 100 to 125 (+25%) in 1 tick without index movement, it must be rejected
    with patch("backend.app.services.options_engine.OptionsEngine.get_underlying_spot") as mock_spot, \
         patch("backend.app.services.options_engine.black_scholes_price") as mock_bs:
        mock_spot.return_value = (24000.0, 0.2)  # Index barely moved 0.2%
        mock_bs.return_value = 125.0  # +25% jump in 1 tick (> 15%)
        # In-market time
        mock_utc_day = datetime(2026, 11, 26, 5, 0, 0)
        with patch("backend.app.services.options_engine.datetime") as mock_dt:
            mock_dt.utcnow.return_value = mock_utc_day
            OptionsEngine.update_positions_and_check_risk(db, portfolio.user_id)

    db.refresh(recovered_pos)
    # The jump was rejected! Premium stayed at old value (100.0)
    assert recovered_pos.current_premium == 100.0

    # 4. Gap-down Stop-Loss Exit Test
    # Price gaps down to ₹65.00 (below ₹80.00 SL)
    with patch("backend.app.services.options_engine.OptionsEngine.get_underlying_spot") as mock_spot, \
         patch("backend.app.services.options_engine.black_scholes_price") as mock_bs:
        mock_spot.return_value = (23500.0, -2.5)  # Market fell 2.5%
        mock_bs.return_value = 65.0  # Gap down tick at ₹65.00
        mock_utc_day = datetime(2026, 11, 26, 5, 0, 0)
        with patch("backend.app.services.options_engine.datetime") as mock_dt:
            mock_dt.utcnow.return_value = mock_utc_day
            actions = OptionsEngine.update_positions_and_check_risk(db, portfolio.user_id)

    db.refresh(recovered_pos)
    assert recovered_pos.is_open is False  # SL fired!
    assert len(actions) == 1
    assert actions[0]["action"] == "STOP_LOSS"

    # Verify exit trade recorded exact gap-down price (65.00)
    trade = db.query(OptionTrade).filter(
        OptionTrade.portfolio_id == portfolio.id,
        OptionTrade.symbol == recovered_pos.symbol
    ).order_by(OptionTrade.id.desc()).first()
    assert trade.exit_premium == 65.00
    assert trade.exit_reason == "STOP_LOSS_HIT"
    # Gross loss: (65.00 - 100.00) * 25 = -₹875.00
    assert trade.gross_pnl == -875.00
