"""Strategy Engine API Router."""
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.strategy import StrategyInfo, StrategySignal, StrategyEvaluateRequest
from backend.app.strategies import STRATEGY_REGISTRY
from backend.app.market_data import demo_provider
from backend.app.models.user import User
from backend.app.models.position import Position
from backend.app.auth.dependencies import get_current_user
from sqlalchemy.orm import Session
from backend.app.database import get_db

router = APIRouter(prefix="/api/strategies", tags=["Strategies"])


@router.get("", response_model=List[StrategyInfo])
def list_strategies():
    return [strat.get_strategy_info() for strat in STRATEGY_REGISTRY.values()]


@router.post("/evaluate", response_model=List[StrategySignal])
def evaluate_strategy_signals(
    req: StrategyEvaluateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    symbol = req.symbol.upper()
    try:
        quote = demo_provider.get_quote(symbol)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found.")

    candles = demo_provider.get_historical_candles(symbol, limit=40)

    # Check owned shares
    portfolio = current_user.portfolio
    owned_quantity = 0
    available_cash = 100.00
    if portfolio:
        pos = db.query(Position).filter(Position.portfolio_id == portfolio.id, Position.symbol == symbol).first()
        owned_quantity = pos.quantity if pos else 0
        available_cash = portfolio.cash_balance

    signals = []
    strategies_to_eval = [STRATEGY_REGISTRY[req.strategy_name]] if req.strategy_name and req.strategy_name in STRATEGY_REGISTRY else list(STRATEGY_REGISTRY.values())

    for strat in strategies_to_eval:
        sig = strat.evaluate(
            quote=quote,
            candles=candles,
            owned_quantity=owned_quantity,
            available_cash=available_cash
        )
        signals.append(sig)

    return signals
