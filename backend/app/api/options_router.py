"""Options Trading Desk API Router."""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.options_models import OptionsPortfolio, OptionPosition, OptionTrade
from backend.app.schemas.options_schemas import (
    OptionChainResponse,
    OptionOrderRequest,
    OptionPositionSchema,
    OptionTradeSchema,
    OptionsPortfolioResponse,
    OptionsComparisonResponse,
    AISignalResponse,
    UnderlyingInfoSchema,
    PCRMaxPainResponse,
    SpreadOrderRequest,
    WhatsAppConfigSchema,
    WhatsAppTestRequest,
    BrokerConfigSchema,
    ChallengeResponse,
    TradeReplayResponse,
    TransferFundsSchema,
    TransferFundsResponse,
    VaultPinUpdateSchema
)
from backend.app.auth.dependencies import get_current_user
from backend.app.services.options_engine import OptionsEngine, LOT_SIZE
from backend.app.services.whatsapp_service import WhatsAppAlertService

router = APIRouter(prefix="/api/options", tags=["Options Desk"])


@router.get("/underlyings", response_model=List[UnderlyingInfoSchema])
def get_supported_underlyings():
    """Get list of all supported indices and stocks available for options trading."""
    return OptionsEngine.get_supported_underlyings()


@router.get("/chain", response_model=OptionChainResponse)
def get_option_chain(underlying: str = Query("NIFTY", description="Underlying symbol (e.g. NIFTY, BANKNIFTY, RELIANCE, INFY)")):
    """Get live simulated option chain with Greeks (Delta, Theta, IV) for any selected stock or index."""
    return OptionsEngine.get_option_chain(underlying=underlying)


@router.get("/signal", response_model=AISignalResponse)
def get_ai_signal(underlying: str = Query("NIFTY", description="Underlying symbol")):
    """Get AI directional recommendation for any stock or index option."""
    return OptionsEngine.evaluate_ai_signal(underlying=underlying)


