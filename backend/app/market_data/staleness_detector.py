"""Staleness and data validity detector."""
from datetime import datetime
from typing import Tuple
from backend.app.schemas.market import Quote, Tick
from backend.app.config import settings


class StalenessDetector:
    def __init__(self, max_stale_seconds: int = None):
        self.max_stale_seconds = max_stale_seconds or settings.STALE_DATA_THRESHOLD_SECONDS

    def check_quote_freshness(self, quote: Quote) -> Tuple[bool, float]:
        """
        Check if quote timestamp is fresh.
        Returns (is_fresh, age_seconds).
        """
        now = datetime.utcnow()
        age_seconds = (now - quote.timestamp).total_seconds()
        is_fresh = age_seconds <= self.max_stale_seconds
        return is_fresh, age_seconds

    def check_tick_freshness(self, tick: Tick) -> Tuple[bool, float]:
        """
        Check if tick timestamp is fresh.
        Returns (is_fresh, age_seconds).
        """
        now = datetime.utcnow()
        age_seconds = (now - tick.timestamp).total_seconds()
        is_fresh = age_seconds <= self.max_stale_seconds
        return is_fresh, age_seconds


staleness_detector = StalenessDetector()
