"""Market Scanner API Router."""
from fastapi import APIRouter, Depends, Query
from backend.app.schemas.scanner import ScannerResponse
from backend.app.scanner.scanner_service import market_scanner
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User

router = APIRouter(prefix="/api/scanner", tags=["Market Scanner"])


@router.get("/opportunities", response_model=ScannerResponse)
def scan_opportunities(
    cash_override: float = Query(None, ge=1.0, description="Optional cash amount to simulate scan for"),
    current_user: User = Depends(get_current_user)
):
    portfolio = current_user.portfolio
    available_cash = cash_override if cash_override is not None else (portfolio.cash_balance if portfolio else 100.00)
    return market_scanner.scan_market(available_cash=available_cash)
