"""Tick-to-Candle aggregator for real-time bars."""
from datetime import datetime
from typing import Dict, List, Optional
from backend.app.schemas.market import Tick, Candle


class CandleAggregator:
    """Aggregates incoming ticks into OHLCV candles across multiple timeframes."""

    def __init__(self, timeframes: List[str] = None):
        self.timeframes = timeframes or ["1m", "5m"]
        # Symbol -> timeframe -> current forming candle
        self._forming: Dict[str, Dict[str, Optional[Candle]]] = {}
        # Symbol -> timeframe -> list of completed historical candles
        self._completed: Dict[str, Dict[str, List[Candle]]] = {}

    def _get_candle_bucket_timestamp(self, dt: datetime, timeframe: str) -> datetime:
        """Truncate timestamp to candle boundary."""
        if timeframe == "1m":
            return dt.replace(second=0, microsecond=0)
        elif timeframe == "5m":
            minute = (dt.minute // 5) * 5
            return dt.replace(minute=minute, second=0, microsecond=0)
        elif timeframe == "15m":
            minute = (dt.minute // 15) * 15
            return dt.replace(minute=minute, second=0, microsecond=0)
        return dt.replace(second=0, microsecond=0)

    def process_tick(self, tick: Tick) -> List[Candle]:
        """
        Process a new tick.
        Returns any newly completed candles that closed on this tick.
        """
        symbol = tick.symbol
        if symbol not in self._forming:
            self._forming[symbol] = {tf: None for tf in self.timeframes}
            self._completed[symbol] = {tf: [] for tf in self.timeframes}

        closed_candles: List[Candle] = []

        for tf in self.timeframes:
            bucket_time = self._get_candle_bucket_timestamp(tick.timestamp, tf)
            current_bar = self._forming[symbol][tf]

            if current_bar is None:
                # First tick in bucket
                self._forming[symbol][tf] = Candle(
                    symbol=symbol,
                    timeframe=tf,
                    timestamp=bucket_time,
                    open=tick.price,
                    high=tick.price,
                    low=tick.price,
                    close=tick.price,
                    volume=tick.volume,
                    is_demo=tick.is_demo
                )
            elif current_bar.timestamp == bucket_time:
                # Update existing bar
                current_bar.high = max(current_bar.high, tick.price)
                current_bar.low = min(current_bar.low, tick.price)
                current_bar.close = tick.price
                current_bar.volume += tick.volume
            else:
                # Bar closed! Save and start new one
                closed_candles.append(current_bar)
                self._completed[symbol][tf].append(current_bar)
                # Keep last 500 completed bars
                if len(self._completed[symbol][tf]) > 500:
                    self._completed[symbol][tf].pop(0)

                # Initialize next bar
                self._forming[symbol][tf] = Candle(
                    symbol=symbol,
                    timeframe=tf,
                    timestamp=bucket_time,
                    open=tick.price,
                    high=tick.price,
                    low=tick.price,
                    close=tick.price,
                    volume=tick.volume,
                    is_demo=tick.is_demo
                )

        return closed_candles

    def get_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        """Return list of historical completed candles plus current forming candle."""
        candles = list(self._completed.get(symbol, {}).get(timeframe, []))
        forming = self._forming.get(symbol, {}).get(timeframe)
        if forming:
            candles.append(forming)
        return candles[-limit:]
