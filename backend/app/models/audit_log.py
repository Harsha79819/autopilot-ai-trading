"""Audit log model for recording every signal, decision, and risk check."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # "SIGNAL", "RISK_CHECK", "NO_TRADE", "ORDER_SIMULATION", "KILL_SWITCH"
    symbol = Column(String(50), nullable=True)
    decision = Column(String(20), nullable=False)  # "ALLOWED", "BLOCKED", "NO_TRADE", "EXECUTED", "REJECTED"
    reason = Column(Text, nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
