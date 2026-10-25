"""Schemas for Trading Journal entries and stats."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TradingJournalResponse(BaseModel):
    id: int
    user_id: int
    portfolio_id: int
    symbol: str
    side: str
    quantity: int
    entry_price: float
    exit_price: float
    stop_loss: float
    take_profit: float
    risk_reward_ratio: float
    risk_amount: float
    realized_pnl: float
    realized_pnl_pct: float
    setup_reason: str
    exit_reason: str
    emotion_tag: str
    ai_critique: str
    holding_seconds: int
    created_at: datetime
    closed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TradingJournalSummary(BaseModel):
    total_trades_logged: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    average_risk_reward: float
    total_realized_pnl: float
    disciplined_trades_pct: float
    recent_entries: List[TradingJournalResponse]
