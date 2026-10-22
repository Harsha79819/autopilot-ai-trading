"""Live market data provider interface (Upstox / Angel One / Yahoo Finance)."""
from datetime import datetime
from typing import List, Dict
from backend.app.market_data.base import MarketDataProvider
from backend.app.schemas.market import Tick, Candle, Quote
from backend.app.config import settings


class LiveMarketDataProvider(MarketDataProvider):
    """
    Live market data provider implementation.
    Reads market quotes from authenticated broker APIs (Upstox / Angel One).
    NOTE: Real brokerage order execution is permanently disabled in this platform.
    """

    def __init__(self):
        self.provider_name = "LIVE_BROKER_FEED"
        self._is_configured = bool(settings.UPSTOX_API_KEY or settings.ANGEL_ONE_API_KEY)

    def get_provider_name(self) -> str:
        return self.provider_name

    def is_demo(self) -> bool:
        return not self._is_configured

    def get_quote(self, symbol: str) -> Quote:
        if not self._is_configured:
            raise RuntimeError("Live market data credentials not configured. Please use DemoMarketDataProvider.")
        # When live credentials exist, fetch quotes from broker API
        raise NotImplementedError("Live provider hook ready - configure UPSTOX_API_KEY in .env")

    def get_quotes(self, symbols: List[str]) -> Dict[str, Quote]:
        if not self._is_configured:
            raise RuntimeError("Live market data credentials not configured. Please use DemoMarketDataProvider.")
        raise NotImplementedError("Live provider hook ready - configure UPSTOX_API_KEY in .env")

    def get_historical_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        if not self._is_configured:
            raise RuntimeError("Live market data credentials not configured.")
        raise NotImplementedError("Live provider hook ready.")

    def generate_next_tick(self, symbol: str) -> Tick:
        if not self._is_configured:
            raise RuntimeError("Live market data credentials not configured.")
        raise NotImplementedError("Live provider hook ready.")

    def is_market_open(self) -> bool:
        return True
