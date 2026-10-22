"""Strategy metadata and signal schemas."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class StrategyInfo(BaseModel):
    name: str
    display_name: str
    description: str
    entry_conditions: List[str]
    exit_conditions: List[str]
    assumptions: List[str]
    risk_limits: List[str]
    required_market_data: List[str]
    known_limitations: List[str]
    default_parameters: Dict[str, Any]
    is_active: bool = True


class CostGateResult(BaseModel):
    passed: bool
    multiplier_k: float
    expected_move_pct: float
    round_trip_cost_pct: float
    spread_pct: float
    slippage_pct: float
    total_friction_pct: float
    hurdle_rate_pct: float  # K * total_friction_pct
    reason: str


class StrategySignal(BaseModel):
    strategy_name: str
    symbol: str
    action: str  # "BUY", "SELL", "HOLD", "NO_TRADE"
    confidence: float
    rationale: str
    timestamp: datetime
    price: float
    suggested_quantity: int
    cost_gate: CostGateResult
    is_actionable: bool


class StrategyEvaluateRequest(BaseModel):
    symbol: str
    strategy_name: Optional[str] = None  # None evaluates all active strategies