@router.get("/portfolio", response_model=OptionsPortfolioResponse)
def get_options_portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get options desk portfolio, open positions, realized trades, and win rate.
    Runs continuous risk guardian first to evaluate SL/TP/Trailing.
    """
    portfolio = OptionsEngine.get_or_create_portfolio(db, current_user.id)

    # 1. Evaluate risk guardian (SL, TP, trailing SL, 15:10 IST square-off)
    OptionsEngine.update_positions_and_check_risk(db, current_user.id)

    # 2. Re-fetch open positions
    open_positions = db.query(OptionPosition).filter(
        OptionPosition.portfolio_id == portfolio.id,
        OptionPosition.is_open == True
    ).all()

    pos_schemas: List[OptionPositionSchema] = []
    total_unrealized_pnl = 0.0
    total_invested_margin = 0.0

    for pos in open_positions:
        cur_premium = pos.current_premium
        margin_inv = pos.entry_premium * pos.quantity
        pos_pnl = (cur_premium - pos.entry_premium) * pos.quantity
        pos_pnl_pct = ((cur_premium - pos.entry_premium) / pos.entry_premium) * 100.0 if pos.entry_premium > 0 else 0.0

        total_unrealized_pnl += pos_pnl
        total_invested_margin += margin_inv

        pos_schemas.append(OptionPositionSchema(
            id=pos.id,
            symbol=pos.symbol,
            underlying=pos.underlying,
            strike_price=pos.strike_price,
            option_type=pos.option_type,
            strategy_type=getattr(pos, "strategy_type", "NAKED") or "NAKED",
            paired_strike=getattr(pos, "paired_strike", None),
            net_debit=getattr(pos, "net_debit", None),
            expiry_date=pos.expiry_date,
            lot_size=pos.lot_size,
            quantity=pos.quantity,
            entry_premium=round(pos.entry_premium, 2),
            current_premium=round(cur_premium, 2),
            stop_loss_premium=round(pos.stop_loss_premium, 2),
            target_premium=round(pos.target_premium, 2),
            trailing_stop_premium=round(pos.trailing_stop_premium, 2),
            trailing_activated=pos.trailing_activated,
            is_open=pos.is_open,
            unrealized_pnl=round(pos_pnl, 2),
            unrealized_pnl_pct=round(pos_pnl_pct, 2),
            invested_margin=round(margin_inv, 2),
            created_at=pos.created_at
        ))

    # 4. Fetch closed trades
    trades = db.query(OptionTrade).filter(
        OptionTrade.portfolio_id == portfolio.id
    ).order_by(OptionTrade.exit_time.desc()).all()

    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t.realized_pnl > 0)
    losing_trades = sum(1 for t in trades if t.realized_pnl < 0)
    win_rate = round((winning_trades / total_trades * 100.0), 1) if total_trades > 0 else 0.0

    trade_schemas = [
        OptionTradeSchema(
            id=t.id,
            symbol=t.symbol,
            underlying=t.underlying,
            strike_price=t.strike_price,
            option_type=t.option_type,
            expiry_date=t.expiry_date,
            lot_size=t.lot_size,
            quantity=t.quantity,
            entry_premium=round(t.entry_premium, 2),
            exit_premium=round(t.exit_premium, 2),
            realized_pnl=round(t.realized_pnl, 2),
            return_pct=round(t.return_pct, 2),
            fees=round(t.fees, 2),
            entry_time=t.entry_time,
            exit_time=t.exit_time,
            exit_reason=t.exit_reason,
            trade_notes=t.trade_notes
        ) for t in trades
    ]

    total_portfolio_value = round(portfolio.cash_balance + total_invested_margin + total_unrealized_pnl, 2)

    return OptionsPortfolioResponse(
        initial_capital=round(portfolio.initial_capital, 2),
        cash_balance=round(portfolio.cash_balance, 2),
        realized_pnl=round(portfolio.realized_pnl, 2),
        total_fees=round(portfolio.total_fees, 2),
        peak_equity=round(portfolio.peak_equity, 2),
        current_equity=round(portfolio.cash_balance + total_invested_margin, 2),
        unrealized_pnl=round(total_unrealized_pnl, 2),
        total_portfolio_value=total_portfolio_value,
        is_autopilot_enabled=getattr(portfolio, "is_autopilot_enabled", True),
        whatsapp_phone=getattr(portfolio, "whatsapp_phone", "") or "",
        whatsapp_alerts_enabled=bool(getattr(portfolio, "whatsapp_alerts_enabled", True)),
        broker_name=getattr(portfolio, "broker_name", "PAPER") or "PAPER",
        broker_client_code=getattr(portfolio, "broker_client_code", "") or "",
        is_live_broker_routing=bool(getattr(portfolio, "is_live_broker_routing", False)),
        open_positions=pos_schemas,
        recent_trades=trade_schemas,
        win_rate_pct=win_rate,
        total_trades=total_trades,
        winning_trades=winning_trades,
        losing_trades=losing_trades
    )


@router.post("/order")
def place_option_order(
    order_in: OptionOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute option BUY order (₹4.8k max margin, -20% SL, +40% TP1).
    """
    try:
        res = OptionsEngine.place_order(
            db=db,
            user_id=current_user.id,
            symbol=order_in.symbol,
            strike_price=order_in.strike_price,
            option_type=order_in.option_type,
            expiry_date=order_in.expiry_date,
            quantity=order_in.quantity,
            underlying=order_in.underlying
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/square-off/{position_id}")
def square_off_position(
    position_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Square off active option position manually."""
    try:
        res = OptionsEngine.square_off_position(
            db=db,
            position_id=position_id,
            exit_reason="MANUAL_EXIT"
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/autopilot/toggle")
def toggle_autopilot(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle autonomous options auto-pilot ON / OFF."""
    portfolio = OptionsEngine.get_or_create_portfolio(db, current_user.id)
    portfolio.is_autopilot_enabled = not portfolio.is_autopilot_enabled
    db.commit()
    db.refresh(portfolio)
    return {
        "status": "SUCCESS",
        "is_autopilot_enabled": portfolio.is_autopilot_enabled,
        "message": f"Options AutoPilot is now {'ENABLED' if portfolio.is_autopilot_enabled else 'DISABLED'}."
    }


@router.get("/comparison", response_model=OptionsComparisonResponse)
def get_comparison(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get side-by-side performance analytics between Equity and Options."""
    return OptionsEngine.get_comparison_metrics(db, current_user.id)


# -------------------------------------------------------------
# 1. Real-Time PCR (Put-Call Ratio) & Institutional Max Pain
# -------------------------------------------------------------
@router.get("/pcr-maxpain", response_model=PCRMaxPainResponse)
def get_pcr_max_pain(
    underlying: str = Query("NIFTY", description="Underlying symbol (e.g. NIFTY, BANKNIFTY, RELIANCE, INFY)")
):
    """
    Get live Put-Call Ratio (PCR) and Institutional Max Pain strike analysis.
    Identifies institutional floor and ceiling levels.
    """
    return OptionsEngine.calculate_pcr_and_max_pain(underlying=underlying)


# -------------------------------------------------------------
# 2. 1-Click Hedged Spreads
# -------------------------------------------------------------
@router.post("/spread/order")
def execute_spread_order(
    spread_in: SpreadOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Execute 1-Click Hedged Spread (Bull Call Spread or Bear Put Spread).
    Cuts risk & margin in half and immunizes against overnight theta decay.
    """
    try:
        res = OptionsEngine.execute_hedged_spread(
            db=db,
            user_id=current_user.id,
            underlying=spread_in.underlying,
            spread_type=spread_in.spread_type,
            quantity=spread_in.quantity
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# -------------------------------------------------------------
# 3. 30-Day ₹5k Capital Compounding Challenge
# -------------------------------------------------------------
@router.get("/challenge", response_model=ChallengeResponse)
def get_challenge_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get 30-Day ₹5,000 Capital Compounding Challenge status, stage milestones, and risk badges.
    """
    return OptionsEngine.get_challenge_progress(db=db, user_id=current_user.id)


# -------------------------------------------------------------
# 4. Tick-by-Tick Trade Replay & Simulator
# -------------------------------------------------------------
@router.get("/trade-replay/{trade_id}", response_model=TradeReplayResponse)
def get_trade_replay(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get tick-by-tick trajectory and post-mortem review for any executed option trade.
    """
    try:
        return OptionsEngine.get_trade_replay(db=db, trade_id=trade_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# -------------------------------------------------------------
# 5. WhatsApp Real-Time Notification Engine
# -------------------------------------------------------------
@router.get("/whatsapp/config")
def get_whatsapp_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's configured WhatsApp phone number and alert preferences."""
    return OptionsEngine.get_whatsapp_config(db=db, user_id=current_user.id)


@router.post("/whatsapp/configure")
def configure_whatsapp(
    config_in: WhatsAppConfigSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save WhatsApp alert phone number and toggle notifications."""
    return OptionsEngine.configure_whatsapp(
        db=db,
        user_id=current_user.id,
        phone=config_in.phone,
        alerts_enabled=config_in.alerts_enabled,
        phone_number_id=config_in.phone_number_id,
        access_token=config_in.access_token,
        api_key=config_in.api_key
    )


@router.post("/whatsapp/test")
def test_whatsapp_alert(
    test_in: WhatsAppTestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send test alert to verify WhatsApp integration and return 1-click dispatch link."""
    time_str = WhatsAppAlertService.get_ist_time_str()
    sample_msg = test_in.custom_message or (
        "👩‍💼 *నమస్కారం హర్ష గారు! నేను మీ అను ని...* 🌸\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "⚡ *వాట్సాప్ అలర్ట్స్ కనెక్ట్ అయ్యాయి!* 🟢\n\n"
        "✅ మీ మొబైల్ నంబర్‌కు లైవ్ ట్రేడింగ్ అలర్ట్స్ మరియు వాయిస్ నోట్స్ సక్సెస్‌ఫుల్‌గా సెట్ చేయబడ్డాయి.\n\n"
        "🔔 *మీకు వచ్చే ముఖ్యమైన అలర్ట్స్:*\n"
        "• 🟢 కొత్త ఆప్షన్ కొనుగోలు (Option Buy Orders)\n"
        "• 🎯 లాభం బుకింగ్ (+40% Profit Target)\n"
        "• 🛑 స్టాప్‌లాస్ రక్షణ (-20% Capital Shield)\n"
        "• 🟡 ట్రైలింగ్ స్టాప్‌లాస్ లాభం లాకింగ్\n"
        "• ⚡ మధ్యాహ్నం 15:10 IST ఆటో స్క్వేర్-ఆఫ్\n"
        "• 🌅 ఉదయం & సాయంత్రం డైలీ బ్రీఫింగ్స్\n"
        f"⏰ సమయం: {time_str}\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "🛡️ _AutoPilot AI • మీ క్యాపిటల్ రక్షణే ప్రథమ ప్రాధాన్యం!_\n"
        "🎧 _అను వాయిస్ ఆడియో కింద ప్లే చేసి వినవచ్చు._"
    )
    res = WhatsAppAlertService.dispatch_alert(
        db=db,
        user_id=current_user.id,
        phone=test_in.phone,
        message=sample_msg,
        category="WHATSAPP_TEST"
    )
    return res


# -------------------------------------------------------------
# 6. 1-Click Real Broker Bridge Gateway
# -------------------------------------------------------------
@router.get("/broker/config")
def get_broker_bridge_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get active broker bridge configuration and supported gateway connectors."""
    return OptionsEngine.get_broker_config(db=db, user_id=current_user.id)


@router.post("/broker/configure")
def configure_broker_bridge(
    broker_in: BrokerConfigSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save broker API credentials and set Live Demat vs Paper Trading toggle."""
    try:
        return OptionsEngine.configure_broker(
            db=db,
            user_id=current_user.id,
            broker_name=broker_in.broker_name,
            api_key=broker_in.broker_api_key,
            client_code=broker_in.broker_client_code,
            is_live_broker_routing=broker_in.is_live_broker_routing
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/broker/test-connection")
def test_broker_bridge_connection(
    test_in: BrokerConfigSchema
):
    """Verify handshake ping with selected broker OMS."""
    try:
        return OptionsEngine.test_broker_connection(
            broker_name=test_in.broker_name,
            api_key=test_in.broker_api_key or "",
            client_code=test_in.broker_client_code or ""
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/transfer-funds", response_model=TransferFundsResponse)
def transfer_funds_between_desks(
    transfer_in: TransferFundsSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Transfer profits or capital between Options Desk and Main Equity Desk."""
    try:
        return OptionsEngine.transfer_funds(
            db=db,
            user_id=current_user.id,
            amount=transfer_in.amount,
            from_desk=transfer_in.from_desk,
            note=transfer_in.note or "Profit Vault Transfer"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/vault/status")
def get_vault_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns the current Capital Vault and 3-Strategy allocation status."""
    import json
    from backend.app.models.portfolio import Portfolio
    from backend.app.models.audit_log import AuditLog
    from backend.app.models.strategy_config import StrategyConfig

    opt_portfolio = OptionsEngine.get_or_create_portfolio(db, current_user.id)
    equity_portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
    equity_cash = equity_portfolio.cash_balance if equity_portfolio else 0.0

    # Calculate total profit transferred to main desk
    transfer_audits = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.event_type == "FUNDS_TRANSFER"
    ).all()
    transferred_total = 0.0
    for a in transfer_audits:
        try:
            d = json.loads(a.details_json) if a.details_json else {}
            if d.get("from_desk") == "OPTIONS":
                transferred_total += float(d.get("amount", 0.0))
        except Exception:
            pass

    # Strategy configurations (Options 2 & 3 default to SLEEP unless activated by user)
    s_spreads = db.query(StrategyConfig).filter(
        StrategyConfig.user_id == current_user.id,
        StrategyConfig.strategy_name == "dynamic_spreads"
    ).first()
    is_spreads_active = s_spreads.is_active if s_spreads else False

    s_bluechip = db.query(StrategyConfig).filter(
        StrategyConfig.user_id == current_user.id,
        StrategyConfig.strategy_name == "bluechip_swing"
    ).first()
    is_bluechip_active = s_bluechip.is_active if s_bluechip else False

    # Build recent transfers list (newest first)
    recent_transfer_audits = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id,
        AuditLog.event_type.in_(["FUNDS_TRANSFER", "FUNDS_TRANSFER_UNDO"])
    ).order_by(AuditLog.id.desc()).limit(15).all()

    recent_transfers = []
    for a in recent_transfer_audits:
        try:
            d = json.loads(a.details_json) if a.details_json else {}
            recent_transfers.append({
                "id": a.id,
                "amount": float(d.get("amount", 0.0)),
                "from_desk": d.get("from_desk", "OPTIONS"),
                "to_desk": d.get("to_desk", "EQUITY"),
                "event_type": a.event_type,
                "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M:%S") if a.timestamp else "",
                "reason": a.reason
            })
        except Exception:
            pass

    vault_locked = round(getattr(opt_portfolio, "profit_vault_locked", 0.0), 2)
    saved_pin = getattr(opt_portfolio, "vault_pin", "7981") or "7981"

    return {
        "main_equity_cash_balance": round(equity_cash, 2),
        "options_cash_balance": round(opt_portfolio.cash_balance, 2),
        "options_realized_pnl": round(opt_portfolio.realized_pnl, 2),
        "profit_vault_locked": vault_locked,
        "vault_pin_default": saved_pin,
        "recent_transfers": recent_transfers,
        "strategies": {
            "option_1_vault": {
                "name": "Option 1: Safe Profit Vault",
                "status": "ACTIVE",
                "locked_amount": vault_locked,
                "description": "Custom profit vault transfer between desks with Security PIN lock"
            },
            "option_2_dynamic_spreads": {
                "name": "Option 2: Dynamic Multi-Asset Spreads",
                "status": "ACTIVE" if is_spreads_active else "SLEEP",
                "description": "Multi-asset hedged spreads (NIFTY & BANKNIFTY)"
            },
            "option_3_bluechip_swing": {
                "name": "Option 3: Blue-Chip Swing Auto-Deploy",
                "status": "ACTIVE" if is_bluechip_active else "SLEEP",
                "description": "Bluechip equity swing accumulation"
            }
        }
    }


@router.post("/vault/transfer", response_model=TransferFundsResponse)
def transfer_profit_vault(
    transfer_in: TransferFundsSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Transfer funds using the Vault interface with Security PIN verification."""
    try:
        return OptionsEngine.transfer_funds(
            db=db,
            user_id=current_user.id,
            amount=transfer_in.amount,
            from_desk=transfer_in.from_desk or "OPTIONS",
            to_desk=transfer_in.to_desk or "VAULT",
            pin=transfer_in.pin,
            note=transfer_in.note or "Capital Vault Transfer"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/vault/undo")
def undo_last_vault_transfer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Undo the most recent vault fund transfer."""
    try:
        return OptionsEngine.undo_last_transfer(db=db, user_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/vault/pin")
def update_vault_pin(
    pin_in: VaultPinUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update 4-digit Vault Security PIN."""
    try:
        return OptionsEngine.set_vault_pin(
            db=db,
            user_id=current_user.id,
            current_pin=pin_in.current_pin,
            new_pin=pin_in.new_pin
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/vault/strategy/toggle")
def toggle_vault_strategy(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle Option 2 or Option 3 strategy between SLEEP and ACTIVE mode."""
    from backend.app.models.strategy_config import StrategyConfig
    strategy_key = payload.get("strategy_key")
    is_active = bool(payload.get("enabled", False))

    if not strategy_key:
        raise HTTPException(status_code=400, detail="Missing strategy_key")

    cfg = db.query(StrategyConfig).filter(
        StrategyConfig.user_id == current_user.id,
        StrategyConfig.strategy_name == strategy_key
    ).first()

    if not cfg:
        cfg = StrategyConfig(
            user_id=current_user.id,
            strategy_name=strategy_key,
            is_active=is_active,
            parameters_json="{}"
        )
        db.add(cfg)
    else:
        cfg.is_active = is_active

    db.commit()
    db.refresh(cfg)
    return {
        "strategy_key": strategy_key,
        "is_active": cfg.is_active,
        "status": "ACTIVE" if cfg.is_active else "SLEEP",
        "message": f"Strategy {strategy_key} status set to {'ACTIVE' if cfg.is_active else 'SLEEP'}."
    }


@router.get("/taxes")
def get_tax_and_charges_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns statutory Indian F&O taxes (STT, GST, Exchange charges, Stamp Duty, SEBI fees),
    business income tax estimation, and realistic real-world trading vs paper simulation comparison.
    """
    return OptionsEngine.get_tax_and_charges_breakdown(db=db, user_id=current_user.id)


# -------------------------------------------------------------
# 6. Automated Daily WhatsApp Schedule Management
# -------------------------------------------------------------
@router.get("/whatsapp/schedule")
def get_whatsapp_schedule_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the daily automated WhatsApp notification schedule,
    covering trading days (09:00, 15:30, 19:00) and weekend/holidays (10:00, 18:00),
    along with today's dispatch state and next trigger time.
    """
    from backend.app.services.daily_scheduler_service import DailySchedulerService
    return DailySchedulerService.get_schedule_status(db)


@router.post("/whatsapp/schedule/test-slot")
def test_whatsapp_schedule_slot(
    slot_key: str = Query(..., description="Schedule slot key (e.g. MORNING_BRIEF, MARKET_WRAP, EVENING_DIGEST, WEEKEND_MORNING, WEEKEND_EVENING)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Manually triggers an immediate test dispatch for any scheduled briefing slot,
    sending both the WhatsApp text message and the neural voice note to the user.
    """
    from backend.app.services.daily_scheduler_service import DailySchedulerService
    if slot_key not in DailySchedulerService.SLOTS_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid slot_key '{slot_key}'. Valid options: {list(DailySchedulerService.SLOTS_CONFIG.keys())}"
        )
    return DailySchedulerService.dispatch_slot(slot_key=slot_key, db=db, force=True)



