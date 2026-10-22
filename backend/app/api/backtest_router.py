"""Backtesting API Router."""
from fastapi import APIRouter, HTTPException, Depends
from backend.app.schemas.backtest import BacktestRequest, BacktestResponse
from backend.app.backtesting.engine import backtesting_engine
from backend.app.models.user import User
from backend.app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/backtest", tags=["Backtesting"])


@router.post("/run", response_model=BacktestResponse)
def run_backtest(
    req: BacktestRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        return backtesting_engine.run_backtest(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest execution error: {str(e)}")
