"""Continuous Auto-Pilot Trading Runner service with Best-Stock AI Scoring."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, List, Any
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.models.trade import Trade
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.order import OrderCreate
from backend.app.schemas.market import Quote, Candle
from backend.app.market_data import market_provider, candle_aggregator, is_market_session_active
from backend.app.scanner.universe import UNIVERSE_SYMBOLS
from backend.app.strategies import STRATEGY_REGISTRY
from backend.app.strategies.cost_gate import cost_aware_gate
from backend.app.paper_engine import paper_broker, portfolio_ledger
from backend.app.risk import risk_manager, kill_switch_manager
from backend.app.config import settings

logger = logging.getLogger("autopilot.runner")


class AutoPilotRunner:
    """
    Continuously advances market ticks, ranks eligible stocks by AI Opportunity Score,
    and automatically executes simulated BUY/SELL orders without manual intervention.
    """

    def __init__(self):
        self._is_running = False
        self.autopilot_enabled = True  # Can be toggled on/off
        self._task: Optional[asyncio.Task] = None
        self._listeners: Set[asyncio.Queue] = set()

        # Track entry timestamps and price targets per symbol to avoid rapid churning
        self._position_targets: Dict[str, Dict[str, float]] = {}  # symbol -> {entry, take_profit, stop_loss}
        self._position_entry_times: Dict[str, datetime] = {}
        self._last_ai_status: Dict[str, Any] = {
            "status": "INITIALIZING",
            "message": "AI AutoPilot is initializing market feed...",
            "best_stock": None,
            "best_score": 0,
            "active_positions_count": 0,
            "autopilot_enabled": True,
            "updated_at": datetime.utcnow().isoformat()
        }

    def register_listener(self, queue: asyncio.Queue):
        self._listeners.add(queue)

    def unregister_listener(self, queue: asyncio.Queue):
        self._listeners.discard(queue)

    async def broadcast(self, message: dict):
        for q in list(self._listeners):
            try:
                await q.put(message)
            except Exception:
                pass

    async def broadcast_ai_status_if_changed(self, new_status: dict):
        core_keys = ["status", "message", "best_stock", "best_score", "active_positions_count", "autopilot_enabled", "target_profit", "stop_loss"]
        changed = any(new_status.get(k) != self._last_ai_status.get(k) for k in core_keys)
        self._last_ai_status = new_status
        if changed and self._listeners:
            await self.broadcast({"type": "AI_STATUS", **self._last_ai_status})

    def get_ai_status(self) -> dict:
        return self._last_ai_status

    def set_autopilot_enabled(self, enabled: bool) -> bool:
        self.autopilot_enabled = enabled
        self._last_ai_status["autopilot_enabled"] = enabled
        self._last_ai_status["message"] = (
            "AI AutoPilot Active: Scanning for best stocks..."
            if enabled
            else "AI AutoPilot PAUSED by user."
        )
        return self.autopilot_enabled

    def reset_state(self):
        """Reset internal positions tracking and status after portfolio reset."""
        self._position_targets.clear()
        self._position_entry_times.clear()
        self._last_ai_status = {
            "status": "SCANNING",
            "message": "AI AutoPilot reset. Scanning universe for best stocks...",
            "best_stock": None,
            "best_score": 0,
            "active_positions_count": 0,
            "target_profit": None,
            "stop_loss": None,
            "autopilot_enabled": self.autopilot_enabled,
            "updated_at": datetime.utcnow().isoformat()
        }

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info("AutoPilot Runner background loop started.")

    def stop(self):
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("AutoPilot Runner background loop stopped.")

    def _score_opportunity(self, quote: Quote, candles: List[Candle]) -> float:
        """
        Calculate quantitative AI Score (0-100) based on momentum, RSI, volume surge, and trend.
        Higher score = better probability of clearing transaction friction.
        """
        if len(candles) < 20:
            return 50.0

        closes = [c.close for c in candles]
        volumes = [c.volume for c in candles]

        # 1. RSI (14)
        gains = [max(closes[i] - closes[i - 1], 0) for i in range(1, len(closes))]
        losses = [max(closes[i - 1] - closes[i], 0) for i in range(1, len(closes))]
        avg_g = sum(gains[-14:]) / 14.0
        avg_l = sum(losses[-14:]) / 14.0
        rs = avg_g / avg_l if avg_l > 0 else 1.0
        rsi = 100.0 - (100.0 / (1.0 + rs))

        # 2. Short vs Medium Moving Average (SMA 5 vs SMA 20)
        sma5 = sum(closes[-5:]) / 5.0
        sma20 = sum(closes[-20:]) / 20.0

        # 3. Volume expansion
        avg_vol = sum(volumes[-20:]) / 20.0
        vol_ratio = (volumes[-1] / avg_vol) if avg_vol > 0 else 1.0

        # 4. Momentum (% change from day open)
        momentum = quote.change_pct

        score = 50.0

        # RSI Evaluation
        if 25 <= rsi <= 40:
            score += 20.0  # Oversold bounce candidate
        elif 45 <= rsi <= 62:
            score += 15.0  # Steady bullish continuation
        elif rsi > 70:
            score -= 10.0  # Overbought penalty

        # Trend alignment (SMA5 > SMA20)
        if sma5 > sma20:
            score += 15.0

        # Volume expansion
        if vol_ratio >= 1.2:
            score += 15.0
        elif vol_ratio >= 1.0:
            score += 5.0

        # Positive intraday drift
        if momentum > 0:
            score += min(momentum * 6.0, 15.0)
        elif momentum < -2.0:
            score -= 10.0

        return min(max(round(score, 1), 0.0), 100.0)

    async def run_single_cycle(self):
        """Execute one complete cycle of tick advancement, AI scoring, and trade execution."""
        now = datetime.utcnow()

        # 1. Check IST market session gate (09:15 to 15:30 IST Mon-Fri) at the TOP
        is_open, session_msg = is_market_session_active()
        if not is_open and settings.MARKET_HOURS_GATE_ENABLED:
            new_status = {
                "status": "MARKET_CLOSED",
                "message": session_msg,
                "best_stock": None,
                "best_score": 0,
                "active_positions_count": self._last_ai_status.get("active_positions_count", 0),
                "autopilot_enabled": self.autopilot_enabled,
                "updated_at": now.isoformat()
            }
            await self.broadcast_ai_status_if_changed(new_status)
            return 30.0  # Conserve CPU and prevent heating when market is closed

        if not self.autopilot_enabled:
            new_status = {
                "status": "PAUSED",
                "message": "AI AutoPilot is PAUSED by user.",
                "best_stock": None,
                "best_score": 0,
                "active_positions_count": self._last_ai_status.get("active_positions_count", 0),
                "autopilot_enabled": False,
                "updated_at": now.isoformat()
            }
            await self.broadcast_ai_status_if_changed(new_status)
            return 10.0

        # 2. Advance ticks for all active universe symbols
        latest_quotes: Dict[str, Quote] = {}
        for symbol in UNIVERSE_SYMBOLS:
            tick = market_provider.generate_next_tick(symbol)
            candle_aggregator.process_tick(tick)
            latest_quotes[symbol] = market_provider.get_quote(symbol)

        # Broadcast tick feed to WebSocket subscribers ONLY if at least one client is registered
        if self._listeners:
            await self.broadcast({
                "type": "TICK_UPDATE",
                "quotes": [q.model_dump(mode="json") for q in latest_quotes.values()],
                "timestamp": now.isoformat()
            })

        # 2. Evaluate User Portfolio & Execute AI Auto-Trading
        db = SessionLocal()
        try:
            users = db.query(User).filter(User.is_active == True).all()
            for user in users:
                portfolio = user.portfolio
                if not portfolio:
                    continue

                # Skip if kill-switch is active
                if kill_switch_manager.is_stopped(portfolio):
                    self._last_ai_status["status"] = "HALTED"
                    self._last_ai_status["message"] = "Emergency Kill Switch is ACTIVE. Auto-trading halted."
                    await self.broadcast_ai_status_if_changed(self._last_ai_status)
                    continue

                # A. Check existing positions for Target Profit or Stop Loss
                positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
                for pos in positions:
                    quote = latest_quotes.get(pos.symbol)
                    if not quote:
                        continue

                    entry_info = self._position_targets.get(pos.symbol, {
                        "entry": pos.average_buy_price,
                        "take_profit": round(pos.average_buy_price * 1.022, 2),  # +2.2% target
                        "stop_loss": round(pos.average_buy_price * 0.985, 2)      # -1.5% stop loss
                    })

                    cur_price = quote.current_price
                    entry_time = self._position_entry_times.get(pos.symbol, now - timedelta(seconds=60))
                    holding_seconds = (now - entry_time).total_seconds()

                    # Enforce minimum holding cooldown of 10 seconds to avoid tick jitter,
                    # unless stop loss is pierced
                    hit_take_profit = cur_price >= entry_info["take_profit"] and holding_seconds >= 10
                    hit_stop_loss = cur_price <= entry_info["stop_loss"]

                    if hit_take_profit or hit_stop_loss:
                        reason = "Take-Profit Target Hit (+2.2%)" if hit_take_profit else "Stop-Loss Protection Hit (-1.5%)"
                        order_in = OrderCreate(
                            symbol=pos.symbol,
                            side="SELL",
                            order_type="MARKET",
                            quantity=pos.quantity,
                            price=cur_price
                        )
                        paper_broker.execute_paper_order(
                            db=db,
                            user=user,
                            order_in=order_in,
                            quote=quote,
                            risk_manager=risk_manager
                        )
                        self._position_targets.pop(pos.symbol, None)
                        self._position_entry_times.pop(pos.symbol, None)
                        logger.info(f"AutoPilot SELL {pos.symbol}: {reason}")
                        self._last_ai_status = {
                            "status": "SCANNING",
                            "message": f"Auto-Sold {pos.symbol} @ ₹{cur_price:.2f} ({reason}). Scanning for next opportunity...",
                            "best_stock": None,
                            "best_score": 0,
                            "active_positions_count": 0,
                            "target_profit": None,
                            "stop_loss": None,
                            "autopilot_enabled": True,
                            "updated_at": now.isoformat()
                        }
                        break

                # Re-query positions after potential sell
                positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()

                # B. Multi-Position Capital Deployment: If cash is available, invest in the best affordable stocks until cash is utilized
                held_symbols = {p.symbol for p in positions}

                # If available cash can afford at least 1 whole share (~₹12.00) and we have room for positions (up to 6)
                if portfolio.cash_balance >= 12.00 and len(positions) < 6:
                    affordable_symbols = [
                        sym for sym, q in latest_quotes.items()
                        if sym not in held_symbols and (q.current_price * 1.005) <= portfolio.cash_balance
                    ]

                    best_candidate = None
                    highest_score = -1.0

                    for sym in affordable_symbols:
                        q = latest_quotes[sym]
                        candles = market_provider.get_historical_candles(sym, limit=30)
                        score = self._score_opportunity(q, candles)

                        # Evaluate Cost-Aware Gate
                        gate_res = cost_aware_gate.evaluate(q, expected_move_pct=2.2)

                        if gate_res.passed and score > highest_score and score >= 55.0:
                            highest_score = score
                            best_candidate = (sym, q, score)

                    if best_candidate:
                        best_sym, best_quote, score = best_candidate
                        # Determine quantity (whole shares affordable with statutory fee and slippage buffer)
                        unit_cost_est = best_quote.current_price * 1.005
                        qty = int(portfolio.cash_balance // unit_cost_est)
                        if qty < 1 and portfolio.cash_balance >= (best_quote.current_price * 1.002):
                            qty = 1

                        if qty >= 1:
                            order_in = OrderCreate(
                                symbol=best_sym,
                                side="BUY",
                                order_type="MARKET",
                                quantity=qty,
                                price=best_quote.current_price
                            )

                            res = paper_broker.execute_paper_order(
                                db=db,
                                user=user,
                                order_in=order_in,
                                quote=best_quote,
                                risk_manager=risk_manager
                            )

                            if res.status == "FILLED":
                                fill_price = res.executed_price or best_quote.current_price
                                tp = round(fill_price * 1.022, 2)
                                sl = round(fill_price * 0.985, 2)
                                self._position_targets[best_sym] = {
                                    "entry": fill_price,
                                    "take_profit": tp,
                                    "stop_loss": sl
                                }
                                self._position_entry_times[best_sym] = now
                                msg = (
                                    f"AI Auto-Bought {qty} sh {best_sym} @ ₹{fill_price:.2f} (Score {score}/100). "
                                    f"Target: ₹{tp:.2f} (+2.2%) | Stop: ₹{sl:.2f} (-1.5%)"
                                )
                                self._last_ai_status = {
                                    "status": "HOLDING",
                                    "message": msg,
                                    "best_stock": best_sym,
                                    "best_score": score,
                                    "active_positions_count": len(positions) + 1,
                                    "target_profit": tp,
                                    "stop_loss": sl,
                                    "autopilot_enabled": True,
                                    "updated_at": now.isoformat()
                                }
                                logger.info(msg)
                            else:
                                rejection_msg = res.rejection_reason or "Order could not be filled."
                                self._last_ai_status = {
                                    "status": "HALTED" if "halted" in rejection_msg.lower() else "SCANNING",
                                    "message": f"AI Candidate {best_sym}: {rejection_msg}",
                                    "best_stock": best_sym,
                                    "best_score": score,
                                    "active_positions_count": len(positions),
                                    "target_profit": None,
                                    "stop_loss": None,
                                    "autopilot_enabled": True,
                                    "updated_at": now.isoformat()
                                }
                                logger.warning(f"AutoPilot BUY rejected for {best_sym}: {rejection_msg}")
                    else:
                        if len(positions) == 0:
                            self._last_ai_status = {
                                "status": "SCANNING",
                                "message": f"AI Scanning {len(UNIVERSE_SYMBOLS)} NSE stocks. Cash: ₹{portfolio.cash_balance:.2f}. Highest Score: {max(highest_score, 0):.1f}/100.",
                                "best_stock": None,
                                "best_score": highest_score if highest_score > 0 else 0,
                                "active_positions_count": 0,
                                "target_profit": None,
                                "stop_loss": None,
                                "autopilot_enabled": True,
                                "updated_at": now.isoformat()
                            }
                        else:
                            pos_summary = ", ".join([f"{p.symbol} ({p.quantity}sh)" for p in positions])
                            self._last_ai_status = {
                                "status": "HOLDING",
                                "message": f"AI Holding {len(positions)} positions ({pos_summary}). Cash: ₹{portfolio.cash_balance:.2f}. Auto-selling on +2.2% target.",
                                "best_stock": positions[0].symbol,
                                "best_score": 85,
                                "active_positions_count": len(positions),
                                "target_profit": self._position_targets.get(positions[0].symbol, {}).get("take_profit"),
                                "stop_loss": self._position_targets.get(positions[0].symbol, {}).get("stop_loss"),
                                "autopilot_enabled": True,
                                "updated_at": now.isoformat()
                            }

                elif len(positions) > 0:
                    pos_summary = ", ".join([f"{p.symbol} ({p.quantity}sh)" for p in positions])
                    first_pos = positions[0]
                    first_targets = self._position_targets.get(first_pos.symbol, {})
                    tp = first_targets.get("take_profit", round(first_pos.average_buy_price * 1.022, 2))
                    sl = first_targets.get("stop_loss", round(first_pos.average_buy_price * 0.985, 2))

                    self._last_ai_status = {
                        "status": "HOLDING",
                        "message": f"AI Fully Invested ({len(positions)} positions: {pos_summary}). Cash: ₹{portfolio.cash_balance:.2f}. Monitoring +2.2% profit targets.",
                        "best_stock": first_pos.symbol,
                        "best_score": 85,
                        "active_positions_count": len(positions),
                        "target_profit": tp,
                        "stop_loss": sl,
                        "autopilot_enabled": True,
                        "updated_at": now.isoformat()
                    }

                # Compute and broadcast portfolio updates
                metrics = portfolio_ledger.calculate_metrics(
                    db,
                    portfolio,
                    latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
                )

                await self.broadcast({
                    "type": "PORTFOLIO_UPDATE",
                    "user_id": user.id,
                    "metrics": metrics.model_dump(mode="json"),
                    "cash_balance": portfolio.cash_balance,
                    "total_portfolio_value": metrics.total_portfolio_value
                })

                await self.broadcast_ai_status_if_changed(self._last_ai_status)

        finally:
            db.close()

    async def _run_loop(self):
        while self._is_running:
            delay = settings.AUTOPILOT_INTERVAL_SECONDS
            try:
                cycle_delay = await self.run_single_cycle()
                if cycle_delay and isinstance(cycle_delay, (int, float)):
                    delay = cycle_delay
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in AutoPilot runner loop: {e}", exc_info=True)

            await asyncio.sleep(delay)


autopilot_runner = AutoPilotRunner()
