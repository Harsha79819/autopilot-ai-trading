"""Financial Reports & Tax Drag Analytics API Router."""
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.trade import Trade
from backend.app.models.trading_journal import TradingJournal
from backend.app.paper_engine.ledger import portfolio_ledger

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])


@router.get("/summary")
def get_report_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    metrics = portfolio_ledger.calculate_metrics(db, portfolio)
    trades = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).all()
    journals = db.query(TradingJournal).filter(TradingJournal.portfolio_id == portfolio.id).all()

    profitable_trades = [t for t in trades if t.realized_pnl > 0]
    loss_trades = [t for t in trades if t.realized_pnl < 0]

    return {
        "portfolio_overview": {
            "initial_cash_inr": round(portfolio.initial_cash, 2),
            "current_cash_inr": round(portfolio.cash_balance, 2),
            "holdings_value_inr": round(metrics.holdings_value, 2),
            "total_portfolio_value_inr": round(metrics.total_portfolio_value, 2),
            "net_pnl_inr": round(metrics.net_pnl, 2),
            "net_return_pct": round(metrics.net_return_pct, 2),
            "max_drawdown_pct": round(metrics.max_drawdown_pct, 2)
        },
        "tax_and_friction_breakdown": {
            "total_fees_paid_inr": round(metrics.total_fees_paid, 2),
            "cost_drag_pct": round((metrics.total_fees_paid / portfolio.initial_cash) * 100.0, 2) if portfolio.initial_cash > 0 else 0.0,
            "estimated_stt_inr": round(metrics.total_fees_paid * 0.40, 2),
            "estimated_exchange_charges_inr": round(metrics.total_fees_paid * 0.15, 2),
            "estimated_gst_inr": round(metrics.total_fees_paid * 0.35, 2),
            "estimated_sebi_charges_inr": round(metrics.total_fees_paid * 0.10, 2)
        },
        "trade_statistics": {
            "total_trades": len(trades),
            "win_trades_count": len(profitable_trades),
            "loss_trades_count": len(loss_trades),
            "win_rate_pct": round((len(profitable_trades) / len(trades)) * 100.0, 1) if trades else 0.0,
            "total_journal_entries": len(journals)
        }
    }


@router.get("/export-csv", response_class=PlainTextResponse)
def export_trades_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    trades = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).order_by(Trade.executed_at.asc()).all()

    csv_lines = ["TradeID,Symbol,Side,Quantity,ExecutionPrice,GrossAmount,NetAmount,RealizedPnL,ExecutedAt"]
    for t in trades:
        line = f"{t.id},{t.symbol},{t.side},{t.quantity},{t.execution_price:.2f},{t.gross_amount:.2f},{t.net_amount:.2f},{t.realized_pnl:.2f},{t.executed_at.isoformat()}"
        csv_lines.append(line)

    return "\n".join(csv_lines)


@router.get("/daily-ledger")
def get_daily_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns the complete day-to-day trading and portfolio performance ledger
    from Day 1 to present and dynamically for all future days.
    """
    from backend.app.services.daily_ledger_service import DailyLedgerService
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    ledger_entries = DailyLedgerService.get_chronological_ledger(db, portfolio)
    return {
        "portfolio_id": portfolio.id,
        "total_days": len(ledger_entries),
        "days": ledger_entries
    }


@router.get("/daily-ledger/download")
def download_daily_ledger_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates and downloads the complete Day 1 to Future daily updates spreadsheet (.csv)
    with UTF-8 BOM encoding for direct Microsoft Excel compatibility.
    """
    from fastapi.responses import Response
    from backend.app.services.daily_ledger_service import DailyLedgerService

    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    ledger_entries = DailyLedgerService.get_chronological_ledger(db, portfolio)
    csv_str = DailyLedgerService.generate_csv_string(ledger_entries)

    return Response(
        content=csv_str.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="AutoPilot_Trading_Daily_Ledger.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )

