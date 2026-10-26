"""Database models for Personal Finance & Goal Planning."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class ExpenseItem(Base):
    __tablename__ = "expense_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(50), nullable=False)  # Housing, Food, Transport, Investments, Utilities, Entertainment, Healthcare, Misc
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_recurring = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class MonthlyBudget(Base):
    __tablename__ = "monthly_budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    monthly_income = Column(Float, default=0.0, nullable=False)
    category_limits = Column(JSON, default=dict, nullable=False)  # e.g. {"Food": 10000, "Housing": 25000}
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")


class SavingsGoal(Base):
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    goal_name = Column(String(100), nullable=False)  # e.g. "Emergency Fund 6 Months", "House Downpayment"
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0, nullable=False)
    monthly_contribution = Column(Float, default=0.0, nullable=False)
    target_date = Column(DateTime, nullable=True)
    category = Column(String(50), default="General")  # Emergency, Retirement, Vacation, Vehicle, Real Estate
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")
