"""Quantitative metrics for strategy evaluation."""
import math
from typing import List, Dict, Any


class PerformanceStats:
    """Calculates quantitative performance metrics for trading strategies."""

    @staticmethod
    def calculate_stats(
        trades: List[Dict[str, Any]],
        initial_capital: float,
        equity_series: List[float]
    ) -> Dict[str, float]:
        if not trades:
            return {
                "total_trades": 0,
                "win_rate_pct": 0.0,
                "gross_profit": 0.0,
                "total_fees": 0.0,
                "net_profit": 0.0,
                "profit_factor": 0.0,
                "max_drawdown_pct": 0.0,
                "sharpe_ratio": 0.0,
                "cost_drag_pct": 0.0
            }

        total_trades = len(trades)
        winning_trades = [t for t in trades if t["net_pnl"] > 0]
        losing_trades = [t for t in trades if t["net_pnl"] < 0]

        win_rate_pct = round((len(winning_trades) / total_trades) * 100.0, 2)

        total_gains = sum(t["net_pnl"] for t in winning_trades)
        total_losses = abs(sum(t["net_pnl"] for t in losing_trades))
        profit_factor = round(total_gains / total_losses, 2) if total_losses > 0 else (99.0 if total_gains > 0 else 1.0)

        total_fees = round(sum(t.get("fees_paid", 0.0) for t in trades), 2)
        net_profit = round(sum(t["net_pnl"] for t in trades), 2)
        gross_profit = round(net_profit + total_fees, 2)

        cost_drag_pct = round((total_fees / gross_profit) * 100.0, 2) if gross_profit > 0 else 0.0

        # Maximum peak-to-trough drawdown from equity series
        peak = initial_capital
        max_drawdown_pct = 0.0
        for eq in equity_series:
            if eq > peak:
                peak = eq
            dd = ((peak - eq) / peak) * 100.0 if peak > 0 else 0.0
            if dd > max_drawdown_pct:
                max_drawdown_pct = dd

        # Sharpe ratio approximation
        returns = []
        for i in range(1, len(equity_series)):
            if equity_series[i - 1] > 0:
                returns.append((equity_series[i] - equity_series[i - 1]) / equity_series[i - 1])

        sharpe_ratio = 0.0
        if returns and len(returns) > 1:
            mean_ret = sum(returns) / len(returns)
            variance = sum((r - mean_ret) ** 2 for r in returns) / (len(returns) - 1)
            std_dev = math.sqrt(variance)
            if std_dev > 0:
                # Annualized for intraday (assuming 252 days * 375 minutes)
                sharpe_ratio = round((mean_ret / std_dev) * math.sqrt(252 * 75), 2)

        return {
            "total_trades": total_trades,
            "win_rate_pct": win_rate_pct,
            "gross_profit": gross_profit,
            "total_fees": total_fees,
            "net_profit": net_profit,
            "profit_factor": min(profit_factor, 10.0),
            "max_drawdown_pct": round(max_drawdown_pct, 2),
            "sharpe_ratio": max(min(sharpe_ratio, 5.0), -5.0),
            "cost_drag_pct": cost_drag_pct
        }
