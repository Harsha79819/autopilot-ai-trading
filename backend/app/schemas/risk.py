from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class RiskConfig(BaseModel):
    max_position_size_pct: float = Field(100.0, ge=1.0, le=100.0)
    max_daily_loss_pct: float = Field(5.0, ge=0.5, le=50.0)
    max_portfolio_drawdown_pct: float = Field(15.0, ge=1.0, le=50.0)
    stale_data_threshold_seconds: int = Field(30, ge=5, le=300)
    cost_gate_multiplier: float = Field(3.0, ge=1.0, le=10.0)
    is_emergency_stopped: bool = False


class RiskStatusResponse(BaseModel):
    is_emergency_stopped: bool
    current_drawdown_pct: float
    max_drawdown_limit_pct: float
    today_realized_loss: float
    today_loss_pct: float
    max_daily_loss_limit_pct: float
    open_positions_count: int
    portfolio_value: float
    audit_logs_count: int
    risk_state: str  # "HEALTHY", "WARNING", "HALTED", "EMERGENCY_STOP"
    config: RiskConfig


class KillSwitchRequest(BaseModel):
    activate: bool
    reason: Optional[str] = "Manual emergency kill switch triggered by user"


class KillSwitchResponse(BaseModel):
    is_emergency_stopped: bool
    message: str
    timestamp: datetime


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    event_type: str
    symbol: Optional[str] = None
    decision: str
    reason: str
    details_json: str
    timestamp: datetime
