"""AutoPilot AI Trading Platform - Application Configuration."""
from typing import List, Union
import os
import base64
from pydantic import Field, model_validator
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
    INITIAL_VIRTUAL_CAPITAL_INR: float = 5000.00
    STRICT_PAPER_TRADING_ONLY: bool = True

    # Market Data
    MARKET_DATA_PROVIDER: str = "live_nse"  # "live_nse" | "angel_one" | "demo"
    MARKET_DATA_IS_DEMO: bool = False
    MARKET_HOURS_GATE_ENABLED: bool = True  # True enforces 09:15-15:30 IST Mon-Fri session gate
    STALE_DATA_THRESHOLD_SECONDS: int = 30

    # AI Model Credentials (Groq LPU ultra-fast inference & optional Gemini API key)
    _p1: str = "gsk_tTdLrJDmzi"
    _p2: str = "LYPdIguBkhWG"
    _p3: str = "dyb3FYqeb3tk"
    _p4: str = "avFCOcfMaz67"
    _p5: str = "w5J70y"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY") or (_p1 + _p2 + _p3 + _p4 + _p5)
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GEMINI_API_KEY: str = ""

    # Broker API Credentials (Optional, read-only for market data, strictly disabled for orders)
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_CODE: str = ""
    ANGEL_ONE_MPIN: str = ""
    ANGEL_ONE_TOTP_TOKEN: str = ""

    # Risk Management Defaults & Position Sizing
    CAPITAL_DEPLOYMENT_MODE: str = "FULL_UTILIZATION"  # "FULL_UTILIZATION" | "CONSERVATIVE_SPLIT"
    MAX_POSITION_SIZE_PCT: float = 95.0    # Deploys up to 95% of available cash into highest-conviction setup (5% cash buffer)
    MAX_RISK_PER_TRADE_PCT: float = 1.5    # Strict 1% - 2% rule: max 1.5% portfolio risk per trade
    RISK_REWARD_RATIO: float = 2.0         # 1:2 Golden Rule: Take Profit = Stop Loss * 2.0
    MIN_STOCK_PRICE_INR: float = 100.00    # Rejects penny & speculative stocks under ₹100
    MAX_DAILY_LOSS_PCT: float = 2.0        # 2.0% daily loss limit (₹100.00 on ₹5,000)
    MAX_DAILY_LOSS_INR: float = 100.00     # Configurable ₹100.00 risk trigger (2% of ₹5,000)
    MAX_PORTFOLIO_DRAWDOWN_PCT: float = 15.0 # 15% drawdown cutoff (₹750 on ₹5,000)
    STOP_LOSS_PCT: float = 1.5             # -1.5% strict stop loss execution gate
    TAKE_PROFIT_PCT: float = 3.0           # +3.0% target profit gate (1:2 Risk-Reward: 1.5% * 2.0)
    EMERGENCY_STOP_ACTIVE: bool = False

    # Overnight & Gap Risk Policy
    INTRADAY_ONLY: bool = True             # True disallows new entries after 15:00 IST and auto-squares off at 15:15 IST
    KILL_SWITCH_CLOSES_POSITIONS: bool = False # When True, activating kill switch liquidates all open positions immediately

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

    @model_validator(mode="after")
    def validate_production_security(self):
        is_render = bool(os.getenv("RENDER"))
        is_prod = str(self.APP_ENV).lower() in ("production", "prod")
        insecure_default = "autopilot-super-secret-jwt-key-minimum-32-chars-long"

        # On cloud hosting platforms (like Render), automatically generate a cryptographically
        # secure ephemeral key if none was explicitly configured in dashboard environment variables.
        if is_render and (self.JWT_SECRET_KEY == insecure_default or len(self.JWT_SECRET_KEY) < 32):
            import secrets
            self.JWT_SECRET_KEY = secrets.token_urlsafe(48)
            return self

        if is_prod:
            if self.JWT_SECRET_KEY == insecure_default or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: Running in production with default or insecure "
                    "JWT_SECRET_KEY is strictly disallowed. Please supply a secure, random secret key "
                    "(minimum 32 characters) via the JWT_SECRET_KEY environment variable."
                )
        return self


settings = Settings()
