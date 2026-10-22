"""Market data provider abstract interface."""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Optional
from backend.app.schemas.market import Tick, Candle, Quote


class MarketDataProvider(ABC):
    """Abstract base class for all market data providers (Demo, Upstox, Angel One, Yahoo Finance)."""

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the unique name of the data provider."""
        pass

    @abstractmethod
    def is_demo(self) -> bool:
        """Return True if the provider generates synthetic demo data."""
        pass

    @abstractmethod
    def get_quote(self, symbol: str) -> Quote:
        """Get the latest quote for a symbol."""
        pass

    @abstractmethod
    def get_quotes(self, symbols: List[str]) -> Dict[str, Quote]:
        """Get quotes for multiple symbols."""
        pass

    @abstractmethod
    def get_historical_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        """Get historical OHLCV candles."""
        pass

    @abstractmethod
    def generate_next_tick(self, symbol: str) -> Tick:
        """Generate or receive next real-time tick."""
        pass

    @abstractmethod
    def is_market_open(self) -> bool:
        """Check if market is currently within regular trading hours (09:15 - 15:30 IST)."""
        pass
