"""Stochastic Demo Market Data Provider for Indian NSE Equities."""
import random
import math
from datetime import datetime, timedelta
from typing import List, Dict
from backend.app.market_data.base import MarketDataProvider
from backend.app.schemas.market import Tick, Candle, Quote
from backend.app.config import settings

from backend.app.scanner.universe import NSE_STOCKS


class DemoMarketDataProvider(MarketDataProvider):
    """High-fidelity synthetic NSE market data provider."""

    def __init__(self):
        self.provider_name = "DEMO_NSE_SYNTHETIC"
        self._prices: Dict[str, float] = {sym: meta["base_price"] for sym, meta in NSE_STOCKS.items()}
        self._day_open: Dict[str, float] = {sym: meta["base_price"] for sym, meta in NSE_STOCKS.items()}
        self._day_high: Dict[str, float] = {sym: meta["base_price"] * 1.01 for sym, meta in NSE_STOCKS.items()}
        self._day_low: Dict[str, float] = {sym: meta["base_price"] * 0.99 for sym, meta in NSE_STOCKS.items()}
        self._day_volume: Dict[str, int] = {sym: 500000 for sym in NSE_STOCKS}
        self._history_cache: Dict[str, List[Candle]] = {}
        self._last_ticks: Dict[str, Tick] = {}
        self._initialize_history()

    def get_provider_name(self) -> str:
        return self.provider_name

    def is_demo(self) -> bool:
        return True

    def _initialize_history(self):
        """Generate 100 historical 1-minute candles for each symbol using random walk."""
        now = datetime.utcnow()
        for symbol, meta in NSE_STOCKS.items():
            candles = []
            price = meta["base_price"]
            for i in range(120, 0, -1):
                candle_time = now - timedelta(minutes=i)
                # Random return with slight mean reversion
                ret = random.gauss(0, meta["volatility"] * 0.2) - 0.05 * ((price - meta["base_price"]) / meta["base_price"])
                c_open = price
                c_close = max(round(price * (1 + ret), 2), 0.50)
                c_high = max(c_open, c_close, round(max(c_open, c_close) * (1 + abs(random.gauss(0, 0.003))), 2))
                c_low = min(c_open, c_close, round(min(c_open, c_close) * (1 - abs(random.gauss(0, 0.003))), 2))
                c_vol = random.randint(1000, 15000)
                candles.append(Candle(
                    symbol=symbol,
                    timeframe="1m",
                    timestamp=candle_time,
                    open=c_open,
                    high=c_high,
                    low=c_low,
                    close=c_close,
                    volume=c_vol,
                    is_demo=True
                ))
                price = c_close
            self._prices[symbol] = price
            self._day_high[symbol] = max([c.high for c in candles])
            self._day_low[symbol] = min([c.low for c in candles])
            self._day_open[symbol] = candles[0].open
            self._history_cache[symbol] = candles

    def generate_next_tick(self, symbol: str) -> Tick:
        """Advance price by 1 stochastic tick step."""
        if symbol not in NSE_STOCKS:
            raise ValueError(f"Unknown symbol: {symbol}")

        meta = NSE_STOCKS[symbol]
        cur_price = self._prices[symbol]

        # Small 1-second price movement
        vol = meta["volatility"] * 0.05
        # Slight mean reversion to anchor
        drift = -0.01 * ((cur_price - meta["base_price"]) / meta["base_price"])
        pct_change = random.gauss(drift, vol)

        new_price = max(round(cur_price * (1 + pct_change), 2), 0.50)
        self._prices[symbol] = new_price

        # Update high/low
        self._day_high[symbol] = max(self._day_high[symbol], new_price)
        self._day_low[symbol] = min(self._day_low[symbol], new_price)

        # Spread: 0.08% to 0.15%
        spread_bps = 0.0010  # 10 bps
        half_spread = max(round(new_price * (spread_bps / 2), 2), meta["tick_size"])
        bid = round(new_price - half_spread, 2)
        ask = round(new_price + half_spread, 2)
        vol_step = random.randint(10, 500)
        self._day_volume[symbol] += vol_step

        now = datetime.utcnow()
        tick = Tick(
            symbol=symbol,
            price=new_price,
            bid=bid,
            ask=ask,
            volume=vol_step,
            timestamp=now,
            is_demo=True
        )
        self._last_ticks[symbol] = tick
        return tick

    def get_quote(self, symbol: str) -> Quote:
        if symbol not in NSE_STOCKS:
            raise ValueError(f"Unknown symbol: {symbol}")

        meta = NSE_STOCKS[symbol]
        price = self._prices[symbol]
        base = meta["base_price"]
        prev_close = base
        open_p = self._day_open[symbol]
        high_p = self._day_high[symbol]
        low_p = self._day_low[symbol]

        change = round(price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2)

        spread_bps = 0.0010
        half_spread = max(round(price * (spread_bps / 2), 2), meta["tick_size"])
        bid = round(price - half_spread, 2)
        ask = round(price + half_spread, 2)
        spread_pct = round(((ask - bid) / price) * 100, 3)

        now = datetime.utcnow()
        return Quote(
            symbol=symbol,
            company_name=meta["name"],
            current_price=price,
            open=open_p,
            high=high_p,
            low=low_p,
            previous_close=prev_close,
            change=change,
            change_pct=change_pct,
            bid=bid,
            ask=ask,
            spread_pct=spread_pct,
            volume=self._day_volume[symbol],
            timestamp=now,
            is_stale=False,
            is_demo=True,
            disclaimer="SYNTHETIC DEMO DATA - FOR PAPER TRADING ONLY"
        )

    def get_quotes(self, symbols: List[str]) -> Dict[str, Quote]:
        return {sym: self.get_quote(sym) for sym in symbols if sym in NSE_STOCKS}

    def get_historical_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        if symbol not in self._history_cache:
            self.generate_next_tick(symbol)
        candles = self._history_cache.get(symbol, [])
        return candles[-limit:]

    def is_market_open(self) -> bool:
        """Check if market is open (or 24/7 if gating is disabled)."""
        if not settings.MARKET_HOURS_GATE_ENABLED:
            return True

        # Indian Standard Time is UTC + 5:30
        now_utc = datetime.utcnow()
        ist = now_utc + timedelta(hours=5, minutes=30)
        # Check weekdays (Monday=0 ... Friday=4)
        if ist.weekday() >= 5:
            return False
        # Market hours: 09:15 to 15:30 IST
        market_open = ist.replace(hour=9, minute=15, second=0, microsecond=0)
        market_close = ist.replace(hour=15, minute=30, second=0, microsecond=0)
        return market_open <= ist <= market_close
