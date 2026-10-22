"""Position model for tracking open holdings with whole-share quantity."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    quantity = Column(Integer, default=0, nullable=False)  # Strictly whole integer shares
    average_buy_price = Column(Float, default=0.00, nullable=False)
    current_price = Column(Float, default=0.00, nullable=False)
    unrealized_pnl = Column(Float, default=0.00, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    portfolio = relationship("Portfolio", back_populates="positions")
