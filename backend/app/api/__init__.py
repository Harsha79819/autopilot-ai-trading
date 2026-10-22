"""API Routers package exports."""
from backend.app.api.auth_router import router as auth_router
from backend.app.api.portfolio_router import router as portfolio_router
from backend.app.api.market_router import router as market_router
from backend.app.api.scanner_router import router as scanner_router
from backend.app.api.strategy_router import router as strategy_router
from backend.app.api.order_router import router as order_router
from backend.app.api.risk_router import router as risk_router
from backend.app.api.backtest_router import router as backtest_router
from backend.app.api.websocket_router import router as websocket_router
from backend.app.api.autopilot_router import router as autopilot_router
from backend.app.api.ai_chat_router import router as ai_chat_router

__all__ = [
    "auth_router",
    "portfolio_router",
    "market_router",
    "scanner_router",
    "strategy_router",
    "order_router",
    "risk_router",
    "backtest_router",
    "websocket_router",
    "autopilot_router",
    "ai_chat_router",
]
