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
        db.commit()
        db.refresh(portfolio)
        return portfolio.is_kill_switched

    @staticmethod
    def is_stopped(portfolio: Portfolio) -> bool:
        return bool(settings.EMERGENCY_STOP_ACTIVE or portfolio.is_kill_switched)


kill_switch_manager = KillSwitchManager()
