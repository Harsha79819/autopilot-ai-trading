"""RunnerLock model for DB-based leader election to prevent duplicate runner execution."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from backend.app.database import Base


class RunnerLock(Base):
    __tablename__ = "runner_locks"

    id = Column(Integer, primary_key=True, index=True)
    lock_key = Column(String(50), unique=True, nullable=False, default="autopilot_runner", index=True)
    owner_id = Column(String(100), nullable=False)
    heartbeat = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
