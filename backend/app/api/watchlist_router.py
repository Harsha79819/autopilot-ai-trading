"""Watchlists, Price/Risk Alert Rules & In-App Notifications API Router."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user
from backend.app.models.user import User
from backend.app.models.watchlist_alert import WatchlistItem, AlertRule, NotificationLog
from backend.app.market_data import market_provider

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist & Alerts"])


class WatchlistCreate(BaseModel):
    symbol: str
    target_buy_price: Optional[float] = None
    target_sell_price: Optional[float] = None
    notes: Optional[str] = None


class AlertCreate(BaseModel):
    symbol: Optional[str] = None
    alert_type: str  # PRICE_ABOVE, PRICE_BELOW, DAILY_CHANGE_PCT, DRAWDOWN_BREACH
    threshold_value: float


# --- Watchlist Endpoints ---
@router.get("")
def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(WatchlistItem).filter(WatchlistItem.user_id == current_user.id).all()
    symbols = [i.symbol for i in items]
    quotes = market_provider.get_quotes(symbols) if symbols else {}

    results = []
    for item in items:
        quote = quotes.get(item.symbol)
        results.append({
            "id": item.id,
            "symbol": item.symbol,
            "current_price": quote.current_price if quote else 0.0,
            "change_pct": quote.change_pct if quote else 0.0,
            "target_buy_price": item.target_buy_price,
            "target_sell_price": item.target_sell_price,
            "notes": item.notes,
            "created_at": item.created_at.isoformat()
        })
    return results


@router.post("")
def add_to_watchlist(
    req: WatchlistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    symbol = req.symbol.strip().upper()
    existing = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.symbol == symbol
    ).first()
    if existing:
        return {"message": "Symbol already in watchlist", "id": existing.id}

    item = WatchlistItem(
        user_id=current_user.id,
        symbol=symbol,
        target_buy_price=req.target_buy_price,
        target_sell_price=req.target_sell_price,
        notes=req.notes
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"message": f"{symbol} added to watchlist", "id": item.id}


@router.delete("/{symbol}")
def remove_from_watchlist(
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(WatchlistItem).filter(
        WatchlistItem.user_id == current_user.id,
        WatchlistItem.symbol == symbol.strip().upper()
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Symbol not found in watchlist")
    db.delete(item)
    db.commit()
    return {"message": f"{symbol.upper()} removed from watchlist"}


# --- Alerts Endpoints ---
@router.get("/alerts")
def get_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = db.query(AlertRule).filter(AlertRule.user_id == current_user.id).all()
    notifications = db.query(NotificationLog).filter(NotificationLog.user_id == current_user.id).order_by(NotificationLog.created_at.desc()).limit(30).all()

    return {
        "rules": [
            {
                "id": r.id,
                "symbol": r.symbol,
                "alert_type": r.alert_type,
                "threshold_value": r.threshold_value,
                "is_active": r.is_active,
                "triggered_at": r.triggered_at.isoformat() if r.triggered_at else None
            } for r in rules
        ],
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "severity": n.severity,
                "category": n.category,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat()
            } for n in notifications
        ]
    }


@router.post("/alerts")
def create_alert(
    req: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rule = AlertRule(
        user_id=current_user.id,
        symbol=req.symbol.strip().upper() if req.symbol else None,
        alert_type=req.alert_type,
        threshold_value=req.threshold_value
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"message": "Alert rule created", "id": rule.id}


@router.delete("/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rule = db.query(AlertRule).filter(AlertRule.id == alert_id, AlertRule.user_id == current_user.id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Alert rule deleted"}
