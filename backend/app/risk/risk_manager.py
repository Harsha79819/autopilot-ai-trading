"""Server-side Risk Manager enforcing strict trade safeguards."""
from datetime import datetime, date
from typing import Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.portfolio import Portfolio
from backend.app.models.trade import Trade
from backend.app.models.position import Position
from backend.app.schemas.risk import RiskStatusResponse, RiskConfig
from backend.app.paper_engine.ledger import portfolio_ledger
from backend.app.risk.kill_switch import kill_switch_manager
from backend.app.config import settings


class RiskManager:
    """Enforces non-bypassable pre-trade and continuous risk guardrails."""

    @staticmethod
    def validate_pre_trade_risk(
        db: Session,
        portfolio: Portfolio,
        symbol: str,
        side: str,
        quantity: int,
        price: float
    ) -> Tuple[bool, str]:
        # 1. Kill switch check
        if kill_switch_manager.is_stopped(portfolio):
            return False, "Emergency Stop / Kill Switch is active."

        # 2. Portfolio metrics
        metrics = portfolio_ledger.calculate_metrics(db, portfolio)

        # 3. Maximum Portfolio Drawdown threshold
        if metrics.max_drawdown_pct >= settings.MAX_PORTFOLIO_DRAWDOWN_PCT:
            return False, (
                f"Maximum portfolio drawdown threshold exceeded: current drawdown is {metrics.max_drawdown_pct:.1f}% "
                f"(limit: {settings.MAX_PORTFOLIO_DRAWDOWN_PCT}%). Trading halted for capital protection."
            )

        # 4. Maximum Daily Loss threshold
        today_start = datetime.combine(date.today(), datetime.min.time())
        today_trades = db.query(Trade).filter(
            Trade.portfolio_id == portfolio.id,
            Trade.executed_at >= today_start,
            Trade.side == "SELL"
        ).all()

        today_realized_loss = sum(t.realized_pnl for t in today_trades if t.realized_pnl < 0)
        max_allowed_daily_loss = min(portfolio.initial_cash * (settings.MAX_DAILY_LOSS_PCT / 100.0), settings.MAX_DAILY_LOSS_INR) if portfolio.initial_cash > 0 else settings.MAX_DAILY_LOSS_INR

        if abs(today_realized_loss) >= max_allowed_daily_loss:
            return False, (
                f"Maximum daily loss threshold reached: today's loss is ₹{abs(today_realized_loss):.2f} "
                f"(limit: ₹{max_allowed_daily_loss:.2f} / ₹{settings.MAX_DAILY_LOSS_INR:.2f}). Trading halted for today."
            )

        # 5. Position Sizing
        if side.upper() == "BUY":
            proposed_value = quantity * price
            # For micro accounts (<= ₹200), whole shares require flexible sizing up to 100%
            if metrics.total_portfolio_value > 200.0:
                max_pos_value = metrics.total_portfolio_value * (settings.MAX_POSITION_SIZE_PCT / 100.0)
                if proposed_value > max_pos_value:
                    return False, (
                        f"Proposed position size ₹{proposed_value:.2f} exceeds max allowed "
                        f"allocation of ₹{max_pos_value:.2f} ({settings.MAX_POSITION_SIZE_PCT}% of portfolio)."
                    )

        return True, "Pre-trade risk verification passed."

    @staticmethod
    def get_risk_status(db: Session, portfolio: Portfolio) -> RiskStatusResponse:
        metrics = portfolio_ledger.calculate_metrics(db, portfolio)
        is_stopped = kill_switch_manager.is_stopped(portfolio)

        today_start = datetime.combine(date.today(), datetime.min.time())
        today_trades = db.query(Trade).filter(
            Trade.portfolio_id == portfolio.id,
            Trade.executed_at >= today_start,
            Trade.side == "SELL"
        ).all()
        today_realized_loss = sum(t.realized_pnl for t in today_trades if t.realized_pnl < 0)
        today_loss_pct = round((abs(today_realized_loss) / portfolio.initial_cash) * 100.0, 2) if portfolio.initial_cash > 0 else 0.0

        open_positions_count = db.query(Position).filter(Position.portfolio_id == portfolio.id).count()

        # Risk state evaluation
        if is_stopped:
            risk_state = "EMERGENCY_STOP"
        elif metrics.max_drawdown_pct >= settings.MAX_PORTFOLIO_DRAWDOWN_PCT or today_loss_pct >= settings.MAX_DAILY_LOSS_PCT:
            risk_state = "HALTED"
        elif metrics.max_drawdown_pct > (settings.MAX_PORTFOLIO_DRAWDOWN_PCT * 0.7) or today_loss_pct > (settings.MAX_DAILY_LOSS_PCT * 0.7):
            risk_state = "WARNING"
        else:
            risk_state = "HEALTHY"

        config = RiskConfig(
            max_position_size_pct=settings.MAX_POSITION_SIZE_PCT,
            max_daily_loss_pct=settings.MAX_DAILY_LOSS_PCT,
            max_portfolio_drawdown_pct=settings.MAX_PORTFOLIO_DRAWDOWN_PCT,
            stale_data_threshold_seconds=settings.STALE_DATA_THRESHOLD_SECONDS,
            cost_gate_multiplier=settings.COST_AWARE_GATE_MULTIPLIER,
            is_emergency_stopped=is_stopped
        )

        return RiskStatusResponse(
            is_emergency_stopped=is_stopped,
            current_drawdown_pct=metrics.max_drawdown_pct,
            max_drawdown_limit_pct=settings.MAX_PORTFOLIO_DRAWDOWN_PCT,
            today_realized_loss=abs(today_realized_loss),
            today_loss_pct=today_loss_pct,
            max_daily_loss_limit_pct=settings.MAX_DAILY_LOSS_PCT,
            open_positions_count=open_positions_count,
            portfolio_value=metrics.total_portfolio_value,
            audit_logs_count=len(portfolio.user.audit_logs) if portfolio.user else 0,
            risk_state=risk_state,
            config=config
        )


risk_manager = RiskManager()
