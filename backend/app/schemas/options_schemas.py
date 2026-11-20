"""Pydantic schemas for Options Trading Desk."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class OptionGreeksInfo(BaseModel):
    symbol: str
    ltp: float
    iv: float
    delta: float
    theta: float
    oi: int
    lot_size: int
    margin_required: float


class OptionStrikeItem(BaseModel):
    strike: int
    is_atm: bool
    ce: OptionGreeksInfo
    pe: OptionGreeksInfo


class OptionChainResponse(BaseModel):
    underlying: str
    spot_price: float
    change_pct: float
    expiry_date: str
    lot_size: int
    atm_strike: int
    strikes: List[OptionStrikeItem]
    server_time_ist: str


class OptionOrderRequest(BaseModel):
    symbol: str = Field(..., description="e.g. NIFTY24150CE or RELIANCE1280CE")
    underlying: str = Field(default="NIFTY", description="Underlying symbol e.g. NIFTY, RELIANCE, INFY")
    strike_price: float = Field(..., description="Strike price e.g. 24150")
    option_type: str = Field(..., description="'CE' or 'PE'")
    expiry_date: str = Field(..., description="e.g. 21-NOV-2024")
    quantity: int = Field(default=25, description="Lot size quantity")


class OptionPositionSchema(BaseModel):
    id: int
    symbol: str
    underlying: str
    strike_price: float
    option_type: str
    strategy_type: Optional[str] = "NAKED"
    paired_strike: Optional[float] = None
    net_debit: Optional[float] = None
    expiry_date: str
    lot_size: int
    quantity: int
    entry_premium: float
    current_premium: float
    stop_loss_premium: float
    target_premium: float
    trailing_stop_premium: float
    trailing_activated: bool
    is_open: bool
    unrealized_pnl: float
    unrealized_pnl_pct: float
    invested_margin: float
    created_at: datetime


class OptionTradeSchema(BaseModel):
    id: int
    symbol: str
    underlying: str
    strike_price: float
    option_type: str
    expiry_date: str
    lot_size: int
    quantity: int
    entry_premium: float
    exit_premium: float
    realized_pnl: float
    return_pct: float
    fees: float
    entry_time: datetime
    exit_time: datetime
    exit_reason: str
    trade_notes: Optional[str] = ""


class OptionsPortfolioResponse(BaseModel):
    initial_capital: float
    cash_balance: float
    realized_pnl: float
    total_fees: float
    peak_equity: float
    current_equity: float
    unrealized_pnl: float
    total_portfolio_value: float
    is_autopilot_enabled: bool
    whatsapp_phone: Optional[str] = ""
    whatsapp_alerts_enabled: Optional[bool] = True
    broker_name: Optional[str] = "PAPER"
    broker_client_code: Optional[str] = ""
    is_live_broker_routing: Optional[bool] = False
    open_positions: List[OptionPositionSchema]
    recent_trades: List[OptionTradeSchema]
    win_rate_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int


class OptionsComparisonResponse(BaseModel):
    equity: Dict[str, Any]
    options: Dict[str, Any]
    ai_insight_telugu: str


class AISignalResponse(BaseModel):
    underlying: str = "NIFTY"
    spot_price: float
    change_pct: float
    bias: str
    confidence_pct: float
    recommended_strike: int
    recommended_type: str
    recommended_symbol: Optional[str] = None
    reason: str


class UnderlyingInfoSchema(BaseModel):
    symbol: str
    name: str
    type: str  # "INDEX" | "STOCK"
    spot_price: float
    change_pct: float
    lot_size: int
    strike_step: int


# -------------------------------------------------------------
# New Advanced Feature Schemas
# -------------------------------------------------------------

class PCRMaxPainResponse(BaseModel):
    underlying: str
    spot_price: float
    pcr: float
    pcr_sentiment: str
    max_pain_strike: int
    total_ce_oi: int
    total_pe_oi: int
    pain_levels: List[Dict[str, Any]]
    ai_interpretation: str
    ai_interpretation_telugu: str


class SpreadOrderRequest(BaseModel):
    underlying: str = Field(default="NIFTY", description="Underlying symbol e.g. NIFTY, BANKNIFTY, RELIANCE")
    spread_type: str = Field(default="BULL_CALL_SPREAD", description="'BULL_CALL_SPREAD' or 'BEAR_PUT_SPREAD'")
    quantity: Optional[int] = Field(default=None, description="Optional custom quantity (defaults to lot size)")


class WhatsAppConfigSchema(BaseModel):
    phone: str = Field(..., description="Mobile number with or without country code e.g. 9876543210")
    alerts_enabled: bool = Field(default=True, description="Enable or disable WhatsApp trade alerts")
    phone_number_id: Optional[str] = Field(default="", description="Meta WhatsApp Phone Number ID (optional for Cloud API)")
    access_token: Optional[str] = Field(default="", description="Meta WhatsApp Access Token (optional for Cloud API)")
    api_key: Optional[str] = Field(default="", description="CallMeBot Free Direct WhatsApp API Key")


class WhatsAppTestRequest(BaseModel):
    phone: str = Field(..., description="Mobile number to receive test alert")
    custom_message: Optional[str] = None


class BrokerConfigSchema(BaseModel):
    broker_name: str = Field(default="PAPER", description="'PAPER', 'ZERODHA', 'ANGEL_ONE', 'DHAN'")
    broker_api_key: Optional[str] = Field(default="", description="Broker API Key or Application Key")
    broker_client_code: Optional[str] = Field(default="", description="Broker Client ID or User Code")
    is_live_broker_routing: bool = Field(default=False, description="Whether to route orders live to Demat")


class ChallengeResponse(BaseModel):
    initial_capital: float
    current_equity: float
    target_capital: float
    progress_pct: float
    roi_pct: float
    days_active: int
    total_trades: int
    win_rate_pct: float
    current_stage_name: str
    current_stage_level: int
    stages: List[Dict[str, Any]]
    badges: List[Dict[str, Any]]
    daily_advice_en: str
    daily_advice_telugu: str


class TradeReplayStep(BaseModel):
    step_index: int
    time_offset_min: int
    spot_price: float
    option_premium: float
    trailing_stop: float
    unrealized_pnl: float
    pnl_pct: float
    event_note: Optional[str] = ""


class TradeReplayResponse(BaseModel):
    trade_id: int
    symbol: str
    underlying: str
    option_type: str
    strike_price: float
    entry_premium: float
    exit_premium: float
    realized_pnl: float
    return_pct: float
    exit_reason: str
    entry_time: datetime
    exit_time: datetime
    trajectory: List[TradeReplayStep]
    post_mortem_en: str
    post_mortem_telugu: str


class TransferFundsSchema(BaseModel):
    amount: float = Field(..., gt=0, description="Amount in INR to transfer, e.g. 100000.0")
    from_desk: str = Field(default="OPTIONS", description="'OPTIONS', 'VAULT', or 'EQUITY'")
    to_desk: Optional[str] = Field(default="VAULT", description="'VAULT', 'OPTIONS', or 'EQUITY'")
    pin: Optional[str] = Field(default=None, description="Vault Security Key / Password")
    note: Optional[str] = Field(default="Profit Vault Transfer", description="Reason or note for transfer")


class VaultPinUpdateSchema(BaseModel):
    current_pin: str = Field(..., description="Current 4-digit PIN")
    new_pin: str = Field(..., min_length=4, max_length=20, description="New 4-digit PIN")


class TransferFundsResponse(BaseModel):
    success: bool
    transferred_amount: float
    from_desk: str
    to_desk: str
    options_cash_balance: float
    equity_cash_balance: float
    vault_balance: Optional[float] = 0.0
    message: str
    timestamp: str


