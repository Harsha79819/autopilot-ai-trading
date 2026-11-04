"""Emergency Kill Switch coordinator."""
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.portfolio import Portfolio
from backend.app.models.audit_log import AuditLog
from backend.app.config import settings


class KillSwitchManager:
    """Manages emergency stop state for the platform and individual portfolios."""

    @staticmethod
    def set_emergency_stop(db: Session, portfolio: Portfolio, activate: bool, reason: str = "") -> bool:
        portfolio.is_kill_switched = activate
        now = datetime.utcnow()
        status_str = "ACTIVATED" if activate else "DEACTIVATED"

        db.add(AuditLog(
            user_id=portfolio.user_id,
            event_type="KILL_SWITCH",
            symbol=None,
            decision=status_str,
            reason=reason or f"Emergency Kill Switch {status_str}",
            timestamp=now
        ))

        if activate and getattr(settings, "KILL_SWITCH_CLOSES_POSITIONS", False):
            from backend.app.models.position import Position
            from backend.app.models.position_risk_state import PositionRiskState
            from backend.app.schemas.order import OrderCreate
            from backend.app.paper_engine import paper_broker
            from backend.app.market_data import market_provider
            from backend.app.risk.risk_manager import risk_manager

            from backend.app.schemas.market import Quote

            positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
            for pos in positions:
                q = market_provider.get_quote(pos.symbol)
                if not q:
                    price = pos.average_buy_price
                    q = Quote(
                        symbol=pos.symbol,
                        company_name=pos.symbol,
                        current_price=price,
                        open=price,
                        high=price,
                        low=price,
                        previous_close=price,
                        change=0.0,
                        change_pct=0.0,
                        bid=price * 0.999,
                        ask=price * 1.001,
                        spread_pct=0.2,
                        volume=100000,
                        timestamp=now,
                        is_stale=False,
                    )
                else:
                    price = q.current_price
                order_in = OrderCreate(
                    symbol=pos.symbol,
                    side="SELL",
                    order_type="MARKET",
                    quantity=pos.quantity,
                    price=price
                )
                paper_broker.execute_paper_order(
                    db=db,
                    user=portfolio.user,
                    order_in=order_in,
                    quote=q,
                    risk_manager=risk_manager
                )
                db.add(AuditLog(
                    user_id=portfolio.user_id,
                    event_type="KILL_SWITCH_LIQUIDATION",
                    symbol=pos.symbol,
                    decision="EXECUTED",
                    reason=f"Liquidated {pos.symbol} due to Emergency Kill Switch (KILL_SWITCH_CLOSES_POSITIONS=True)",
                    timestamp=now
                ))
                db.query(PositionRiskState).filter(
                    PositionRiskState.user_id == portfolio.user_id,
                    PositionRiskState.symbol == pos.symbol
                ).delete()

        db.commit()
        db.refresh(portfolio)
        return portfolio.is_kill_switched

    @staticmethod
    def is_stopped(portfolio: Portfolio) -> bool:
        return bool(settings.EMERGENCY_STOP_ACTIVE or portfolio.is_kill_switched)


kill_switch_manager = KillSwitchManager()
