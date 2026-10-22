"""Historical Backtesting Engine with Chronological Splits."""
from datetime import datetime, timedelta
import math
import random
from typing import List, Dict, Any
from backend.app.schemas.backtest import (
    BacktestRequest,
    BacktestResponse,
    BacktestTradeRecord,
    SplitPerformance
)
from backend.app.schemas.market import Candle, Quote
from backend.app.strategies import STRATEGY_REGISTRY
from backend.app.paper_engine.fee_calculator import FeeCalculator
from backend.app.backtesting.metrics import PerformanceStats
from backend.app.market_data import demo_provider


class BacktestingEngine:
    """Simulates strategies over historical price sequences without look-ahead bias."""

    @staticmethod
    def run_backtest(req: BacktestRequest) -> BacktestResponse:
        strategy = STRATEGY_REGISTRY.get(req.strategy_name)
        if not strategy:
            raise ValueError(f"Strategy {req.strategy_name} not found in registry.")

        symbol = req.symbol
        # Generate representative historical candles for backtesting
        candles = demo_provider.get_historical_candles(symbol, timeframe="1m", limit=120)
        total_bars = len(candles)
        if total_bars < 30:
            raise ValueError("Insufficient candle history for reliable backtesting.")

        # Chronological splits
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

        for split_name, start_i, end_i in splits_def:
            split_candles = candles[start_i:end_i]
            if not split_candles:
                continue

            split_start_time = split_candles[0].timestamp
            split_end_time = split_candles[-1].timestamp
            split_trades: List[Dict[str, Any]] = []
            split_equity_series = [equity]

            for i in range(20, len(split_candles)):
                bar = split_candles[i]
                historical_window = split_candles[:i]
                cur_price = bar.close

                dummy_quote = Quote(
                    symbol=symbol,
                    company_name=symbol,
                    current_price=cur_price,
                    open=bar.open,
                    high=bar.high,
                    low=bar.low,
                    previous_close=historical_window[-2].close if len(historical_window) > 1 else cur_price,
                    change=round(cur_price - bar.open, 2),
                    change_pct=round(((cur_price - bar.open) / bar.open) * 100.0, 2),
                    bid=round(cur_price * 0.999, 2),
                    ask=round(cur_price * 1.001, 2),
                    spread_pct=0.20,
                    volume=bar.volume,
                    timestamp=bar.timestamp,
                    is_demo=True
                )

                signal = strategy.evaluate(
                    quote=dummy_quote,
                    candles=historical_window,
                    owned_quantity=position_qty,
                    available_cash=cash
                )

                # Entry execution
                if signal.action == "BUY" and position_qty == 0 and cash >= cur_price:
                    affordable_shares = math.floor(cash / cur_price)
                    if affordable_shares >= 1:
                        position_qty = max(affordable_shares, 1)
                        # Apply simulated slippage
                        exec_price = round(cur_price * (1.0 + (req.slippage_bps / 10000.0)), 2)
                        buy_fees = FeeCalculator.calculate_fees(symbol, "BUY", position_qty, exec_price, is_intraday=True)
                        total_cost = round(position_qty * exec_price + buy_fees.total_charges, 2)
                        if total_cost <= cash:
                            cash -= total_cost
                            avg_entry = exec_price
                            entry_time = bar.timestamp

                # Exit execution
                elif signal.action == "SELL" and position_qty > 0:
                    exec_price = max(round(cur_price * (1.0 - (req.slippage_bps / 10000.0)), 2), 0.05)
                    sell_fees = FeeCalculator.calculate_fees(symbol, "SELL", position_qty, exec_price, is_intraday=True)
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
                        "exit_reason": signal.rationale
                    }
                    all_trades.append(trade_rec)
                    split_trades.append(trade_rec)
                    trade_counter += 1
                    position_qty = 0
                    avg_entry = 0.0

                current_total_val = cash + (position_qty * cur_price)
                equity = current_total_val
                split_equity_series.append(equity)
                equity_curve.append({
                    "timestamp": bar.timestamp.isoformat(),
                    "equity": round(equity, 2),
                    "cash": round(cash, 2),
                    "split": split_name
                })

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

        return BacktestResponse(
            strategy_name=req.strategy_name,
            symbol=symbol,
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
            splits=split_reports,
            equity_curve=equity_curve,
            sample_trades=sample_records,
            assumptions_disclaimer=(
                "DISCLAIMER: Backtesting results are generated in paper-trading simulation mode. "
                "Past performance does not guarantee future results. Frictions include statutory Indian equity "
                "charges (STT, GST, turnover, stamp duty) and simulated bid-ask slippage. Look-ahead bias is mitigated "
                "through chronological out-of-sample train/validation/test partitions."
            )
        )


backtesting_engine = BacktestingEngine()
