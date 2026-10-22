"""Angel One SmartAPI Real-Time Live Market Data Provider with WebSocket Streaming."""
import logging
import time
import threading
from datetime import datetime
from typing import List, Dict, Optional, Any, Set
import httpx
import pyotp

from backend.app.market_data.base import MarketDataProvider
from backend.app.market_data.live_nse_provider import LiveNseMarketDataProvider
from backend.app.schemas.market import Tick, Candle, Quote
from backend.app.scanner.universe import NSE_STOCKS, UNIVERSE_SYMBOLS
from backend.app.config import settings

logger = logging.getLogger("autopilot.smartapi")

try:
    from SmartApi.smartWebSocketV2 import SmartWebSocketV2
except ImportError:
    SmartWebSocketV2 = None


class AngelOneSmartApiProvider(MarketDataProvider):
    """
    Primary Live Market Data Provider using Angel One SmartAPI.
    Authenticates securely with API_KEY, CLIENT_CODE, MPIN, and TOTP_TOKEN.
    Features SmartWebSocketV2 streaming client with in-memory caching and auto-reconnect.
    Seamlessly delegates to LiveNseMarketDataProvider if credentials are not configured
    or if API connection fails.
    """

    BASE_URL = "https://apiconnect.angelbroking.com"

    def __init__(self):
        self.provider_name = "Angel One SmartAPI"
        self._fallback_provider = LiveNseMarketDataProvider()
        self._api_key = settings.ANGEL_ONE_API_KEY.strip()
        self._client_code = settings.ANGEL_ONE_CLIENT_CODE.strip()
        self._mpin = settings.ANGEL_ONE_MPIN.strip()
        self._totp_token = settings.ANGEL_ONE_TOTP_TOKEN.strip()

        self._jwt_token: Optional[str] = None
        self._feed_token: Optional[str] = None
        self._token_expiry_time: float = 0.0
        self._is_active: bool = False

        # In-memory quote streaming dictionary: {symbol: Quote}
        self._stream_quotes: Dict[str, Quote] = {}
        self._stream_quotes_lock = threading.Lock()
        self._token_to_symbol: Dict[str, str] = {
            meta["smartapi_token"]: sym
            for sym, meta in NSE_STOCKS.items()
            if "smartapi_token" in meta and meta["smartapi_token"]
        }

        # WebSocket streaming state
        self._sws: Optional[Any] = None
        self._ws_thread: Optional[threading.Thread] = None
        self._stop_ws = False
        self._subscribed_tokens: Set[str] = set()

        if self._api_key and self._client_code and self._mpin and self._totp_token:
            if self._try_login():
                self._start_streaming_worker()
        else:
            logger.info("Angel One SmartAPI credentials not provided in .env. Using fallback live NSE feed.")

    def _try_login(self) -> bool:
        """Attempt login using TOTP and MPIN."""
        try:
            totp_code = pyotp.TOTP(self._totp_token).now()
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-UserType": "USER",
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1",
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "fe80::1",
                "X-PrivateKey": self._api_key
            }
            payload = {
                "clientcode": self._client_code,
                "password": self._mpin,
                "totp": totp_code
            }

            resp = httpx.post(
                f"{self.BASE_URL}/rest/auth/partner/v1/generate-totp",
                headers=headers,
                json=payload,
                timeout=10.0
            )

            data = resp.json()
            if data.get("status") is True and "data" in data:
                self._jwt_token = data["data"].get("jwtToken")
                self._feed_token = data["data"].get("feedToken")
                self._token_expiry_time = time.time() + 3600 * 8  # 8 hours
                self._is_active = True
                logger.info(f"Successfully authenticated with Angel One SmartAPI for user {self._client_code}.")
                return True
            else:
                logger.warning(f"Angel One SmartAPI login returned: {data.get('message')}. Falling back to live NSE feed.")
                return False
        except Exception as e:
            logger.warning(f"Angel One SmartAPI login failed: {e}. Falling back to live NSE feed.")
            return False

    def is_configured(self) -> bool:
        return self._is_active and bool(self._jwt_token)

    def _get_subscription_tokens(self) -> List[str]:
        """Collect tokens for affordable symbols + open positions (max ~50)."""
        tokens = set()
        open_syms = set()
        available_cash = 500.0
        try:
            from backend.app.database import SessionLocal
            from backend.app.models.user import User
            from backend.app.models.position import Position
            db = SessionLocal()
            user = db.query(User).filter(User.is_active == True).first()
            if user and user.portfolio:
                available_cash = user.portfolio.cash_balance
                positions = db.query(Position).filter(Position.portfolio_id == user.portfolio.id).all()
                for p in positions:
                    open_syms.add(p.symbol)
            db.close()
        except Exception:
            pass

        for sym, meta in NSE_STOCKS.items():
            tok = meta.get("smartapi_token")
            if not tok:
                continue
            base_p = meta.get("base_price", 99999.0)
            if base_p <= available_cash or sym in open_syms:
                tokens.add(tok)

        # Fallback to at least top symbols
        if not tokens:
            for s in UNIVERSE_SYMBOLS[:10]:
                tok = NSE_STOCKS.get(s, {}).get("smartapi_token")
                if tok:
                    tokens.add(tok)

        return list(tokens)[:50]

    def _start_streaming_worker(self):
        """Start WebSocket worker thread with exponential backoff auto-reconnect."""
        if not SmartWebSocketV2:
            logger.warning("smartapi-python SmartWebSocketV2 not available. Falling back to REST quotes.")
            return

        self._stop_ws = False
        self._ws_thread = threading.Thread(target=self._run_ws_loop, daemon=True)
        self._ws_thread.start()

    def _run_ws_loop(self):
        """WebSocket loop with exponential backoff."""
        backoff = 2.0
        max_backoff = 60.0

        while not self._stop_ws:
            if not self.is_configured():
                time.sleep(5)
                continue

            try:
                tokens = self._get_subscription_tokens()
                if not tokens:
                    time.sleep(5)
                    continue

                logger.info(f"Initializing SmartWebSocketV2 streaming for {len(tokens)} tokens...")
                self._sws = SmartWebSocketV2(
                    auth_token=self._jwt_token,
                    api_key=self._api_key,
                    client_code=self._client_code,
                    feed_token=self._feed_token
                )

                def on_data(wsapp, data):
                    try:
                        self._handle_ws_data(data)
                    except Exception as err:
                        logger.debug(f"Error handling SmartAPI WS data: {err}")

                def on_open(wsapp):
                    logger.info("SmartWebSocketV2 connection opened. Subscribing to tokens...")
                    token_list = [{"exchangeType": 1, "tokens": tokens}]  # 1 = NSE_CM
                    # Mode 2 = Quote
                    self._sws.subscribe("autopilot_stream", 2, token_list)
                    self._subscribed_tokens = set(tokens)

                def on_error(wsapp, error):
                    logger.warning(f"SmartWebSocketV2 error: {error}")

                def on_close(wsapp):
                    logger.info("SmartWebSocketV2 connection closed.")

                self._sws.on_data = on_data
                self._sws.on_open = on_open
                self._sws.on_error = on_error
                self._sws.on_close = on_close

                # Connect blocks until disconnection
                self._sws.connect()
                backoff = 2.0  # Reset backoff on clean run

            except Exception as e:
                logger.warning(f"SmartWebSocketV2 connection failed: {e}. Retrying in {backoff}s...")
                time.sleep(backoff)
                backoff = min(backoff * 2.0, max_backoff)

    def _handle_ws_data(self, data: dict):
        """Parse incoming quote data from SmartWebSocketV2 into internal Quote format."""
        if not isinstance(data, dict):
            return

        token = str(data.get("token", ""))
        symbol = self._token_to_symbol.get(token)
        if not symbol:
            return

        # Parse LTP (SmartAPI prices are often in paise, e.g. 120250 = Rs 1202.50)
        ltp = float(data.get("last_traded_price", 0.0))
        if ltp > 100000 and symbol in NSE_STOCKS and NSE_STOCKS[symbol].get("base_price", 50.0) < 5000:
            ltp = ltp / 100.0

        if ltp <= 0:
            return

        open_p = float(data.get("open_price", ltp))
        if open_p > 100000 and ltp < 5000:
            open_p = open_p / 100.0

        high_p = float(data.get("high_price", ltp))
        if high_p > 100000 and ltp < 5000:
            high_p = high_p / 100.0

        low_p = float(data.get("low_price", ltp))
        if low_p > 100000 and ltp < 5000:
            low_p = low_p / 100.0

        prev_close = float(data.get("close_price", open_p))
        if prev_close > 100000 and ltp < 5000:
            prev_close = prev_close / 100.0

        volume = int(data.get("volume_trade_for_the_day", 100000))

        quote = self._fallback_provider._build_quote(
            symbol=symbol,
            price=ltp,
            open_p=open_p,
            high_p=high_p,
            low_p=low_p,
            volume=volume,
            prev_close=prev_close
        )

        with self._stream_quotes_lock:
            self._stream_quotes[symbol] = quote

    def get_provider_name(self) -> str:
        if self.is_configured():
            return "Angel One SmartAPI (Live NSE Stream)"
        return self._fallback_provider.get_provider_name()

    def is_demo(self) -> bool:
        return False

    def is_market_open(self) -> bool:
        return self._fallback_provider.is_market_open()

    def get_quote(self, symbol: str) -> Quote:
        clean_sym = symbol.upper().replace(".NS", "")
        # Read from in-memory stream dictionary first (zero network call)
        with self._stream_quotes_lock:
            if clean_sym in self._stream_quotes:
                return self._stream_quotes[clean_sym]

        if not self.is_configured():
            return self._fallback_provider.get_quote(symbol)

        token = NSE_STOCKS.get(clean_sym, {}).get("smartapi_token")
        if not token:
            return self._fallback_provider.get_quote(symbol)

        # Fallback to single REST quote if not yet in streaming cache
        try:
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-UserType": "USER",
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1",
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "fe80::1",
                "X-PrivateKey": self._api_key,
                "Authorization": f"Bearer {self._jwt_token}"
            }
            payload = {
                "mode": "LTP",
                "exchangeTokens": {
                    "NSE": [token]
                }
            }
            resp = httpx.post(
                f"{self.BASE_URL}/rest/secure/angelbroking/market/v1/quote",
                headers=headers,
                json=payload,
                timeout=3.0
            )
            data = resp.json()
            if data.get("status") is True and "fetched" in data.get("data", {}):
                item = data["data"]["fetched"][0]
                ltp = float(item.get("ltp", 0.0))
                if ltp > 0:
                    q = self._fallback_provider._build_quote(
                        symbol=clean_sym,
                        price=ltp,
                        open_p=float(item.get("open", ltp)),
                        high_p=float(item.get("high", ltp)),
                        low_p=float(item.get("low", ltp)),
                        volume=int(item.get("tradeVolume", 100000)),
                        prev_close=float(item.get("close", ltp))
                    )
                    with self._stream_quotes_lock:
                        self._stream_quotes[clean_sym] = q
                    return q
        except Exception as e:
            logger.debug(f"SmartAPI REST quote failed for {symbol}: {e}")

        return self._fallback_provider.get_quote(symbol)

    def get_quotes(self, symbols: List[str]) -> Dict[str, Quote]:
        # Read from in-memory dict with zero network calls per request
        result: Dict[str, Quote] = {}
        for s in symbols:
            clean = s.upper().replace(".NS", "")
            with self._stream_quotes_lock:
                if clean in self._stream_quotes:
                    result[clean] = self._stream_quotes[clean]
                    continue
            result[clean] = self.get_quote(clean)
        return result

    def get_historical_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        return self._fallback_provider.get_historical_candles(symbol, timeframe, limit)

    def generate_next_tick(self, symbol: str) -> Tick:
        quote = self.get_quote(symbol)
        return Tick(
            symbol=quote.symbol,
            price=quote.current_price,
            bid=quote.bid,
            ask=quote.ask,
            volume=quote.volume,
            timestamp=quote.timestamp,
            is_demo=False
        )
