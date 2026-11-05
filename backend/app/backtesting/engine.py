"""Historical Backtesting Engine with Chronological Splits and Next-Bar Open Execution."""
from datetime import datetime, timedelta
import math
from typing import List, Dict, Any, Optional, Tuple

from backend.app.schemas.backtest import (
    BacktestRequest,
    BacktestResponse,
    BacktestTradeRecord,
    SplitPerformance
)
from backend.app.schemas.market import Candle, Quote
from backend.app.strategies import STRATEGY_REGISTRY
from backend.app.paper_engine.fee_calculator import FeeCalculator
from backend.app.paper_engine.execution_simulator import ExecutionSimulator
from backend.app.backtesting.metrics import PerformanceStats
from backend.app.market_data.history_cache import history_cache


def _build_bar_quote(symbol: str, bar: Candle, prev_close: float) -> Quote:
    """Build a Quote object from a Candle for strategy evaluation."""
    change = round(bar.close - prev_close, 2)
    change_pct = round((change / prev_close) * 100.0, 2) if prev_close > 0 else 0.0
    return Quote(
        symbol=symbol,
        company_name=symbol,
        current_price=bar.close,
        open=bar.open,
        high=bar.high,
        low=bar.low,
        previous_close=prev_close,
        change=change,
        change_pct=change_pct,
        bid=round(bar.close * 0.999, 2),
        ask=round(bar.close * 1.001, 2),
        spread_pct=0.20,
        volume=bar.volume or 100_000,
        timestamp=bar.timestamp,
        is_demo=True
    )


