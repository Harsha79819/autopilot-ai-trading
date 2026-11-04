"""PositionRiskState model for persisting open position targets and dynamic trailing stops across restarts."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base


class PositionRiskState(Base):
    __tablename__ = "position_risk_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String(50), nullable=False, index=True)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=False)
    peak_price = Column(Float, nullable=False)
    trailed_stop = Column(Float, nullable=False)
    opened_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "symbol", name="uq_user_symbol_risk_state"),
    )

    user = relationship("User")
