"""Market scanner schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class NoTradeReason(BaseModel):
    symbol: str
    stage: str  # "STAGE_1_CAPITAL", "STAGE_1_LIQUIDITY", "STAGE_2_TECHNICAL", "STAGE_2_COST_GATE", "RISK_LIMIT"
    reason: str
    details: dict = {}


class ScannerOpportunity(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    eligible_for_capital: bool  # Can we buy >= 1 whole share with available cash?
    max_affordable_shares: int  # math.floor(cash / current_price)
    spread_pct: float
    volume_24h: int
    momentum_score: float
    rsi_14: float
    trend_direction: str  # "BULLISH", "BEARISH", "NEUTRAL"
    strategy_recommendation: Optional[str] = None  # Strategy that flagged it
    expected_move_pct: float = 0.0
    estimated_roundtrip_cost_pct: float = 0.0
    cost_gate_passed: bool = False
    is_actionable: bool = False  # True if eligible, strategy matches, and cost gate passed
    rejection_reason_short: Optional[str] = None  # "Price above cash" | "Edge below 3x costs" | "Stale quote" | "Eligible"


class ScannerResponse(BaseModel):
    available_cash: float
    total_scanned: int
    eligible_under_capital_count: int
    actionable_count: int
    scanner_decision: str = "Decision: NO TRADE"
    opportunities: List[ScannerOpportunity]
    no_trade_reasons: List[NoTradeReason]
    scanned_at: datetime
    is_demo: bool = True