class BacktestingEngine:
    """Simulates strategies over historical price sequences without look-ahead bias."""

    def run_backtest(self, req: BacktestRequest) -> BacktestResponse:
        """Entry point for backtesting. Supports single-symbol and multi-symbol universe."""
        symbols = self._resolve_symbols(req)
        if len(symbols) > 1:
            return self._run_multi_symbol_backtest(symbols, req)
        return self._run_single_symbol_backtest(symbols[0], req)

    @staticmethod
    def _resolve_symbols(req: BacktestRequest) -> List[str]:
        """Resolves target symbol list from request."""
        if req.symbols and len(req.symbols) > 0:
            return [s.strip().upper() for s in req.symbols if s.strip()]

        raw = req.symbol.strip()
        if raw.upper() == "UNIVERSE":
            return ["INFY", "TCS", "RELIANCE", "HDFCBANK", "ICICIBANK"]
        if "," in raw:
            return [s.strip().upper() for s in raw.split(",") if s.strip()]
        return [raw.upper()]

    def _run_single_symbol_backtest(self, symbol: str, req: BacktestRequest) -> BacktestResponse:
        strategy = STRATEGY_REGISTRY.get(req.strategy_name)
        if not strategy:
            raise ValueError(f"Strategy {req.strategy_name} not found in registry.")

        candles = history_cache.get_cached_candles(symbol, timeframe="5m", limit=120)
        total_bars = len(candles)
        if total_bars < 30:
            raise ValueError("Insufficient candle history for reliable backtesting.")

        # Chronological splits: Train / Validation / Test
        train_end_idx = int(total_bars * (req.train_split_pct / 100.0))
        val_end_idx = int(total_bars * ((req.train_split_pct + req.val_split_pct) / 100.0))

        splits_def = [
            ("Train", 0, train_end_idx),
            ("Validation", train_end_idx, val_end_idx),
            ("Test", val_end_idx, total_bars)
        ]

        all_trades: List[Dict[str, Any]] = []
        equity = req.initial_capital
        cash = req.initial_capital
        position_qty = 0
        avg_entry = 0.0
        entry_time = None

        equity_curve: List[Dict[str, Any]] = []
        split_reports: List[SplitPerformance] = []
        trade_counter = 1

        # Pending order generated at bar i close to be filled at bar i+1 open
        pending_order: Optional[Dict[str, Any]] = None

        for split_name, start_i, end_i in splits_def:
            split_candles = candles[start_i:end_i]
            if not split_candles:
                continue

            split_start_time = split_candles[0].timestamp
            split_end_time = split_candles[-1].timestamp
            split_trades: List[Dict[str, Any]] = []
            split_equity_series = [equity]

            for i in range(len(split_candles)):
                bar = split_candles[i]

                # 1. NEXT-BAR OPEN FILL: Execute any pending order at the OPEN of this bar
                if pending_order:
                    action = pending_order["action"]
                    reason = pending_order["reason"]
                    open_price = bar.open

                    quote_at_open = _build_bar_quote(symbol, bar, prev_close=open_price)
                    calc_bps = ExecutionSimulator.calculate_slippage_bps(position_qty or 1, quote_at_open)
                    effective_slippage_bps = max(req.slippage_bps, calc_bps)

                    if action == "BUY" and position_qty == 0:
                        exec_price = round(open_price * (1.0 + (effective_slippage_bps / 10000.0)), 2)
                        affordable_shares = math.floor(cash / exec_price)
                        if affordable_shares >= 1:
                            buy_fees = FeeCalculator.calculate_fees(
                                symbol, "BUY", affordable_shares, exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                            )
                            total_cost = round(affordable_shares * exec_price + buy_fees.total_charges, 2)
                            while total_cost > cash and affordable_shares > 1:
                                affordable_shares -= 1
                                buy_fees = FeeCalculator.calculate_fees(
                                    symbol, "BUY", affordable_shares, exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                                )
                                total_cost = round(affordable_shares * exec_price + buy_fees.total_charges, 2)

                            if total_cost <= cash:
                                cash -= total_cost
                                position_qty = affordable_shares
                                avg_entry = exec_price
                                entry_time = bar.timestamp

                    elif action == "SELL" and position_qty > 0:
                        exec_price = max(round(open_price * (1.0 - (effective_slippage_bps / 10000.0)), 2), 0.05)
                        sell_fees = FeeCalculator.calculate_fees(
                            symbol, "SELL", position_qty, exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                        )
                        gross = round(position_qty * exec_price, 2)
                        cost_basis = round(position_qty * avg_entry, 2)
                        gross_pnl = round(gross - cost_basis, 2)
                        fees_paid = round(sell_fees.total_charges, 2)
                        net_pnl = round(gross_pnl - fees_paid, 2)
                        cash += (gross - fees_paid)

                        trade_rec = {
                            "trade_id": trade_counter,
                            "symbol": symbol,
                            "entry_time": entry_time or bar.timestamp,
                            "exit_time": bar.timestamp,
                            "entry_price": avg_entry,
                            "exit_price": exec_price,
                            "quantity": position_qty,
                            "gross_pnl": gross_pnl,
                            "fees_paid": fees_paid,
                            "net_pnl": net_pnl,
                            "return_pct": round((net_pnl / cost_basis) * 100.0, 2) if cost_basis > 0 else 0.0,
                            "exit_reason": reason
                        }
                        all_trades.append(trade_rec)
                        split_trades.append(trade_rec)
                        trade_counter += 1
                        position_qty = 0
                        avg_entry = 0.0

                    pending_order = None

                # 2. Update equity at current bar close
                current_total_val = cash + (position_qty * bar.close)
                equity = round(current_total_val, 2)
                split_equity_series.append(equity)
                equity_curve.append({
                    "timestamp": bar.timestamp.isoformat(),
                    "equity": equity,
                    "cash": round(cash, 2),
                    "split": split_name
                })

                # 3. Strategy evaluation at current bar close
                full_history_idx = start_i + i
                full_window = candles[:full_history_idx + 1]
                if len(full_window) >= 20:
                    prev_close = full_window[-2].close if len(full_window) > 1 else bar.close
                    dummy_quote = _build_bar_quote(symbol, bar, prev_close=prev_close)

                    signal = strategy.evaluate(
                        quote=dummy_quote,
                        candles=full_window,
                        owned_quantity=position_qty,
                        available_cash=cash
                    )

                    if signal.action == "BUY" and position_qty == 0 and cash >= bar.close:
                        pending_order = {"action": "BUY", "reason": signal.rationale}
                    elif signal.action == "SELL" and position_qty > 0:
                        pending_order = {"action": "SELL", "reason": signal.rationale}

            stats = PerformanceStats.calculate_stats(split_trades, split_equity_series[0], split_equity_series)
            split_reports.append(SplitPerformance(
                split_name=split_name,
                start_date=split_start_time,
                end_date=split_end_time,
                total_trades=stats["total_trades"],
                win_rate_pct=stats["win_rate_pct"],
                gross_profit=stats["gross_profit"],
                total_fees=stats["total_fees"],
                net_profit=stats["net_profit"],
                max_drawdown_pct=stats["max_drawdown_pct"],
                profit_factor=stats["profit_factor"]
            ))

        overall_stats = PerformanceStats.calculate_stats(
            all_trades,
            req.initial_capital,
            [pt["equity"] for pt in equity_curve] if equity_curve else [req.initial_capital]
        )

        sample_records = [
            BacktestTradeRecord(
                trade_id=t["trade_id"],
                symbol=t["symbol"],
                entry_time=t["entry_time"],
                exit_time=t["exit_time"],
                entry_price=t["entry_price"],
                exit_price=t["exit_price"],
                quantity=t["quantity"],
                gross_pnl=t["gross_pnl"],
                fees_paid=t["fees_paid"],
                net_pnl=t["net_pnl"],
                return_pct=t["return_pct"],
                exit_reason=t["exit_reason"]
            )
            for t in all_trades[-10:]
        ]

        net_ret = round(((equity - req.initial_capital) / req.initial_capital) * 100.0, 2)
        gross_ret = round(((equity + overall_stats["total_fees"] - req.initial_capital) / req.initial_capital) * 100.0, 2)

        # Benchmark: Buy & Hold return % of the underlying stock over the entire period
        b_start = candles[0].close
        b_end = candles[-1].close
        b_return = round(((b_end - b_start) / b_start) * 100.0, 2) if b_start > 0 else 0.0

        return BacktestResponse(
            strategy_name=req.strategy_name,
            symbol=symbol,
            symbols_tested=[symbol],
            initial_capital=req.initial_capital,
            final_equity=round(equity, 2),
            gross_return_pct=gross_ret,
            net_return_pct=net_ret,
            total_fees_paid=overall_stats["total_fees"],
            cost_drag_pct=overall_stats["cost_drag_pct"],
            total_trades=overall_stats["total_trades"],
            win_rate_pct=overall_stats["win_rate_pct"],
            max_drawdown_pct=overall_stats["max_drawdown_pct"],
            profit_factor=overall_stats["profit_factor"],
            sharpe_ratio=overall_stats["sharpe_ratio"],
            benchmark_symbol=symbol,
            benchmark_return_pct=b_return,
            splits=split_reports,
            equity_curve=equity_curve,
            sample_trades=sample_records,
            assumptions_disclaimer=(
                "DISCLAIMER: Backtesting results are generated in paper-trading simulation mode with NEXT-BAR OPEN "
                "execution to eliminate look-ahead bias. Frictions include statutory Indian equity charges "
                "(STT, GST, turnover, stamp duty) and dynamic liquidity-adjusted slippage. "
                "Look-ahead bias is mitigated through chronological out-of-sample train/validation/test partitions."
            )
        )

    def _run_multi_symbol_backtest(self, symbols: List[str], req: BacktestRequest) -> BacktestResponse:
        """Multi-symbol universe backtesting across shared portfolio capital."""
        strategy = STRATEGY_REGISTRY.get(req.strategy_name)
        if not strategy:
            raise ValueError(f"Strategy {req.strategy_name} not found in registry.")

        candles_by_sym: Dict[str, List[Candle]] = {}
        for s in symbols:
            c = history_cache.get_cached_candles(s, timeframe="5m", limit=120)
            if len(c) >= 30:
                candles_by_sym[s] = c

        valid_symbols = list(candles_by_sym.keys())
        if not valid_symbols:
            raise ValueError("Insufficient candle history for all requested universe symbols.")

        total_bars = min(len(candles_by_sym[s]) for s in valid_symbols)
        if total_bars < 30:
            raise ValueError("Insufficient candle history for multi-symbol universe backtesting.")

        train_end_idx = int(total_bars * (req.train_split_pct / 100.0))
        val_end_idx = int(total_bars * ((req.train_split_pct + req.val_split_pct) / 100.0))

        splits_def = [
            ("Train", 0, train_end_idx),
            ("Validation", train_end_idx, val_end_idx),
            ("Test", val_end_idx, total_bars)
        ]

        all_trades: List[Dict[str, Any]] = []
        equity = req.initial_capital
        cash = req.initial_capital
        positions: Dict[str, Dict[str, Any]] = {
            s: {"qty": 0, "avg_entry": 0.0, "entry_time": None} for s in valid_symbols
        }

        equity_curve: List[Dict[str, Any]] = []
        split_reports: List[SplitPerformance] = []
        trade_counter = 1

        # Pending orders per symbol
        pending_orders: Dict[str, Dict[str, Any]] = {}

        for split_name, start_i, end_i in splits_def:
            split_candles = {s: candles_by_sym[s][start_i:end_i] for s in valid_symbols}
            split_len = end_i - start_i
            if split_len <= 0:
                continue

            split_start_time = split_candles[valid_symbols[0]][0].timestamp
            split_end_time = split_candles[valid_symbols[0]][-1].timestamp
            split_trades: List[Dict[str, Any]] = []
            split_equity_series = [equity]

            for i in range(split_len):
                # 1. Execute pending orders at this bar's OPEN
                # Execute SELLs first to release cash
                for sym in list(pending_orders.keys()):
                    order = pending_orders[sym]
                    if order["action"] == "SELL" and positions[sym]["qty"] > 0:
                        bar = split_candles[sym][i]
                        pos = positions[sym]
                        quote_at_open = _build_bar_quote(sym, bar, prev_close=bar.open)
                        calc_bps = ExecutionSimulator.calculate_slippage_bps(pos["qty"], quote_at_open)
                        effective_slippage_bps = max(req.slippage_bps, calc_bps)

                        exec_price = max(round(bar.open * (1.0 - effective_slippage_bps / 10000.0), 2), 0.05)
                        sell_fees = FeeCalculator.calculate_fees(
                            sym, "SELL", pos["qty"], exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                        )
                        gross = round(pos["qty"] * exec_price, 2)
                        cost_basis = round(pos["qty"] * pos["avg_entry"], 2)
                        gross_pnl = round(gross - cost_basis, 2)
                        fees_paid = round(sell_fees.total_charges, 2)
                        net_pnl = round(gross_pnl - fees_paid, 2)
                        cash += (gross - fees_paid)

                        trade_rec = {
                            "trade_id": trade_counter,
                            "symbol": sym,
                            "entry_time": pos["entry_time"] or bar.timestamp,
                            "exit_time": bar.timestamp,
                            "entry_price": pos["avg_entry"],
                            "exit_price": exec_price,
                            "quantity": pos["qty"],
                            "gross_pnl": gross_pnl,
                            "fees_paid": fees_paid,
                            "net_pnl": net_pnl,
                            "return_pct": round((net_pnl / cost_basis) * 100.0, 2) if cost_basis > 0 else 0.0,
                            "exit_reason": order["reason"]
                        }
                        all_trades.append(trade_rec)
                        split_trades.append(trade_rec)
                        trade_counter += 1
                        positions[sym] = {"qty": 0, "avg_entry": 0.0, "entry_time": None}
                        del pending_orders[sym]

                # Execute BUYs with 25% max budget per position
                for sym in list(pending_orders.keys()):
                    order = pending_orders[sym]
                    if order["action"] == "BUY" and positions[sym]["qty"] == 0:
                        bar = split_candles[sym][i]
                        quote_at_open = _build_bar_quote(sym, bar, prev_close=bar.open)
                        calc_bps = ExecutionSimulator.calculate_slippage_bps(1, quote_at_open)
                        effective_slippage_bps = max(req.slippage_bps, calc_bps)
                        exec_price = round(bar.open * (1.0 + effective_slippage_bps / 10000.0), 2)

                        # Allocation cap: max 25% portfolio budget per position
                        current_pv = cash + sum(positions[s]["qty"] * split_candles[s][i].close for s in valid_symbols)
                        trade_budget = min(cash, current_pv * 0.25)
                        if exec_price > trade_budget and exec_price <= cash:
                            trade_budget = exec_price

                        affordable_shares = math.floor(trade_budget / exec_price)
                        if affordable_shares >= 1:
                            buy_fees = FeeCalculator.calculate_fees(
                                sym, "BUY", affordable_shares, exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                            )
                            total_cost = round(affordable_shares * exec_price + buy_fees.total_charges, 2)
                            while total_cost > cash and affordable_shares > 1:
                                affordable_shares -= 1
                                buy_fees = FeeCalculator.calculate_fees(
                                    sym, "BUY", affordable_shares, exec_price, is_intraday=True, slippage_bps=effective_slippage_bps
                                )
                                total_cost = round(affordable_shares * exec_price + buy_fees.total_charges, 2)

                            if total_cost <= cash:
                                cash -= total_cost
                                positions[sym] = {
                                    "qty": affordable_shares,
                                    "avg_entry": exec_price,
                                    "entry_time": bar.timestamp
                                }
                        del pending_orders[sym]

                # 2. Mark portfolio equity at bar close
                holdings_val = sum(positions[s]["qty"] * split_candles[s][i].close for s in valid_symbols)
                equity = round(cash + holdings_val, 2)
                split_equity_series.append(equity)
                equity_curve.append({
                    "timestamp": split_candles[valid_symbols[0]][i].timestamp.isoformat(),
                    "equity": equity,
                    "cash": round(cash, 2),
                    "split": split_name
                })

                # 3. Evaluate strategy signals across all universe symbols at bar close
                full_history_idx = start_i + i
                for sym in valid_symbols:
                    history_window = candles_by_sym[sym][:full_history_idx + 1]
                    if len(history_window) >= 20:
                        bar = split_candles[sym][i]
                        prev_close = history_window[-2].close if len(history_window) > 1 else bar.close
                        dummy_quote = _build_bar_quote(sym, bar, prev_close=prev_close)

                        sig = strategy.evaluate(
                            quote=dummy_quote,
                            candles=history_window,
                            owned_quantity=positions[sym]["qty"],
                            available_cash=cash
                        )

                        if sig.action == "BUY" and positions[sym]["qty"] == 0 and cash >= bar.close:
                            pending_orders[sym] = {"action": "BUY", "reason": sig.rationale}
                        elif sig.action == "SELL" and positions[sym]["qty"] > 0:
                            pending_orders[sym] = {"action": "SELL", "reason": sig.rationale}

            stats = PerformanceStats.calculate_stats(split_trades, split_equity_series[0], split_equity_series)
            split_reports.append(SplitPerformance(
                split_name=split_name,
                start_date=split_start_time,
                end_date=split_end_time,
                total_trades=stats["total_trades"],
                win_rate_pct=stats["win_rate_pct"],
                gross_profit=stats["gross_profit"],
                total_fees=stats["total_fees"],
                net_profit=stats["net_profit"],
                max_drawdown_pct=stats["max_drawdown_pct"],
                profit_factor=stats["profit_factor"]
            ))

        overall_stats = PerformanceStats.calculate_stats(
            all_trades,
            req.initial_capital,
            [pt["equity"] for pt in equity_curve] if equity_curve else [req.initial_capital]
        )

        sample_records = [
            BacktestTradeRecord(
                trade_id=t["trade_id"],
                symbol=t["symbol"],
                entry_time=t["entry_time"],
                exit_time=t["exit_time"],
                entry_price=t["entry_price"],
                exit_price=t["exit_price"],
                quantity=t["quantity"],
                gross_pnl=t["gross_pnl"],
                fees_paid=t["fees_paid"],
                net_pnl=t["net_pnl"],
                return_pct=t["return_pct"],
                exit_reason=t["exit_reason"]
            )
            for t in all_trades[-10:]
        ]

        net_ret = round(((equity - req.initial_capital) / req.initial_capital) * 100.0, 2)
        gross_ret = round(((equity + overall_stats["total_fees"] - req.initial_capital) / req.initial_capital) * 100.0, 2)

        # Benchmark: Equal-weighted Buy & Hold return across the tested universe
        returns_list = []
        for s in valid_symbols:
            s_open = candles_by_sym[s][0].close
            s_close = candles_by_sym[s][-1].close
            if s_open > 0:
                returns_list.append(((s_close - s_open) / s_open) * 100.0)
        b_return = round(sum(returns_list) / len(returns_list), 2) if returns_list else 0.0

        return BacktestResponse(
            strategy_name=req.strategy_name,
            symbol="UNIVERSE",
            symbols_tested=valid_symbols,
            initial_capital=req.initial_capital,
            final_equity=round(equity, 2),
            gross_return_pct=gross_ret,
            net_return_pct=net_ret,
            total_fees_paid=overall_stats["total_fees"],
            cost_drag_pct=overall_stats["cost_drag_pct"],
            total_trades=overall_stats["total_trades"],
            win_rate_pct=overall_stats["win_rate_pct"],
            max_drawdown_pct=overall_stats["max_drawdown_pct"],
            profit_factor=overall_stats["profit_factor"],
            sharpe_ratio=overall_stats["sharpe_ratio"],
            benchmark_symbol="NIFTY_UNIVERSE_EQUAL_WEIGHT",
            benchmark_return_pct=b_return,
            splits=split_reports,
            equity_curve=equity_curve,
            sample_trades=sample_records,
            assumptions_disclaimer=(
                "DISCLAIMER: Multi-symbol backtest executed in paper simulation mode with NEXT-BAR OPEN "
                "execution to eliminate look-ahead bias. Frictions include statutory Indian equity charges "
                "(STT, GST, turnover, stamp duty) and dynamic liquidity-adjusted slippage. "
                "Look-ahead bias is mitigated through chronological out-of-sample train/validation/test partitions."
            )
        )


backtesting_engine = BacktestingEngine()

