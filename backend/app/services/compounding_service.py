"""
Daily Compounding Formula Engine (+1% Daily Compound Yield).

Implements the user's golden compounding formula:
Today Investment C_0 = 100
Tomorrow Investment C_1 = 100 + 1 (101)
Next Day Investment C_2 = 101 + (101 * 0.01) = 102.01
General: C_t = C_0 * (1 + r)^t
"""
from typing import Dict, Any, List
from datetime import date, timedelta
from sqlalchemy.orm import Session
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.services.daily_ledger_service import DailyLedgerService


class CompoundingService:
    DAILY_RATE: float = 0.01  # +1.0% target daily compounding rate

    @classmethod
    def get_compounding_status(cls, db: Session, portfolio: Portfolio) -> Dict[str, Any]:
        """
        Calculate current compounding progress, streak, and targets.
        """
        ledger = DailyLedgerService.get_chronological_ledger(db, portfolio)
        
        # Base capital post-upgrade
        base_capital = 5000.00
        upgrade_date = date(2026, 10, 27)
        
        # Calculate active holdings value
        positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
        holdings_value = sum(p.current_price * p.quantity for p in positions)
        total_equity = portfolio.cash_balance + holdings_value
        
        # Count consecutive days where compounding or profit target was achieved
        current_streak = 0
        for entry in reversed(ledger):
            if entry.get("discipline_status") in ("TARGET_HIT", "DISCIPLINED") and entry.get("net_pnl", 0) > 0:
                current_streak += 1
            else:
                break
                
        # Total profit generated since Day 10 upgrade
        recent_days = [e for e in ledger if e["day_number"] >= 10]
        recent_net_profit = sum(e["net_pnl"] for e in recent_days)
        
        days_compounding = len(recent_days)
        target_equity = round(base_capital * ((1.0 + cls.DAILY_RATE) ** max(days_compounding, 1)), 2)
        
        # Projected 30-day compounding curve
        projection_30d: List[Dict[str, Any]] = []
        for d in range(1, 31):
            proj_val = round(base_capital * ((1.0 + cls.DAILY_RATE) ** d), 2)
            projection_30d.append({
                "day": d,
                "projected_capital": proj_val,
                "daily_gain": round(proj_val * cls.DAILY_RATE, 2)
            })

        return {
            "formula_name": "Daily Compounding Growth Formula (+1% Daily Compound Yield)",
            "formula_equation": "C_t = C_0 * (1 + 0.01)^t",
            "base_capital_inr": base_capital,
            "current_cash_inr": round(portfolio.cash_balance, 2),
            "current_holdings_value_inr": round(holdings_value, 2),
            "total_portfolio_equity_inr": round(total_equity, 2),
            "target_equity_inr": target_equity,
            "target_achieved": total_equity >= target_equity or recent_net_profit > 0,
            "compounding_streak_days": current_streak,
            "total_profit_since_upgrade_inr": round(recent_net_profit, 2),
            "compounding_yield_pct": round((recent_net_profit / base_capital) * 100.0, 2),
            "active_positions_count": len(positions),
            "daily_target_pct": 1.0,
            "next_day_target_profit_inr": round(total_equity * cls.DAILY_RATE, 2),
            "projected_30d_target_inr": projection_30d[-1]["projected_capital"],
            "projection_curve": projection_30d[:7]  # First 7 days preview
        }
