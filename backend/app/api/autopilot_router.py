"""AutoPilot Autonomous Bot Control & Status API Router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.auto_trader import autopilot_runner
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user, oauth2_scheme

router = APIRouter(prefix="/api/autopilot", tags=["AutoPilot"])


class ToggleRequest(BaseModel):
    enabled: bool


@router.get("/status")
def get_autopilot_status():
    """Retrieve the current live state of the AI Autonomous trading bot."""
    return autopilot_runner.get_ai_status()


@router.post("/toggle")
def toggle_autopilot(req: ToggleRequest, current_user: User = Depends(get_current_user)):
    """Pause or resume the autonomous AI bot."""
    enabled = autopilot_runner.set_autopilot_enabled(req.enabled)
    return {
        "success": True,
        "autopilot_enabled": enabled,
        "status": autopilot_runner.get_ai_status()
    }


@router.post("/scan")
async def trigger_autopilot_scan(current_user: User = Depends(get_current_user)):
    """Trigger an immediate market scan and AI decision cycle."""
    await autopilot_runner.run_single_cycle()
    return {
        "success": True,
        "status": autopilot_runner.get_ai_status()
    }


@router.post("/deploy-all")
async def trigger_deploy_all(current_user: User = Depends(get_current_user)):
    """Immediately deploy remaining idle cash into top-scoring Nifty 50 stocks."""
    result = await autopilot_runner.deploy_remaining_capital(user_id=current_user.id)
    return {
        "success": True,
        "result": result,
        "status": autopilot_runner.get_ai_status()
    }


@router.get("/learning-state")
def get_learning_state(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Retrieve active AGI learning penalties, boosts, and self-correction rules."""
    user = None
    if token:
        try:
            user = get_current_user(token, db)
        except Exception:
            pass
    if not user:
        user = db.query(User).filter(User.email == "demo@autopilot.ai").first()

    user_id = user.id if user else 1
    penalties = {
        sym: score
        for (uid, sym), score in getattr(autopilot_runner, "_agi_error_penalties", {}).items()
        if uid == user_id
    }
    boosts = {
        sym: score
        for (uid, sym), score in getattr(autopilot_runner, "_agi_win_boosts", {}).items()
        if uid == user_id
    }
    return {
        "user_id": user_id,
        "active_penalties": penalties,
        "active_boosts": boosts,
        "learning_algorithm": "Reinforcement Learning via Trading Journal Post-Mortem",
        "parameters": {
            "penalty_per_loss": -6.0,
            "max_penalty_cap": -18.0,
            "boost_per_win": +4.0,
            "max_boost_cap": +12.0,
            "cooldown_period_days": 3
        },
        "status": "ACTIVE_LEARNING"
    }
