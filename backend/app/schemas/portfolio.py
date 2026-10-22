"""Portfolio, Position, and Ledger schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class PositionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    quantity: int
    average_buy_price: float
    current_price: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    gross_pnl: float = 0.0
    estimated_exit_costs: float = 0.0
    net_pnl: float = 0.0
    updated_at: datetime


class FeeBreakdown(BaseModel):
    brokerage: float = 0.0
    stt: float = 0.0
    exchange_charges: float = 0.0
    gst: float = 0.0
    sebi_charges: float = 0.0
    stamp_duty: float = 0.0
    dp_charges: float = 0.0
    slippage_amount: float = 0.0
    spread_amount: float = 0.0
    total_charges: float = 0.0


class TradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    symbol: str
    side: str
    quantity: int
    execution_price: float
    gross_amount: float
    fees: FeeBreakdown
    net_amount: float
    realized_pnl: float
    executed_at: datetime


class PerformanceMetrics(BaseModel):
    initial_cash: float
    current_cash: float
    holdings_value: float
    total_portfolio_value: float
    gross_profit: float
    realized_pnl: float
    unrealized_pnl: float
    total_fees_paid: float
    net_pnl: float
    net_return_pct: float
    peak_value: float
    max_drawdown_pct: float
    total_trades_count: int
    winning_trades_count: int
    losing_trades_count: int
    win_rate_pct: float
    cost_drag_pct: float  # fees as % of gross profit (warning if > 50%)


class PortfolioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    initial_cash: float
    cash_balance: float
    holdings_value: float
    total_portfolio_value: float
    realized_pnl: float
    unrealized_pnl: float
    total_fees_paid: float
    net_pnl: float
    net_return_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    is_kill_switched: bool
    is_paper_trading: bool = True
    positions: List[PositionResponse] = []
    recent_trades: List[TradeResponse] = []
    metrics: PerformanceMetrics
    updated_at: datetime


class PortfolioResetRequest(BaseModel):
    capital: Optional[float] = Field(500.00, ge=10.0, description="Virtual cash reset amount, default INR 500.00")


class DepositRequest(BaseModel):
    amount: float = Field(..., gt=0, le=100000.0, description="Simulated virtual deposit amount in INR")
    note: Optional[str] = Field("Simulated user deposit", description="Optional audit note")
