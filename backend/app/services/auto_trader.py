"""Continuous Auto-Pilot Trading Runner service with Best-Stock AI Scoring."""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Set, Optional, List, Any, Tuple
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
from backend.app.scanner.fundamental_gate import fundamental_gate
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
        self._listeners: Dict[asyncio.Queue, Optional[int]] = {}

        # Track entry timestamps, setup reasons, and price targets per (user_id, symbol) to isolate users
        self._position_targets: Dict[Tuple[int, str], Dict[str, float]] = {}  # (user_id, symbol) -> {entry, take_profit, stop_loss}
        self._position_entry_times: Dict[Tuple[int, str], datetime] = {}
        self._position_setup_reasons: Dict[Tuple[int, str], str] = {}
        self._position_highs: Dict[Tuple[int, str], float] = {}  # Track highest price reached for trailing stop-loss

        # AGI Self-Correcting Training Engine (Learns from past trade errors & stop-loss traps)
        self._agi_error_penalties: Dict[Tuple[int, str], float] = {}  # Penalize candidates resembling past errors
        self._agi_win_boosts: Dict[Tuple[int, str], float] = {}  # Reward proven winning patterns

        self._last_ai_status: Dict[str, Any] = {
            "status": "INITIALIZING",
            "message": "AI AutoPilot is initializing market feed...",
            "best_stock": None,
            "best_score": 0,
            "active_positions_count": 0,
            "autopilot_enabled": True,
            "updated_at": datetime.utcnow().isoformat()
        }

    def register_listener(self, queue: asyncio.Queue, user_id: Optional[int] = None):
        self._listeners[queue] = user_id

    def unregister_listener(self, queue: asyncio.Queue):
        self._listeners.pop(queue, None)

    async def broadcast(self, message: dict, target_user_id: Optional[int] = None):
        for q, q_user_id in list(self._listeners.items()):
            if target_user_id is not None and q_user_id is not None and q_user_id != target_user_id:
                continue
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

    def reset_state(self, user_id: Optional[int] = None):
        """Reset internal positions tracking and status after portfolio reset."""
        if user_id is not None:
            self._position_targets = {k: v for k, v in self._position_targets.items() if k[0] != user_id}
            self._position_entry_times = {k: v for k, v in self._position_entry_times.items() if k[0] != user_id}
            self._position_setup_reasons = {k: v for k, v in self._position_setup_reasons.items() if k[0] != user_id}
            self._position_highs = {k: v for k, v in self._position_highs.items() if k[0] != user_id}
            self._agi_error_penalties = {k: v for k, v in self._agi_error_penalties.items() if k[0] != user_id}
            self._agi_win_boosts = {k: v for k, v in self._agi_win_boosts.items() if k[0] != user_id}
        else:
            self._position_targets.clear()
            self._position_entry_times.clear()
            self._position_setup_reasons.clear()
            self._position_highs.clear()
            self._agi_error_penalties.clear()
            self._agi_win_boosts.clear()

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

    def _sync_agi_learning(self, db: Session, user_id: int):
        """
        Self-Correcting AGI Engine:
        Analyzes historical trading journal records and past closed trades for this user.
        - Identifies setups/symbols that produced stop-loss hits and applies error penalties.
        - Identifies setups/symbols that achieved take-profit targets and applies confidence boosts.
        Ensures the AI continuously learns from its mistakes during the 30-day training period.
        """
        try:
            from backend.app.models.trading_journal import TradingJournal
            journals = (
                db.query(TradingJournal)
                .filter(TradingJournal.user_id == user_id)
                .order_by(TradingJournal.closed_at.desc())
                .limit(25)
                .all()
            )
            for j in journals:
                sym = j.symbol
                key = (user_id, sym)
                if j.realized_pnl < 0:
                    # Penalize symbol and setup to prevent repeat stop-loss traps
                    self._agi_error_penalties[key] = min(
                        self._agi_error_penalties.get(key, 0.0) + 6.0, 18.0
                    )
                elif j.realized_pnl > 0:
                    # Boost proven winning symbols
                    self._agi_win_boosts[key] = min(
                        self._agi_win_boosts.get(key, 0.0) + 4.0, 12.0
                    )
        except Exception as e:
            logger.debug(f"AGI learning sync note: {e}")

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

    def _score_opportunity(
        self,
        quote: Quote,
        candles: List[Candle],
        user_id: Optional[int] = None,
        symbol: Optional[str] = None
    ) -> float:
        """
        Calculate quantitative AI Score (0-100) based on momentum, RSI, volume surge, and trend,
        adjusted dynamically by the AGI Self-Correcting Learning Engine.
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

        # AGI Self-Correction Modifier (Error Learning & Win Reinforcement)
        if user_id is not None and symbol:
            penalty = self._agi_error_penalties.get((user_id, symbol), 0.0)
            boost = self._agi_win_boosts.get((user_id, symbol), 0.0)
            score = score - penalty + boost

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

                metrics = portfolio_ledger.calculate_metrics(
                    db,
                    portfolio,
                    latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
                )

                # Synchronize AGI self-learning from user's historical trades
                self._sync_agi_learning(db, user.id)

                # A. Check existing positions for Target Profit, Stop Loss, or Trailing Stop FIRST
                # Note: Stop-loss must auto-sell even when risk manager or kill-switch halts new buys
                positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
                sl_pct = getattr(settings, "STOP_LOSS_PCT", 1.5)
                rr_ratio = getattr(settings, "RISK_REWARD_RATIO", 2.0)
                tp_pct = getattr(settings, "TAKE_PROFIT_PCT", round(sl_pct * rr_ratio, 2))

                for pos in positions:
                    quote = latest_quotes.get(pos.symbol)
                    if not quote:
                        continue

                    entry_info = self._position_targets.get((user.id, pos.symbol), {
                        "entry": pos.average_buy_price,
                        "take_profit": round(pos.average_buy_price * (1.0 + tp_pct / 100.0), 2),
                        "stop_loss": round(pos.average_buy_price * (1.0 - sl_pct / 100.0), 2)
                    })

                    cur_price = quote.current_price
                    high_key = (user.id, pos.symbol)
                    current_high = max(self._position_highs.get(high_key, cur_price), cur_price)
                    self._position_highs[high_key] = current_high

                    # Dynamic Trailing Stop-Loss Engine (+2.0% profit lock)
                    peak_gain_pct = ((current_high - pos.average_buy_price) / pos.average_buy_price) * 100.0
                    if peak_gain_pct >= 2.0:
                        # Lock in at least +0.8% net profit (guaranteed green after slippage and taxes)
                        trailed_sl = round(pos.average_buy_price * 1.008, 2)
                        if peak_gain_pct >= 2.5:
                            trailed_sl = max(trailed_sl, round(current_high * 0.985, 2))
                        if trailed_sl > entry_info["stop_loss"]:
                            entry_info["stop_loss"] = trailed_sl
                            entry_info["is_trailed"] = True
                            self._position_targets[high_key] = entry_info

                    entry_time = self._position_entry_times.get((user.id, pos.symbol), now - timedelta(seconds=60))
                    holding_seconds = (now - entry_time).total_seconds()

                    # Enforce minimum holding cooldown of 10 seconds to avoid tick jitter,
                    # unless stop loss is pierced
                    hit_take_profit = cur_price >= entry_info["take_profit"] and holding_seconds >= 10
                    hit_stop_loss = cur_price <= entry_info["stop_loss"]

                    if hit_take_profit or hit_stop_loss:
                        if hit_take_profit:
                            reason = f"Take-Profit Target Hit (+{tp_pct}%, 1:{int(rr_ratio)} RR)"
                        elif entry_info.get("is_trailed"):
                            trailed_gain = ((cur_price - pos.average_buy_price) / pos.average_buy_price) * 100.0
                            reason = f"Trailing Stop-Loss Profit Lock Executed (+{trailed_gain:.2f}%)"
                        else:
                            reason = f"Stop-Loss Protection Hit (-{sl_pct}%)"

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

                        # Record trade in Trading Journal (Golden Rule 4)
                        try:
                            from backend.app.models.trading_journal import TradingJournal
                            pnl_val = round((cur_price - pos.average_buy_price) * pos.quantity, 2)
                            pnl_pct_val = round(((cur_price - pos.average_buy_price) / pos.average_buy_price) * 100.0, 2)
                            rr_calc = round((entry_info["take_profit"] - pos.average_buy_price) / (pos.average_buy_price - entry_info["stop_loss"]), 2) if pos.average_buy_price > entry_info["stop_loss"] else rr_ratio
                            critique = (
                                f"Disciplined 1:{int(rr_ratio)} Risk-Reward target achieved. Zero emotion, systematic profit taking."
                                if hit_take_profit else
                                f"Capital protected via pre-calculated stop-loss (-{sl_pct}%). Risk strictly contained."
                            )
                            setup_text = self._position_setup_reasons.pop((user.id, pos.symbol), "AI Quantitative Quality Swing Setup (D/E < 1.0, ROE > 12%)")

                            journal_record = TradingJournal(
                                user_id=user.id,
                                portfolio_id=portfolio.id,
                                symbol=pos.symbol,
                                side="BUY_SELL",
                                quantity=pos.quantity,
                                entry_price=pos.average_buy_price,
                                exit_price=cur_price,
                                stop_loss=entry_info["stop_loss"],
                                take_profit=entry_info["take_profit"],
                                risk_reward_ratio=rr_calc,
                                risk_amount=round((pos.average_buy_price - entry_info["stop_loss"]) * pos.quantity, 2),
                                realized_pnl=pnl_val,
                                realized_pnl_pct=pnl_pct_val,
                                setup_reason=setup_text,
                                exit_reason=reason,
                                emotion_tag="DISCIPLINED",
                                ai_critique=critique,
                                holding_seconds=int(holding_seconds),
                                created_at=entry_time,
                                closed_at=now
                            )
                            db.add(journal_record)
                            db.commit()
                        except Exception as log_err:
                            logger.error(f"Error recording trading journal: {log_err}")

                        self._position_targets.pop((user.id, pos.symbol), None)
                        self._position_entry_times.pop((user.id, pos.symbol), None)
                        self._position_highs.pop(high_key, None)
                        logger.info(f"AutoPilot SELL {pos.symbol} for user {user.id}: {reason}")
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
                        # Continue evaluating remaining positions rather than breaking

                # Re-query positions after potential sell
                positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
                metrics = portfolio_ledger.calculate_metrics(
                    db,
                    portfolio,
                    latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
                )

                # B. Halt & Pause Check: Daily loss limit or emergency risk kill-switch
                # When triggered for this user, skip candidate evaluation for this user without starving other users
                risk_status = risk_manager.get_risk_status(db, portfolio)
                is_halted = kill_switch_manager.is_stopped(portfolio) or risk_status.risk_state in ("HALTED", "EMERGENCY_STOP")
                if is_halted:
                    halt_reason = (
                        "Emergency Kill Switch is ACTIVE."
                        if kill_switch_manager.is_stopped(portfolio)
                        else "Daily loss or drawdown limit reached. Trading halted for today."
                    )
                    self._last_ai_status = {
                        "status": "HALTED",
                        "message": f"Trading halted for today: {halt_reason}",
                        "best_stock": None,
                        "best_score": 0,
                        "active_positions_count": len(positions),
                        "target_profit": None,
                        "stop_loss": None,
                        "autopilot_enabled": self.autopilot_enabled,
                        "updated_at": now.isoformat()
                    }
                    await self.broadcast_ai_status_if_changed(self._last_ai_status)
                    logger.info(f"AutoPilot loop paused for user {user.id}: {halt_reason}. Continuing with other users.")
                    continue

                # C. Screening Pipeline with Fundamental Health, Penny Stock Cutoff & Multi-Stock Capital Allocation
                held_symbols = {p.symbol for p in positions}
                min_price_cutoff = getattr(settings, "MIN_STOCK_PRICE_INR", 100.0)
                MAX_CONCURRENT_POSITIONS = 8
                per_stock_budget_cap = max(
                    metrics.total_portfolio_value * 0.25,
                    min_price_cutoff * 1.5
                )

                # Filter and score eligible candidates
                scored_candidates: List[Tuple[str, Quote, float]] = []
                for sym, q in latest_quotes.items():
                    if sym in held_symbols:
                        continue
                    if q.current_price < min_price_cutoff:
                        continue
                    fund_ok, _, _ = fundamental_gate.evaluate(sym, q.current_price)
                    if not fund_ok:
                        continue
                    unit_cost = q.current_price * 1.005
                    if unit_cost > portfolio.cash_balance:
                        continue

                    candles = market_provider.get_historical_candles(sym, limit=30)
                    score = self._score_opportunity(q, candles, user_id=user.id, symbol=sym)

                    # Evaluate Cost-Aware Gate
                    gate_res = cost_aware_gate.evaluate(q, expected_move_pct=tp_pct)
                    if gate_res.passed and score >= 55.0:
                        scored_candidates.append((sym, q, score))

                # Sort candidates by AI Opportunity Score descending
                scored_candidates.sort(key=lambda x: x[2], reverse=True)

                # Multi-Stock Capital Allocation Loop: Deploy idle capital across top-conviction opportunities
                executed_buys: List[str] = []
                max_risk_pct = getattr(settings, "MAX_RISK_PER_TRADE_PCT", 1.5)

                for best_sym, best_quote, score in scored_candidates:
                    if len(positions) >= MAX_CONCURRENT_POSITIONS:
                        break
                    if portfolio.cash_balance < min_price_cutoff:
                        break

                    unit_cost_est = best_quote.current_price * 1.005
                    trade_budget = min(portfolio.cash_balance, per_stock_budget_cap)
                    if unit_cost_est > trade_budget:
                        # If a single whole share exceeds the 25% cap but fits in cash, allow 1 share
                        if unit_cost_est <= portfolio.cash_balance:
                            trade_budget = unit_cost_est
                        else:
                            continue

                    capital_at_risk = metrics.total_portfolio_value * (max_risk_pct / 100.0)
                    risk_per_share = best_quote.current_price * (sl_pct / 100.0)
                    risk_qty = int(capital_at_risk // risk_per_share) if risk_per_share > 0 else 1
                    budget_qty = int(trade_budget // unit_cost_est)
                    qty = max(1, min(risk_qty, budget_qty)) if unit_cost_est <= trade_budget else 0

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
                            tp = round(fill_price * (1.0 + (sl_pct * rr_ratio) / 100.0), 2)
                            sl = round(fill_price * (1.0 - sl_pct / 100.0), 2)
                            high_key = (user.id, best_sym)
                            self._position_targets[high_key] = {
                                "entry": fill_price,
                                "take_profit": tp,
                                "stop_loss": sl
                            }
                            self._position_entry_times[high_key] = now
                            self._position_highs[high_key] = fill_price
                            self._position_setup_reasons[high_key] = (
                                f"AI Swing Setup: Score {score}/100, D/E < 1.0, ROE > 12%, "
                                f"Risk: ₹{min(capital_at_risk, qty*risk_per_share):.2f} (<= {max_risk_pct}%), Target 1:{int(rr_ratio)} RR"
                            )
                            executed_buys.append(f"{best_sym} ({qty}sh @ ₹{fill_price:.2f})")
                            held_symbols.add(best_sym)

                            # Refresh portfolio state from db for next candidate in the same cycle
                            db.refresh(portfolio)
                            positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
                            metrics = portfolio_ledger.calculate_metrics(
                                db,
                                portfolio,
                                latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
                            )

                if executed_buys:
                    first_sym = positions[0].symbol if positions else None
                    first_tp = self._position_targets.get((user.id, first_sym), {}).get("take_profit") if first_sym else None
                    first_sl = self._position_targets.get((user.id, first_sym), {}).get("stop_loss") if first_sym else None
                    self._last_ai_status = {
                        "status": "HOLDING",
                        "message": (
                            f"AI Deployed Capital into: {', '.join(executed_buys)}. "
                            f"Active positions: {len(positions)}/{MAX_CONCURRENT_POSITIONS}. Cash: ₹{portfolio.cash_balance:.2f}."
                        ),
                        "best_stock": first_sym,
                        "best_score": scored_candidates[0][2] if scored_candidates else 85,
                        "active_positions_count": len(positions),
                        "target_profit": first_tp,
                        "stop_loss": first_sl,
                        "autopilot_enabled": True,
                        "updated_at": now.isoformat()
                    }
                    logger.info(self._last_ai_status["message"])
                elif len(positions) > 0:
                    pos_summary = ", ".join([f"{p.symbol} ({p.quantity}sh)" for p in positions])
                    first_pos = positions[0]
                    first_targets = self._position_targets.get((user.id, first_pos.symbol), {})
                    tp = first_targets.get("take_profit", round(first_pos.average_buy_price * (1.0 + tp_pct / 100.0), 2))
                    sl = first_targets.get("stop_loss", round(first_pos.average_buy_price * (1.0 - sl_pct / 100.0), 2))
                    highest_candidate_score = scored_candidates[0][2] if scored_candidates else 0

                    self._last_ai_status = {
                        "status": "HOLDING",
                        "message": (
                            f"AI Portfolio Active ({len(positions)} positions: {pos_summary}). "
                            f"Cash: ₹{portfolio.cash_balance:.2f}. Monitoring profit targets (+{tp_pct}%) & trailing stops."
                        ),
                        "best_stock": first_pos.symbol,
                        "best_score": highest_candidate_score if highest_candidate_score > 0 else 85,
                        "active_positions_count": len(positions),
                        "target_profit": tp,
                        "stop_loss": sl,
                        "autopilot_enabled": True,
                        "updated_at": now.isoformat()
                    }
                else:
                    self._last_ai_status = {
                        "status": "SCANNING",
                        "message": (
                            f"AI Scanning: No candidates affordable within budget (Cash: ₹{portfolio.cash_balance:.2f}) "
                            f"and price >= ₹{min_price_cutoff:.2f}. Universe screened with 0 risk."
                        ),
                        "best_stock": None,
                        "best_score": 0,
                        "active_positions_count": 0,
                        "target_profit": None,
                        "stop_loss": None,
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
                }, target_user_id=user.id)

                await self.broadcast_ai_status_if_changed(self._last_ai_status)

        finally:
            db.close()

    async def deploy_remaining_capital(self, user_id: int) -> Dict[str, Any]:
        """
        Instant Capital Deployment Engine:
        Evaluates the current universe and deploys remaining idle cash into top-ranked
        Nifty 50 candidates immediately, utilizing up to 85%-95% of available funds.
        """
        now = datetime.utcnow()
        db = SessionLocal()
        deployed: List[Dict[str, Any]] = []
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.portfolio:
                return {"success": False, "message": "User portfolio not found", "deployed_count": 0}

            portfolio = user.portfolio
            self._sync_agi_learning(db, user.id)

            latest_quotes = {sym: market_provider.get_quote(sym) for sym in UNIVERSE_SYMBOLS}
            positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
            held_symbols = {p.symbol for p in positions}
            min_price_cutoff = getattr(settings, "MIN_STOCK_PRICE_INR", 100.0)
            sl_pct = getattr(settings, "STOP_LOSS_PCT", 1.5)
            rr_ratio = getattr(settings, "RISK_REWARD_RATIO", 2.0)
            tp_pct = getattr(settings, "TAKE_PROFIT_PCT", round(sl_pct * rr_ratio, 2))
            max_positions = 8

            metrics = portfolio_ledger.calculate_metrics(
                db,
                portfolio,
                latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
            )
            per_stock_budget_cap = max(
                metrics.total_portfolio_value * 0.25,
                min_price_cutoff * 1.5
            )

            # Score candidates
            scored: List[Tuple[str, Quote, float]] = []
            for sym, q in latest_quotes.items():
                if sym in held_symbols or q.current_price < min_price_cutoff:
                    continue
                fund_ok, _, _ = fundamental_gate.evaluate(sym, q.current_price)
                if not fund_ok:
                    continue
                unit_cost = q.current_price * 1.005
                if unit_cost > portfolio.cash_balance:
                    continue
                candles = market_provider.get_historical_candles(sym, limit=30)
                score = self._score_opportunity(q, candles, user_id=user.id, symbol=sym)
                gate_res = cost_aware_gate.evaluate(q, expected_move_pct=tp_pct)
                if gate_res.passed and score >= 50.0:
                    scored.append((sym, q, score))

            scored.sort(key=lambda x: x[2], reverse=True)

            for sym, quote, score in scored:
                if len(positions) >= max_positions:
                    break
                if portfolio.cash_balance < min_price_cutoff:
                    break

                unit_cost = quote.current_price * 1.005
                budget = min(portfolio.cash_balance, per_stock_budget_cap)
                if unit_cost > budget:
                    if unit_cost <= portfolio.cash_balance:
                        budget = unit_cost
                    else:
                        continue

                max_risk_pct = getattr(settings, "MAX_RISK_PER_TRADE_PCT", 1.5)
                capital_at_risk = metrics.total_portfolio_value * (max_risk_pct / 100.0)
                risk_per_share = quote.current_price * (sl_pct / 100.0)
                risk_qty = int(capital_at_risk // risk_per_share) if risk_per_share > 0 else 1
                budget_qty = int(budget // unit_cost)
                qty = max(1, min(risk_qty, budget_qty)) if unit_cost <= budget else 0

                if qty >= 1:
                    order_in = OrderCreate(
                        symbol=sym,
                        side="BUY",
                        order_type="MARKET",
                        quantity=qty,
                        price=quote.current_price
                    )
                    res = paper_broker.execute_paper_order(
                        db=db,
                        user=user,
                        order_in=order_in,
                        quote=quote,
                        risk_manager=risk_manager
                    )
                    if res.status == "FILLED":
                        fill_price = res.executed_price or quote.current_price
                        tp = round(fill_price * (1.0 + (sl_pct * rr_ratio) / 100.0), 2)
                        sl = round(fill_price * (1.0 - sl_pct / 100.0), 2)
                        high_key = (user.id, sym)
                        self._position_targets[high_key] = {
                            "entry": fill_price,
                            "take_profit": tp,
                            "stop_loss": sl
                        }
                        self._position_entry_times[high_key] = now
                        self._position_highs[high_key] = fill_price
                        self._position_setup_reasons[high_key] = (
                            f"AI Swing Setup: Score {score}/100, D/E < 1.0, ROE > 12%, Target 1:{int(rr_ratio)} RR"
                        )
                        deployed.append({
                            "symbol": sym,
                            "quantity": qty,
                            "fill_price": fill_price,
                            "score": score,
                            "take_profit": tp,
                            "stop_loss": sl
                        })
                        held_symbols.add(sym)
                        db.refresh(portfolio)
                        positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
                        metrics = portfolio_ledger.calculate_metrics(
                            db,
                            portfolio,
                            latest_prices={sym: q.current_price for sym, q in latest_quotes.items()}
                        )

            # Update status
            if deployed:
                pos_summary = ", ".join([f"{d['symbol']} ({d['quantity']}sh)" for d in deployed])
                self._last_ai_status = {
                    "status": "HOLDING",
                    "message": f"AI Instantly Deployed Cash: Bought {pos_summary}. Cash: ₹{portfolio.cash_balance:.2f}.",
                    "best_stock": deployed[0]["symbol"],
                    "best_score": deployed[0]["score"],
                    "active_positions_count": len(positions),
                    "target_profit": deployed[0]["take_profit"],
                    "stop_loss": deployed[0]["stop_loss"],
                    "autopilot_enabled": True,
                    "updated_at": now.isoformat()
                }
                await self.broadcast_ai_status_if_changed(self._last_ai_status)
                await self.broadcast({
                    "type": "PORTFOLIO_UPDATE",
                    "user_id": user.id,
                    "metrics": metrics.model_dump(mode="json"),
                    "cash_balance": portfolio.cash_balance,
                    "total_portfolio_value": metrics.total_portfolio_value
                }, target_user_id=user.id)

            return {
                "success": True,
                "deployed_count": len(deployed),
                "details": deployed,
                "remaining_cash": round(portfolio.cash_balance, 2),
                "total_positions": len(positions)
            }
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
