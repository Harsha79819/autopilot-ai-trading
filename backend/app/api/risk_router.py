"""Risk Management and Kill Switch API Router."""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.risk import (
    RiskStatusResponse,
    KillSwitchRequest,
    KillSwitchResponse,
    AuditLogResponse
)
from backend.app.auth.dependencies import get_current_user
from backend.app.risk import risk_manager, kill_switch_manager

router = APIRouter(prefix="/api/risk", tags=["Risk Management"])


@router.get("/status", response_model=RiskStatusResponse)
def get_risk_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    return risk_manager.get_risk_status(db=db, portfolio=portfolio)


@router.post("/kill-switch", response_model=KillSwitchResponse)
def trigger_kill_switch(
    req: KillSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")

    is_stopped = kill_switch_manager.set_emergency_stop(
        db=db,
        portfolio=portfolio,
        activate=req.activate,
        reason=req.reason
    )

    action_text = "ACTIVATED. All automated paper trading has been halted." if is_stopped else "DEACTIVATED. Normal trading operations resumed."
    return KillSwitchResponse(
        is_emergency_stopped=is_stopped,
        message=f"Emergency Kill Switch successfully {action_text}",
        timestamp=datetime.utcnow()
    )


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(
        AuditLog.user_id == current_user.id
    ).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [AuditLogResponse.model_validate(log) for log in logs]
