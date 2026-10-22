"""Market data, tick, candle, and quote schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class Tick(BaseModel):
    symbol: str
    price: float
    bid: float
    ask: float
    volume: int
    timestamp: datetime
    is_demo: bool = True


class Candle(BaseModel):
    symbol: str
    timeframe: str  # "1s", "1m", "5m", "15m"
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    is_demo: bool = True


class Quote(BaseModel):
    symbol: str
    company_name: str
    current_price: float
    open: float
    high: float
    low: float
    previous_close: float
    change: float
    change_pct: float
    bid: float
    ask: float
    spread_pct: float
    volume: int
    timestamp: datetime
    is_stale: bool = False
    is_demo: bool = True
    disclaimer: str = "SYNTHETIC DEMO DATA - FOR PAPER TRADING ONLY"


class MarketStatusResponse(BaseModel):
    is_market_open: bool
    market_hours_ist: str = "09:15 - 15:30 IST"
    current_time_utc: datetime
    provider_name: str
    is_demo: bool
    active_symbols_count: int
    staleness_threshold_seconds: int
    disclaimer: str
