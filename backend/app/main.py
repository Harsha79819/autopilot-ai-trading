"""AutoPilot AI Trading Platform - Main FastAPI Application."""
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db, SessionLocal
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.audit_log import AuditLog
from backend.app.auth.security import get_password_hash
from backend.app.services.auto_trader import autopilot_runner
from backend.app.api import (
    auth_router,
    portfolio_router,
    market_router,
    scanner_router,
    strategy_router,
    order_router,
    risk_router,
    backtest_router,
    websocket_router,
    autopilot_router,
    ai_chat_router
)
from backend.app.api.journal_router import router as journal_router
from backend.app.api.planner_router import router as planner_router
from backend.app.api.watchlist_router import router as watchlist_router
from backend.app.api.research_router import router as research_router
from backend.app.api.scenario_router import router as scenario_router
from backend.app.api.document_router import router as document_router
from backend.app.api.reports_router import router as reports_router
from backend.app.api.orderblock_router import router as orderblock_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("autopilot.main")

# ARCHITECTURAL SAFETY ASSERTION: Real live trading is disabled in this platform version.
assert settings.STRICT_PAPER_TRADING_ONLY is True, "CRITICAL ERROR: Live trading is prohibited in this version."


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle manager."""
    logger.info("Initializing AutoPilot AI Trading Platform...")
    # Initialize DB tables
    init_db()

    # Seed default demo user for paper trading mode
    if settings.STRICT_PAPER_TRADING_ONLY:
        db = SessionLocal()
        try:
            demo_user = db.query(User).filter(User.email == "demo@autopilot.ai").first()
            if not demo_user:
                demo_user = User(
                    email="demo@autopilot.ai",
                    hashed_password=get_password_hash("demo1234"),
                    full_name="Paper Trader Demo",
                    is_active=True
                )
                db.add(demo_user)
                db.flush()

            if not demo_user.portfolio:
                portfolio = Portfolio(
                    user_id=demo_user.id,
                    initial_cash=settings.INITIAL_VIRTUAL_CAPITAL_INR,
                    cash_balance=settings.INITIAL_VIRTUAL_CAPITAL_INR,
                    realized_pnl=0.0,
                    total_fees_paid=0.0,
                    peak_portfolio_value=settings.INITIAL_VIRTUAL_CAPITAL_INR,
                    is_kill_switched=False
                )
                db.add(portfolio)
                db.add(AuditLog(
                    user_id=demo_user.id,
                    event_type="ACCOUNT_INITIALIZATION",
                    symbol="INR",
                    decision="SEEDED",
                    reason=f"Initialized paper trading capital of ₹{settings.INITIAL_VIRTUAL_CAPITAL_INR:.2f}",
                    timestamp=datetime.utcnow()
                ))
                db.commit()
                logger.info(f"Default demo user initialized with virtual cash: INR {settings.INITIAL_VIRTUAL_CAPITAL_INR:.2f}")
        finally:
            db.close()

    # Start continuous background auto-pilot runner
    if settings.AUTOPILOT_RUNNER_ENABLED:
        autopilot_runner.start()

    yield

    # Shutdown
    autopilot_runner.stop()
    logger.info("AutoPilot AI Trading Platform shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Mobile-Responsive AI-Assisted Stock Market Analysis & Automated Paper Trading Platform",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.cors_origins_list
if "*" not in origins and settings.DEBUG:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router)
app.include_router(portfolio_router)
app.include_router(market_router)
app.include_router(scanner_router)
app.include_router(strategy_router)
app.include_router(order_router)
app.include_router(risk_router)
app.include_router(backtest_router)
app.include_router(websocket_router)
app.include_router(autopilot_router)
app.include_router(ai_chat_router)
app.include_router(journal_router)
app.include_router(planner_router)
app.include_router(watchlist_router)
app.include_router(research_router)
app.include_router(scenario_router)
app.include_router(document_router)
app.include_router(reports_router)
app.include_router(orderblock_router, prefix="/api/v1")


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    from backend.app.market_data import market_provider
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "paper_trading_mode": True,
        "live_trading_enabled": False,
        "data_provider": market_provider.get_provider_name(),
        "is_realtime": market_provider.is_realtime,
        "data_delay_seconds": market_provider.data_delay_seconds,
        "initial_capital_inr": settings.INITIAL_VIRTUAL_CAPITAL_INR,
        "intraday_only": settings.INTRADAY_ONLY,
        "kill_switch_closes_positions": settings.KILL_SWITCH_CLOSES_POSITIONS
    }

# Production Unified SPA Static File Server
_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(_frontend_dist):
    assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"])
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = os.path.join(_frontend_dist, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
