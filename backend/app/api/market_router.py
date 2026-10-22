"""Market Data API Router."""
from typing import List, Dict
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.market import Quote, Candle, MarketStatusResponse
from backend.app.market_data import demo_provider, candle_aggregator
from backend.app.scanner.universe import UNIVERSE_SYMBOLS
from backend.app.config import settings

router = APIRouter(prefix="/api/market", tags=["Market Data"])


@router.get("/quotes", response_model=List[Quote])
def get_all_quotes():
    quotes_dict = demo_provider.get_quotes(UNIVERSE_SYMBOLS)
    return list(quotes_dict.values())


@router.get("/quote/{symbol}", response_model=Quote)
def get_single_quote(symbol: str):
    sym = symbol.upper()
    if sym not in UNIVERSE_SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {sym} not found in universe.")
    return demo_provider.get_quote(sym)


@router.get("/candles/{symbol}", response_model=List[Candle])
def get_symbol_candles(
    symbol: str,
    timeframe: str = Query("1m", pattern="^(1m|5m|15m)$"),
    limit: int = Query(100, ge=10, le=500)
):
    sym = symbol.upper()
    if sym not in UNIVERSE_SYMBOLS:
        raise HTTPException(status_code=404, detail=f"Symbol {sym} not found.")
    candles = demo_provider.get_historical_candles(sym, timeframe=timeframe, limit=limit)
    return candles


@router.get("/status", response_model=MarketStatusResponse)
def get_market_status():
    return MarketStatusResponse(
        is_market_open=demo_provider.is_market_open(),
        market_hours_ist="09:15 - 15:30 IST",
        current_time_utc=datetime.utcnow(),
        provider_name=demo_provider.get_provider_name(),
        is_demo=demo_provider.is_demo(),
        active_symbols_count=len(UNIVERSE_SYMBOLS),
        staleness_threshold_seconds=settings.STALE_DATA_THRESHOLD_SECONDS,
        disclaimer="SIMULATED PAPER TRADING: Real-time NSE feed with simulated paper execution. No real money or real brokerage orders are placed."
    )


@router.post("/toggle-gate")
def toggle_market_hours_gate():
    """Toggle the IST market hours gate (enables testing simulated trading outside 09:15-15:30 IST)."""
    from backend.app.market_data import is_market_session_active
    settings.MARKET_HOURS_GATE_ENABLED = not settings.MARKET_HOURS_GATE_ENABLED
    is_open, msg = is_market_session_active()
    return {
        "gate_enabled": settings.MARKET_HOURS_GATE_ENABLED,
        "is_market_open": is_open,
        "session_message": msg
    }
