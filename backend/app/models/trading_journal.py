"""Trading Journal model for recording trade setups, emotions, and risk-reward execution."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class TradingJournal(Base):
    __tablename__ = "trading_journals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    side = Column(String(10), default="BUY", nullable=False)
    quantity = Column(Integer, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=False)
    risk_reward_ratio = Column(Float, default=2.0, nullable=False)  # e.g., 2.0 for 1:2 RR
    risk_amount = Column(Float, default=0.0, nullable=False)  # capital at risk in INR
    realized_pnl = Column(Float, nullable=False)
    realized_pnl_pct = Column(Float, nullable=False)
    setup_reason = Column(Text, nullable=False)
    exit_reason = Column(Text, nullable=False)
    emotion_tag = Column(String(30), default="DISCIPLINED", nullable=False)  # DISCIPLINED, PATIENT, GREED, FOMO, FEAR
    ai_critique = Column(Text, nullable=False)
    holding_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    portfolio = relationship("Portfolio")
