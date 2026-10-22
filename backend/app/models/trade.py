"""Trade execution model with granular fee breakdown."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, unique=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), nullable=False)  # "BUY" or "SELL"
    quantity = Column(Integer, nullable=False)
    execution_price = Column(Float, nullable=False)
    gross_amount = Column(Float, nullable=False)  # quantity * execution_price

    # Granular Indian taxes and exchange charges
    brokerage = Column(Float, default=0.0, nullable=False)
    stt = Column(Float, default=0.0, nullable=False)
    exchange_charges = Column(Float, default=0.0, nullable=False)
    gst = Column(Float, default=0.0, nullable=False)
    sebi_charges = Column(Float, default=0.0, nullable=False)
    stamp_duty = Column(Float, default=0.0, nullable=False)
    dp_charges = Column(Float, default=0.0, nullable=False)
    total_charges = Column(Float, default=0.0, nullable=False)

    # Market friction
    slippage_amount = Column(Float, default=0.0, nullable=False)
    spread_amount = Column(Float, default=0.0, nullable=False)

    # Net cash flow: for BUY = gross + total_charges; for SELL = gross - total_charges
    net_amount = Column(Float, nullable=False)
    realized_pnl = Column(Float, default=0.0, nullable=False)  # Net realized profit/loss for sells

    executed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="trade")
    user = relationship("User", back_populates="trades")
    portfolio = relationship("Portfolio", back_populates="trades")
