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


def is_market_session_active() -> Tuple[bool, str]:
    """
    Check if NSE regular market session is currently active (09:15 to 15:30 IST, Monday-Friday).
    Returns (is_open: bool, message: str).
    """
    if not settings.MARKET_HOURS_GATE_ENABLED:
        return True, "Market Session Active (Test Mode Enabled)"

    now_ist = datetime.now(IST)
    weekday = now_ist.weekday()  # 0 = Monday, 4 = Friday, 5 = Saturday, 6 = Sunday

    # Weekend check
    if weekday >= 5:
        day_name = "Saturday" if weekday == 5 else "Sunday"
        return False, f"Market Closed ({day_name} Weekend · Paper trading paused)"

    cur_time = now_ist.time()
    market_open = time(9, 15)
    market_close = time(15, 30)

    if cur_time < market_open:
        return False, f"Market Closed (Pre-market opens at 09:15 IST · Paper trading paused)"
    elif cur_time > market_close:
        return False, "Market Closed (Paper trading paused)"
    else:
        return True, "Market Open (09:15 - 15:30 IST)"


def get_market_provider() -> MarketDataProvider:
    """Factory to return the configured market data provider instance."""
    provider_type = settings.MARKET_DATA_PROVIDER.lower()

    if provider_type == "angel_one" or (settings.ANGEL_ONE_API_KEY and settings.ANGEL_ONE_CLIENT_CODE):
        return AngelOneSmartApiProvider()
    elif provider_type == "demo":
        return DemoMarketDataProvider()
    else:
        # Default to real-time live NSE public feed
        return LiveNseMarketDataProvider()


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
    "get_market_provider"
]
