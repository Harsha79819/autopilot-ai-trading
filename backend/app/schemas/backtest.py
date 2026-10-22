"""Backtesting schemas."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BacktestRequest(BaseModel):
    strategy_name: str
    symbol: str
    initial_capital: float = Field(100.00, ge=10.0)
    lookback_days: int = Field(30, ge=5, le=365)
    train_split_pct: float = Field(60.0, ge=30.0, le=80.0)
    val_split_pct: float = Field(20.0, ge=10.0, le=40.0)
    test_split_pct: float = Field(20.0, ge=10.0, le=40.0)
    slippage_bps: float = Field(5.0, ge=0.0)
    spread_bps: float = Field(10.0, ge=0.0)


class BacktestTradeRecord(BaseModel):
    trade_id: int
    symbol: str
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    quantity: int
    gross_pnl: float
    fees_paid: float
    net_pnl: float
    return_pct: float
    exit_reason: str


class SplitPerformance(BaseModel):
    split_name: str  # "Train", "Validation", "Test"
    start_date: datetime
    end_date: datetime
    total_trades: int
    win_rate_pct: float
    gross_profit: float
    total_fees: float
    net_profit: float
    max_drawdown_pct: float
    profit_factor: float


class BacktestResponse(BaseModel):
    strategy_name: str
    symbol: str
    initial_capital: float
    final_equity: float
    gross_return_pct: float
    net_return_pct: float
    total_fees_paid: float
    cost_drag_pct: float
    total_trades: int
    win_rate_pct: float
    max_drawdown_pct: float
    profit_factor: float
    sharpe_ratio: float
    splits: List[SplitPerformance]
    equity_curve: List[Dict[str, Any]]
    sample_trades: List[BacktestTradeRecord]
    assumptions_disclaimer: str
