"""Angel One SmartAPI Real-Time Live Market Data Provider."""
import logging
import time
from datetime import datetime
from typing import List, Dict, Optional, Any
import httpx
import pyotp

from backend.app.market_data.base import MarketDataProvider
from backend.app.market_data.live_nse_provider import LiveNseMarketDataProvider
from backend.app.schemas.market import Tick, Candle, Quote
from backend.app.scanner.universe import NSE_STOCKS, UNIVERSE_SYMBOLS
from backend.app.config import settings

logger = logging.getLogger("autopilot.smartapi")


class AngelOneSmartApiProvider(MarketDataProvider):
    """
    Primary Live Market Data Provider using Angel One SmartAPI.
    Authenticates securely with API_KEY, CLIENT_CODE, MPIN, and TOTP_TOKEN.
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

        if self._api_key and self._client_code and self._mpin and self._totp_token:
            self._try_login()
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

    def get_provider_name(self) -> str:
        if self.is_configured():
            return "Angel One SmartAPI (Live NSE)"
        return self._fallback_provider.get_provider_name()

    def is_demo(self) -> bool:
        return False

    def is_market_open(self) -> bool:
        return self._fallback_provider.is_market_open()

    def get_quote(self, symbol: str) -> Quote:
        if not self.is_configured():
            return self._fallback_provider.get_quote(symbol)

        clean_sym = symbol.upper().replace(".NS", "")
        token = NSE_STOCKS.get(clean_sym, {}).get("smartapi_token")
        if not token:
            return self._fallback_provider.get_quote(symbol)

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
                timeout=5.0
            )
            data = resp.json()
            if data.get("status") is True and "fetched" in data.get("data", {}):
                item = data["data"]["fetched"][0]
                ltp = float(item.get("ltp", 0.0))
                if ltp > 0:
                    return self._fallback_provider._build_quote(
                        symbol=clean_sym,
                        price=ltp,
                        open_p=float(item.get("open", ltp)),
                        high_p=float(item.get("high", ltp)),
                        low_p=float(item.get("low", ltp)),
                        volume=int(item.get("tradeVolume", 100000)),
                        prev_close=float(item.get("close", ltp))
                    )
        except Exception as e:
            logger.debug(f"SmartAPI quote failed for {symbol}: {e}")

        return self._fallback_provider.get_quote(symbol)

    def get_quotes(self, symbols: List[str]) -> Dict[str, Quote]:
        if not self.is_configured():
            return self._fallback_provider.get_quotes(symbols)

        result: Dict[str, Quote] = {}
        for s in symbols:
            result[s] = self.get_quote(s)
        return result

    def get_historical_candles(self, symbol: str, timeframe: str = "1m", limit: int = 100) -> List[Candle]:
        # SmartAPI historical or fallback
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
