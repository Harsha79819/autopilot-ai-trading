from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class OrderCreate(BaseModel):
    symbol: str = Field(..., description="NSE symbol (e.g. TATAMOTORS, ZOMATO, SUZLON)")
    side: str = Field(..., pattern="^(BUY|SELL)$", description="Order side: BUY or SELL")
    order_type: str = Field("MARKET", pattern="^(MARKET|LIMIT)$")
    quantity: int = Field(..., ge=1, description="Strictly integer whole-shares >= 1")
    price: Optional[float] = Field(None, description="Required for LIMIT orders")
    idempotency_key: Optional[str] = Field(None, description="Unique client key to prevent duplicates")


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    portfolio_id: int
    user_id: int
    idempotency_key: str
    symbol: str
    side: str
    order_type: str
    requested_quantity: int
    filled_quantity: int
    price: float
    executed_price: Optional[float] = None
    status: str
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrderCancelResponse(BaseModel):
    order_id: int
    status: str
    message: str
