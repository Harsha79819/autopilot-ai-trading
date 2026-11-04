"""Market Data package initialization and provider coordinator."""
from datetime import datetime, time
from typing import Tuple
from backend.app.config import settings
from backend.app.market_data.base import MarketDataProvider
from backend.app.market_data.demo_provider import DemoMarketDataProvider
from backend.app.market_data.live_nse_provider import LiveNseMarketDataProvider
from backend.app.market_data.smartapi_provider import AngelOneSmartApiProvider
from backend.app.market_data.candle_aggregator import CandleAggregator
from backend.app.market_data.staleness_detector import StalenessDetector, staleness_detector

try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
except ImportError:
    import pytz
    IST = pytz.timezone("Asia/Kolkata")


from backend.app.market_data.market_calendar import (
    is_trading_day,
    is_market_open,
    get_market_status,
    get_next_open_time,
    get_seconds_until_next_open,
)


def is_market_session_active() -> Tuple[bool, str]:
    """
    Check if NSE regular market session is currently active using official calendar.
    Returns (is_open: bool, message: str).
    """
    if not settings.MARKET_HOURS_GATE_ENABLED:
        return True, "Market Session Active (Test Mode Enabled)"

    return get_market_status()


import logging
logger = logging.getLogger("autopilot.market_data")

def get_market_provider() -> MarketDataProvider:
    """Factory to return the configured market data provider instance."""
    provider_type = settings.MARKET_DATA_PROVIDER.lower()

    if provider_type == "angel_one" or (settings.ANGEL_ONE_API_KEY and settings.ANGEL_ONE_CLIENT_CODE):
        provider = AngelOneSmartApiProvider()
        logger.info(f"Market data provider selected: {provider.get_provider_name()}")
        return provider
    elif provider_type == "demo":
        provider = DemoMarketDataProvider()
        logger.info(f"Market data provider selected: {provider.get_provider_name()}")
        return provider
    else:
        # Default to real-time live NSE public feed
        provider = LiveNseMarketDataProvider()
        logger.info(f"Market data provider selected: {provider.get_provider_name()}")
        return provider


# Global default provider instances
market_provider = get_market_provider()
demo_provider = market_provider  # Alias for backward compatibility across routers
candle_aggregator = CandleAggregator()

__all__ = [
    "MarketDataProvider",
    "DemoMarketDataProvider",
    "LiveNseMarketDataProvider",
    "AngelOneSmartApiProvider",
    "CandleAggregator",
    "StalenessDetector",
    "staleness_detector",
    "market_provider",
    "demo_provider",
    "candle_aggregator",
    "is_market_session_active",
    "is_trading_day",
    "is_market_open",
    "get_market_status",
    "get_next_open_time",
    "get_seconds_until_next_open",
    "get_market_provider"
]
