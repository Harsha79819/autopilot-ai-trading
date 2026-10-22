"""Order execution and lifecycle API Router."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.order import Order
from backend.app.schemas.order import OrderCreate, OrderResponse
from backend.app.auth.dependencies import get_current_user
from backend.app.paper_engine import paper_broker
from backend.app.market_data import demo_provider
from backend.app.risk import risk_manager

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_paper_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    symbol = order_in.symbol.upper()
    try:
        quote = demo_provider.get_quote(symbol)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not recognized.")

    order_in.symbol = symbol

    res = paper_broker.execute_paper_order(
        db=db,
        user=current_user,
        order_in=order_in,
        quote=quote,
        risk_manager=risk_manager
    )
    return res


@router.get("", response_model=List[OrderResponse])
def list_orders(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = current_user.portfolio
    if not portfolio:
        return []
    orders = db.query(Order).filter(Order.portfolio_id == portfolio.id).order_by(Order.created_at.desc()).limit(50).all()
    return [OrderResponse.model_validate(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found.")
    order = db.query(Order).filter(Order.id == order_id, Order.portfolio_id == portfolio.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    return OrderResponse.model_validate(order)
