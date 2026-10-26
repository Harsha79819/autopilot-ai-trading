"""Scenario Simulation & What-If Stress Testing API Router."""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.services.scenario_simulator import ScenarioSimulator

router = APIRouter(prefix="/api/scenario", tags=["Scenario & Stress Testing"])


class MarketShockRequest(BaseModel):
    drop_pct: float = -10.0


class SingleStockShockRequest(BaseModel):
    symbol: str
    collapse_pct: float = -20.0


@router.post("/market-shock")
def simulate_market_shock(
    req: MarketShockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return ScenarioSimulator.simulate_market_shock(db, portfolio, req.drop_pct)


@router.post("/single-stock")
def simulate_single_stock(
    req: SingleStockShockRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    return ScenarioSimulator.simulate_single_stock_collapse(db, portfolio, req.symbol, req.collapse_pct)
