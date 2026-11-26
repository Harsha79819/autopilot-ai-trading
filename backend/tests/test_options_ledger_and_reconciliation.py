"""
Automated Unit and Integration Tests for:
1. Options Ledger Granular Accounting (Brokerage, STT, GST, Exchange charges, Stamp duty, SEBI charges).
2. Zero Cash Discrepancy Reconciliation (cash == 5000 + sum(net_pnl) - open_cost).
3. Position Sizing Margin Enforcement (Zero margin rejects trade without order creation or negative balance).
4. 15:10 IST Startup Catch-up & Watchdog Square-Off.
"""
import pytest
from datetime import datetime
from unittest.mock import patch

from backend.app.models.user import User
from backend.app.models.options_models import OptionsPortfolio, OptionPosition, OptionTrade
from backend.app.services.options_engine import OptionsEngine
from backend.app.services.daily_scheduler_service import DailySchedulerService


def _get_or_create_test_portfolio(db, initial_cash=5000.0) -> OptionsPortfolio:
    user = db.query(User).filter(User.email == "test_audit@autopilot.ai").first()
    if not user:
        user = User(
            email="test_audit@autopilot.ai",
            hashed_password="hash",
            full_name="Test Trader",
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
        portfolio.realized_pnl = 0.0
        portfolio.total_fees = 0.0
        db.query(OptionPosition).filter(OptionPosition.portfolio_id == portfolio.id).delete()
        db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).delete()
        db.commit()
        db.refresh(portfolio)
    return portfolio


def test_statutory_charges_calculation_split():
    """Verify statutory charges are accurately calculated and separated for BUY and SELL legs."""
    buy_premium = 16.74
    sell_premium = 29.56
    quantity = 250

    charges = OptionsEngine.calculate_trade_statutory_charges(
        buy_premium=buy_premium,
        sell_premium=sell_premium,
        quantity=quantity
    )

    assert charges["brokerage"] == 40.0
    assert charges["buy_charges"] > 0
    assert charges["sell_charges"] > 0
    assert charges["total_charges"] == round(charges["buy_charges"] + charges["sell_charges"], 2)
    # STT only on sell leg (0.1% on turnover)
    assert charges["stt"] == round(0.001 * sell_premium * quantity, 2)
    # Stamp duty only on buy leg (0.003% on turnover)
    assert charges["stamp_duty"] == round(0.00003 * buy_premium * quantity, 2)
    assert charges["gross_pnl"] > charges["net_pnl_after_charges"]


def test_options_historical_replay_and_exact_reconciliation(db):
    """
    Simulate the 3 option trades (RELIANCE PE, RELIANCE CE, HDFCBANK CE),
    verifying cash credits/debits, granular fee persistence, and zero discrepancy (diff == 0.00).
    """
    portfolio = _get_or_create_test_portfolio(db, initial_cash=5000.0)

    # Trade 1: RELIANCE 1380 PE (250 qty, Entry: 16.74, Exit: 29.56)
    pos1 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="RELIANCE24NOV1380PE",
        underlying="RELIANCE",
        strike_price=1380.0,
        option_type="PE",
        strategy_type="NAKED",
        expiry_date="2026-11-28",
        lot_size=250,
        quantity=250,
        entry_premium=16.74,
        current_premium=16.74,
        stop_loss_premium=13.39,
        target_premium=23.44,
        trailing_stop_premium=13.39,
        trailing_activated=False,
        is_open=True
    )
    db.add(pos1)
    db.commit()

    # Manual Buy Debit (matches place_order)
    charges1_est = OptionsEngine.calculate_trade_statutory_charges(16.74, 16.74, 250)
    buy_turnover1 = 16.74 * 250
    portfolio.cash_balance -= (buy_turnover1 + charges1_est["buy_charges"])
    portfolio.total_fees += charges1_est["buy_charges"]
    db.commit()

    # Square off at 29.56
    res1 = OptionsEngine.square_off_position(db, pos1.id, exit_reason="TARGET_HIT", force_exit_premium=29.56)
    assert res1["status"] == "SUCCESS"
    assert res1["realized_pnl"] > 3000.0  # Profitable trade

    trade1 = db.query(OptionTrade).filter(OptionTrade.portfolio_id == portfolio.id).order_by(OptionTrade.id.desc()).first()
    assert trade1.brokerage == 40.0
    assert trade1.stt > 0
    assert trade1.gross_pnl > trade1.net_pnl  # Gross is strictly greater than net

    # Reconcile after Trade 1
    recon1 = OptionsEngine.reconcile_portfolio_ledger(db, portfolio)
    assert recon1["is_reconciled"] is True
    assert recon1["discrepancy"] == 0.0

    # Trade 2: RELIANCE 1420 CE (250 qty, Entry: 14.50, Exit: 23.94)
    pos2 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="RELIANCE24NOV1420CE",
        underlying="RELIANCE",
        strike_price=1420.0,
        option_type="CE",
        strategy_type="NAKED",
        expiry_date="2026-11-28",
        lot_size=250,
        quantity=250,
        entry_premium=14.50,
        current_premium=14.50,
        stop_loss_premium=11.60,
        target_premium=20.30,
        trailing_stop_premium=11.60,
        trailing_activated=False,
        is_open=True
    )
    db.add(pos2)
    db.commit()

    charges2_est = OptionsEngine.calculate_trade_statutory_charges(14.50, 14.50, 250)
    buy_turnover2 = 14.50 * 250
    portfolio.cash_balance -= (buy_turnover2 + charges2_est["buy_charges"])
    portfolio.total_fees += charges2_est["buy_charges"]
    db.commit()

    res2 = OptionsEngine.square_off_position(db, pos2.id, exit_reason="TARGET_HIT", force_exit_premium=23.94)
    assert res2["status"] == "SUCCESS"

    recon2 = OptionsEngine.reconcile_portfolio_ledger(db, portfolio)
    assert recon2["is_reconciled"] is True
    assert recon2["discrepancy"] == 0.0

    # Trade 3: HDFCBANK 860 CE (550 qty, Entry: 7.15, Exit: 5.60)
    pos3 = OptionPosition(
        portfolio_id=portfolio.id,
        symbol="HDFCBANK24NOV860CE",
        underlying="HDFCBANK",
        strike_price=860.0,
        option_type="CE",
        strategy_type="NAKED",
        expiry_date="2026-11-28",
        lot_size=550,
        quantity=550,
        entry_premium=7.15,
        current_premium=7.15,
        stop_loss_premium=5.72,
        target_premium=10.01,
        trailing_stop_premium=5.72,
        trailing_activated=False,
        is_open=True
    )
    db.add(pos3)
    db.commit()

    charges3_est = OptionsEngine.calculate_trade_statutory_charges(7.15, 7.15, 550)
    buy_turnover3 = 7.15 * 550
    portfolio.cash_balance -= (buy_turnover3 + charges3_est["buy_charges"])
    portfolio.total_fees += charges3_est["buy_charges"]
    db.commit()

    res3 = OptionsEngine.square_off_position(db, pos3.id, exit_reason="STOP_LOSS_HIT", force_exit_premium=5.60)
    assert res3["status"] == "SUCCESS"
    assert res3["realized_pnl"] < 0  # Stop loss loss

    # Final Reconciliation check across all 3 trades
    recon3 = OptionsEngine.reconcile_portfolio_ledger(db, portfolio)
    assert recon3["is_reconciled"] is True
    assert recon3["discrepancy"] == 0.0
    assert recon3["total_trades"] == 3


