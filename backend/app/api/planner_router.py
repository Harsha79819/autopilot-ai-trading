"""Financial Planner API Router (Budgets, Expenses, Goals, SIP/EMI Calculators)."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.financial_planner import ExpenseItem, MonthlyBudget, SavingsGoal
from backend.app.services.financial_calculators import FinancialCalculators

router = APIRouter(prefix="/api/planner", tags=["Financial Planner"])


# Pydantic Schemas
class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: Optional[str] = None
    is_recurring: bool = False


class BudgetCreate(BaseModel):
    month: int
    year: int
    monthly_income: float
    category_limits: Dict[str, float]
    notes: Optional[str] = None


class GoalCreate(BaseModel):
    goal_name: str
    target_amount: float
    current_amount: float = 0.0
    monthly_contribution: float = 0.0
    category: str = "General"


class SIPRequest(BaseModel):
    monthly_investment: float
    expected_annual_return_pct: float = 12.0
    tenure_years: int = 10
    annual_inflation_pct: float = 6.0


class EMIRequest(BaseModel):
    principal: float
    annual_interest_rate_pct: float = 8.5
    tenure_months: int = 120


class LumpsumRequest(BaseModel):
    principal: float
    annual_rate_pct: float = 10.0
    years: int = 5
    annual_inflation_pct: float = 6.0


class RetirementRequest(BaseModel):
    current_age: int = 28
    retirement_age: int = 60
    current_monthly_expense: float = 40000.0
    expected_inflation_pct: float = 6.0
    post_retirement_return_pct: float = 8.0


# --- Calculator Endpoints ---
@router.post("/calculate/sip")
def calculate_sip(req: SIPRequest):
    return FinancialCalculators.calculate_sip(
        req.monthly_investment,
        req.expected_annual_return_pct,
        req.tenure_years,
        req.annual_inflation_pct
    )


@router.post("/calculate/emi")
def calculate_emi(req: EMIRequest):
    return FinancialCalculators.calculate_emi(
        req.principal,
        req.annual_interest_rate_pct,
        req.tenure_months
    )


@router.post("/calculate/lumpsum")
def calculate_lumpsum(req: LumpsumRequest):
    return FinancialCalculators.calculate_lumpsum(
        req.principal,
        req.annual_rate_pct,
        req.years,
        req.annual_inflation_pct
    )


@router.post("/calculate/emergency-fund")
def calculate_emergency_fund(monthly_expenses: float = Query(30000.0), months: int = Query(6)):
    return FinancialCalculators.calculate_emergency_fund(monthly_expenses, months)


@router.post("/calculate/retirement")
def calculate_retirement(req: RetirementRequest):
    return FinancialCalculators.calculate_retirement_corpus(
        req.current_age,
        req.retirement_age,
        req.current_monthly_expense,
        req.expected_inflation_pct,
        req.post_retirement_return_pct
    )


# --- Expenses Endpoints ---
@router.get("/expenses")
def get_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(ExpenseItem).filter(ExpenseItem.user_id == current_user.id).order_by(ExpenseItem.expense_date.desc()).all()
    total_spent = sum(i.amount for i in items)
    by_category = {}
    for i in items:
        by_category[i.category] = by_category.get(i.category, 0.0) + i.amount

    return {
        "total_spent": round(total_spent, 2),
        "by_category": by_category,
        "items": [
            {
                "id": i.id,
                "category": i.category,
                "amount": i.amount,
                "description": i.description,
                "is_recurring": i.is_recurring,
                "date": i.expense_date.isoformat()
            } for i in items
        ]
    }


@router.post("/expenses")
def add_expense(
    req: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = ExpenseItem(
        user_id=current_user.id,
        category=req.category,
        amount=req.amount,
        description=req.description,
        is_recurring=req.is_recurring
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": "Expense logged successfully", "id": item.id}


# --- Goals Endpoints ---
@router.get("/goals")
def get_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    return [
        {
            "id": g.id,
            "goal_name": g.goal_name,
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "monthly_contribution": g.monthly_contribution,
            "progress_pct": round((g.current_amount / g.target_amount) * 100.0, 1) if g.target_amount > 0 else 0.0,
            "category": g.category,
            "is_completed": g.is_completed
        } for g in goals
    ]


@router.post("/goals")
def create_goal(
    req: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    goal = SavingsGoal(
        user_id=current_user.id,
        goal_name=req.goal_name,
        target_amount=req.target_amount,
        current_amount=req.current_amount,
        monthly_contribution=req.monthly_contribution,
        category=req.category
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"message": "Savings goal created", "id": goal.id}
