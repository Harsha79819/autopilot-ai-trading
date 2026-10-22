"""Order model for tracking simulated paper orders."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    idempotency_key = Column(String(100), unique=True, index=True, nullable=False)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # "BUY" or "SELL"
    order_type = Column(String(20), default="MARKET", nullable=False)  # "MARKET" or "LIMIT"
    requested_quantity = Column(Integer, nullable=False)  # Whole shares only
    filled_quantity = Column(Integer, default=0, nullable=False)
    price = Column(Float, nullable=False)  # Requested / benchmark price
    executed_price = Column(Float, nullable=True)  # Fill price with slippage
    status = Column(String(20), default="SUBMITTED", nullable=False)  # SUBMITTED, FILLED, REJECTED, CANCELLED
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")
    portfolio = relationship("Portfolio", back_populates="orders")
    trade = relationship("Trade", back_populates="order", uselist=False, cascade="all, delete-orphan")
