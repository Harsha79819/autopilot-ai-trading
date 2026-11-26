"""SQLAlchemy models for Options Trading Desk (F&O Virtual Trading)."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class OptionsPortfolio(Base):
    __tablename__ = "options_portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    initial_capital = Column(Float, default=5000.00, nullable=False)
    cash_balance = Column(Float, default=5000.00, nullable=False)
    realized_pnl = Column(Float, default=0.00, nullable=False)
    total_fees = Column(Float, default=0.00, nullable=False)
    peak_equity = Column(Float, default=5000.00, nullable=False)
    is_autopilot_enabled = Column(Boolean, default=True, nullable=False)
    whatsapp_phone = Column(String(30), default="", nullable=True)
    whatsapp_api_key = Column(String(100), default="", nullable=True)
    whatsapp_phone_number_id = Column(String(50), default="", nullable=True)
    whatsapp_access_token = Column(String(500), default="", nullable=True)
    whatsapp_provider = Column(String(30), default="META_CLOUD_API", nullable=False)
    whatsapp_alerts_enabled = Column(Boolean, default=True, nullable=False)
    broker_name = Column(String(50), default="PAPER", nullable=False)  # "PAPER", "ZERODHA", "ANGEL_ONE", "DHAN"
    broker_api_key = Column(String(100), default="", nullable=True)
    broker_client_code = Column(String(50), default="", nullable=True)
    is_live_broker_routing = Column(Boolean, default=False, nullable=False)
    profit_vault_locked = Column(Float, default=0.00, nullable=False)
    vault_pin = Column(String(50), default="7981", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    positions = relationship("OptionPosition", back_populates="portfolio", cascade="all, delete-orphan")
    trades = relationship("OptionTrade", back_populates="portfolio", cascade="all, delete-orphan")


class OptionPosition(Base):
    __tablename__ = "option_positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("options_portfolios.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False)  # e.g., "NIFTY24000CE"
    underlying = Column(String(20), default="NIFTY", nullable=False)
    strike_price = Column(Float, nullable=False)
    option_type = Column(String(10), nullable=False)  # "CE" or "PE"
    strategy_type = Column(String(30), default="NAKED", nullable=False)  # "NAKED", "BULL_CALL_SPREAD", "BEAR_PUT_SPREAD"
    paired_strike = Column(Float, nullable=True)  # Second leg strike for spreads
    net_debit = Column(Float, nullable=True)  # Net premium debit paid for spread
    expiry_date = Column(String(20), nullable=False)
    lot_size = Column(Integer, default=25, nullable=False)
    quantity = Column(Integer, default=25, nullable=False)
    entry_premium = Column(Float, nullable=False)
    current_premium = Column(Float, nullable=False)
    stop_loss_premium = Column(Float, nullable=False)
    target_premium = Column(Float, nullable=False)
    trailing_stop_premium = Column(Float, nullable=False)
    trailing_activated = Column(Boolean, default=False, nullable=False)
    is_open = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portfolio = relationship("OptionsPortfolio", back_populates="positions")


class OptionTrade(Base):
    __tablename__ = "option_trades"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("options_portfolios.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False)
    underlying = Column(String(20), default="NIFTY", nullable=False)
    strike_price = Column(Float, nullable=False)
    option_type = Column(String(10), nullable=False)
    expiry_date = Column(String(20), nullable=False)
    lot_size = Column(Integer, default=25, nullable=False)
    quantity = Column(Integer, default=25, nullable=False)
    entry_premium = Column(Float, nullable=False)
    exit_premium = Column(Float, nullable=False)
    realized_pnl = Column(Float, nullable=False)
    gross_pnl = Column(Float, default=0.0, nullable=False)
    net_pnl = Column(Float, default=0.0, nullable=False)
    return_pct = Column(Float, nullable=False)
    fees = Column(Float, default=40.0, nullable=False)  # Total statutory charges
    brokerage = Column(Float, default=40.0, nullable=False)
    stt = Column(Float, default=0.0, nullable=False)
    exchange_charges = Column(Float, default=0.0, nullable=False)
    gst = Column(Float, default=0.0, nullable=False)
    stamp_duty = Column(Float, default=0.0, nullable=False)
    sebi_charges = Column(Float, default=0.0, nullable=False)
    entry_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    exit_time = Column(DateTime, default=datetime.utcnow, nullable=False)
    exit_reason = Column(String(50), nullable=False)  # "TARGET_HIT", "STOP_LOSS_HIT", "INTRADAY_SQUARE_OFF", "MANUAL_EXIT"
    trade_notes = Column(String(255), default="", nullable=True)

    portfolio = relationship("OptionsPortfolio", back_populates="trades")
