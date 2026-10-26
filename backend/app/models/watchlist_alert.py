"""Database models for Watchlists, Price Alerts & In-App Notifications."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    target_buy_price = Column(Float, nullable=True)
    target_sell_price = Column(Float, nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class AlertRule(Base):
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(20), nullable=True, index=True)  # None for portfolio-level alert
    alert_type = Column(String(50), nullable=False)  # PRICE_ABOVE, PRICE_BELOW, DAILY_CHANGE_PCT, DRAWDOWN_BREACH, CONCENTRATION_RISK
    threshold_value = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    triggered_at = Column(DateTime, nullable=True)
    cooldown_minutes = Column(Integer, default=60, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    message = Column(String(500), nullable=False)
    severity = Column(String(20), default="INFO")  # INFO, WARNING, CRITICAL, SUCCESS
    category = Column(String(50), default="SYSTEM")  # PRICE_ALERT, RISK_BREACH, AI_BRIEFING, SYSTEM
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
