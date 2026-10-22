"""Strategy configuration model for user-defined parameters."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class StrategyConfig(Base):
    __tablename__ = "strategy_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    strategy_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    parameters_json = Column(Text, default="{}", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="strategy_configs")
