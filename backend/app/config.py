"""AutoPilot AI Trading Platform - Application Configuration."""
from typing import List, Union
import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "AutoPilot AI Trading Platform"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    # Security & Authentication
    JWT_SECRET_KEY: str = "autopilot-super-secret-jwt-key-minimum-32-chars-long"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./backend/data/autopilot.db"

    # Timezone & Base Currency
    TIMEZONE: str = "Asia/Kolkata"
    BASE_CURRENCY: str = "INR"

    # Strict Paper Trading Safety Assertion
    INITIAL_VIRTUAL_CAPITAL_INR: float = 500.00
    STRICT_PAPER_TRADING_ONLY: bool = True

    # Market Data
    MARKET_DATA_PROVIDER: str = "live_nse"  # "live_nse" | "angel_one" | "demo"
    MARKET_DATA_IS_DEMO: bool = False
    MARKET_HOURS_GATE_ENABLED: bool = True  # True enforces 09:15-15:30 IST Mon-Fri session gate
    STALE_DATA_THRESHOLD_SECONDS: int = 30

    # Broker API Credentials (Optional, read-only for market data, strictly disabled for orders)
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_CODE: str = ""
    ANGEL_ONE_MPIN: str = ""
    ANGEL_ONE_TOTP_TOKEN: str = ""

    # Risk Management Defaults & Position Sizing
    MAX_POSITION_SIZE_PCT: float = 20.0    # Capped at 20% of total portfolio value per trade
    MIN_STOCK_PRICE_INR: float = 100.00    # Rejects penny & speculative stocks under ₹100
    MAX_DAILY_LOSS_PCT: float = 2.0        # 2.0% daily loss limit (₹10.00 on ₹500)
    MAX_DAILY_LOSS_INR: float = 10.00      # Configurable ₹10.00 risk trigger
    MAX_PORTFOLIO_DRAWDOWN_PCT: float = 15.0 # 15% drawdown cutoff (₹75 on ₹500)
    STOP_LOSS_PCT: float = 1.5             # -1.5% strict stop loss execution gate
    TAKE_PROFIT_PCT: float = 2.2           # +2.2% take-profit target gate
    EMERGENCY_STOP_ACTIVE: bool = False

    # Strategy & Cost Gate Parameters
    COST_AWARE_GATE_MULTIPLIER: float = 3.0 # expected_move >= K * total_costs
    SIMULATED_SLIPPAGE_BPS: float = 7.5     # 0.075% slippage buffer (realistic 0.05% - 0.10%)
    SIMULATED_SPREAD_BPS: float = 10.0      # 0.10% bid-ask spread

    # Continuous Auto-Pilot Service
    AUTOPILOT_RUNNER_ENABLED: bool = True
    AUTOPILOT_INTERVAL_SECONDS: float = 10.0

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
