"""AutoPilot Autonomous Bot Control & Status API Router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from backend.app.services.auto_trader import autopilot_runner
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user

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
