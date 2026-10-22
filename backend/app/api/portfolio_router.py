"""Portfolio and Ledger API Router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.trade import Trade
from backend.app.models.order import Order
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.portfolio import (
    PortfolioResponse,
    PositionResponse,
    TradeResponse,
    PortfolioResetRequest,
    DepositRequest,
    FeeBreakdown
)
from backend.app.auth.dependencies import get_current_user
from backend.app.paper_engine.ledger import portfolio_ledger
from backend.app.paper_engine.fee_calculator import fee_calculator
from backend.app.market_data import demo_provider
from backend.app.scanner.universe import UNIVERSE_SYMBOLS
from backend.app.services.auto_trader import autopilot_runner
from backend.app.config import settings

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])


@router.get("", response_model=PortfolioResponse)
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")

    # Get latest quotes for real-time unrealized P&L
    quotes = demo_provider.get_quotes(UNIVERSE_SYMBOLS)
    latest_prices = {sym: q.current_price for sym, q in quotes.items()}

    metrics = portfolio_ledger.calculate_metrics(db, portfolio, latest_prices)

    # Format positions
    positions_db = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    position_responses = []
    for pos in positions_db:
        cur_price = latest_prices.get(pos.symbol, pos.current_price)
        cur_val = round(pos.quantity * cur_price, 2)
        cost_basis = round(pos.quantity * pos.average_buy_price, 2)
        gross_pnl = round(cur_val - cost_basis, 2)

        # Estimate exit statutory fees
        exit_fees = fee_calculator.calculate_fees(pos.symbol, "SELL", pos.quantity, cur_price, is_intraday=True)
        estimated_exit_costs = round(exit_fees.total_charges, 2)
        net_pos_pnl = round(gross_pnl - estimated_exit_costs, 2)
        unrealized_pct = round((gross_pnl / cost_basis) * 100.0, 2) if cost_basis > 0 else 0.0

        position_responses.append(PositionResponse(
            id=pos.id,
            symbol=pos.symbol,
            quantity=pos.quantity,
            average_buy_price=pos.average_buy_price,
            current_price=cur_price,
            current_value=cur_val,
            unrealized_pnl=gross_pnl,
            unrealized_pnl_pct=unrealized_pct,
            gross_pnl=gross_pnl,
            estimated_exit_costs=estimated_exit_costs,
            net_pnl=net_pos_pnl,
            updated_at=pos.updated_at
        ))

    # Format recent trades
    trades_db = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).order_by(Trade.executed_at.desc()).limit(20).all()
    trade_responses = [
        TradeResponse(
            id=t.id,
            order_id=t.order_id,
            symbol=t.symbol,
            side=t.side,
            quantity=t.quantity,
            execution_price=t.execution_price,
            gross_amount=t.gross_amount,
            fees=FeeBreakdown(
                brokerage=t.brokerage,
                stt=t.stt,
                exchange_charges=t.exchange_charges,
                gst=t.gst,
                sebi_charges=t.sebi_charges,
                stamp_duty=t.stamp_duty,
                dp_charges=t.dp_charges,
                slippage_amount=t.slippage_amount,
                spread_amount=t.spread_amount,
                total_charges=t.total_charges
            ),
            net_amount=t.net_amount,
            realized_pnl=t.realized_pnl,
            executed_at=t.executed_at
        )
        for t in trades_db
    ]

    return PortfolioResponse(
        id=portfolio.id,
        user_id=current_user.id,
        initial_cash=portfolio.initial_cash,
        cash_balance=round(portfolio.cash_balance, 2),
        holdings_value=metrics.holdings_value,
        total_portfolio_value=metrics.total_portfolio_value,
        realized_pnl=metrics.realized_pnl,
        unrealized_pnl=metrics.unrealized_pnl,
        total_fees_paid=metrics.total_fees_paid,
        net_pnl=metrics.net_pnl,
        net_return_pct=metrics.net_return_pct,
        max_drawdown_pct=metrics.max_drawdown_pct,
        win_rate_pct=metrics.win_rate_pct,
        is_kill_switched=portfolio.is_kill_switched,
        is_paper_trading=True,
        positions=position_responses,
        recent_trades=trade_responses,
        metrics=metrics,
        updated_at=portfolio.updated_at
    )


@router.post("/reset", response_model=PortfolioResponse)
def reset_portfolio(
    reset_req: PortfolioResetRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")

    target_capital = reset_req.capital if (reset_req and reset_req.capital) else settings.INITIAL_VIRTUAL_CAPITAL_INR

    # Clear existing open positions, trades, and orders
    db.query(Position).filter(Position.portfolio_id == portfolio.id).delete()
    db.query(Trade).filter(Trade.portfolio_id == portfolio.id).delete()
    db.query(Order).filter(Order.portfolio_id == portfolio.id).delete()
    autopilot_runner.reset_state()
    # Reset cash and metrics
    portfolio.initial_cash = target_capital
    portfolio.cash_balance = target_capital
    portfolio.realized_pnl = 0.0
    portfolio.total_fees_paid = 0.0
    portfolio.peak_portfolio_value = target_capital
    portfolio.is_kill_switched = False

    db.add(AuditLog(
        user_id=current_user.id,
        event_type="SYSTEM",
        symbol=None,
        decision="EXECUTED",
        reason=f"Virtual paper portfolio reset to INR {target_capital:.2f}",
        timestamp=portfolio.updated_at
    ))

    db.commit()
    return get_portfolio(current_user=current_user, db=db)


@router.post("/deposit", response_model=PortfolioResponse)
def deposit_virtual_funds(
    dep_req: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")

    amount = round(dep_req.amount, 2)
    portfolio.cash_balance = round(portfolio.cash_balance + amount, 2)
    portfolio.initial_cash = round(portfolio.initial_cash + amount, 2)
    portfolio.peak_portfolio_value = max(portfolio.peak_portfolio_value, portfolio.cash_balance)

    db.add(AuditLog(
        user_id=current_user.id,
        event_type="SIMULATED_DEPOSIT",
        symbol=None,
        decision="EXECUTED",
        reason=f"Added virtual capital: +INR {amount:.2f} ({dep_req.note}). Paper funds are virtual and non-withdrawable.",
        timestamp=portfolio.updated_at
    ))

    db.commit()
    return get_portfolio(current_user=current_user, db=db)