def test_position_sizing_insufficient_margin_rejection(db):
    """
    Verify that when portfolio cash is insufficient, place_order
    raises ValueError (నగదు సరిపోదు) and creates 0 orders/positions (never forcing 1 lot).
    """
    portfolio = _get_or_create_test_portfolio(db, initial_cash=100.0)  # Only ₹100 cash

    # Attempt to buy NIFTY option lot costing ~₹2,000 (premium ₹80 * 25 qty)
    with pytest.raises(ValueError, match="నగదు సరిపోదు"):
        OptionsEngine.place_order(
            db=db,
            user_id=portfolio.user_id,
            symbol="NIFTY24NOV24000CE",
            strike_price=24000.0,
            option_type="CE",
            expiry_date="2026-11-28",
            quantity=None  # Auto-sizing
        )

    # Cash balance must remain exactly ₹100.0 without any negative drop
    db.refresh(portfolio)
    assert portfolio.cash_balance == 100.0

    # No open position should exist
    open_count = db.query(OptionPosition).filter(
        OptionPosition.portfolio_id == portfolio.id,
        OptionPosition.is_open == True
    ).count()
    assert open_count == 0


def test_startup_catchup_forces_square_off(db):
    """
    Verify that startup_catchup automatically squares off open positions
    if server awakens past 15:10 IST.
    """
    portfolio = _get_or_create_test_portfolio(db, initial_cash=5000.0)

    # Create lingering open position
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
        stop_loss_premium=80.0,
        target_premium=140.0,
        trailing_stop_premium=80.0,
        is_open=True
    )
    db.add(pos)
    db.commit()

    # Mock time at 15:25 IST on a weekday
    mock_utc_time = datetime(2026, 11, 26, 9, 55, 0)  # 15:25 IST (UTC + 5:30)
    with patch("backend.app.services.options_engine.datetime") as mock_dt:
        mock_dt.utcnow.return_value = mock_utc_time
        OptionsEngine.startup_catchup(db)

    # Position must now be closed
    db.refresh(pos)
    assert pos.is_open is False


def test_scheduler_eod_square_off_and_watchdog_dispatch(db):
    """
    Verify that DailySchedulerService dispatches EOD_SQUARE_OFF and EOD_WATCHDOG,
    enforcing clean portfolios and protecting capital.
    """
    portfolio = _get_or_create_test_portfolio(db, initial_cash=5000.0)

    # Dispatch EOD_SQUARE_OFF with force=True
    res_sq = DailySchedulerService.dispatch_slot("EOD_SQUARE_OFF", db=db, force=True)
    assert res_sq["success"] is True

    # Dispatch EOD_WATCHDOG with force=True
    res_wd = DailySchedulerService.dispatch_slot("EOD_WATCHDOG", db=db, force=True)
    assert res_wd["success"] is True
