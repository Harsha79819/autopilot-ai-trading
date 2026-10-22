"""Portfolio model for tracking virtual cash and performance."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    initial_cash = Column(Float, default=500.00, nullable=False)
    cash_balance = Column(Float, default=500.00, nullable=False)
    realized_pnl = Column(Float, default=0.00, nullable=False)
    total_fees_paid = Column(Float, default=0.00, nullable=False)
    peak_portfolio_value = Column(Float, default=500.00, nullable=False)
    is_kill_switched = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="portfolio")
    positions = relationship("Position", back_populates="portfolio", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="portfolio", cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="portfolio", cascade="all, delete-orphan")
