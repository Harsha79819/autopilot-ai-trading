"""Stress Testing & What-If Scenario Simulation Engine."""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.portfolio import Portfolio
from backend.app.models.position import Position
from backend.app.paper_engine.ledger import portfolio_ledger


class ScenarioSimulator:
    """Simulates hypothetical market shocks, crash scenarios, and cost sensitivity."""

    @staticmethod
    def simulate_market_shock(
        db: Session,
        portfolio: Portfolio,
        market_drop_pct: float = -10.0
    ) -> Dict[str, Any]:
        """
        Simulates an index-wide decline (e.g. -5%, -10%, -20%) on active portfolio holdings.
        """
        metrics = portfolio_ledger.calculate_metrics(db, portfolio)
        positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()

        current_holdings_val = metrics.holdings_value
        cash = portfolio.cash_balance

        # Shocks impact holdings directly
        shocked_holdings_val = current_holdings_val * (1.0 + (market_drop_pct / 100.0))
        shocked_total_value = cash + shocked_holdings_val

        portfolio_loss_inr = metrics.total_portfolio_value - shocked_total_value
        portfolio_loss_pct = (portfolio_loss_inr / metrics.total_portfolio_value) * 100.0 if metrics.total_portfolio_value > 0 else 0.0

        # Position level impact
        position_impacts = []
        for pos in positions:
            pos_val = pos.quantity * pos.current_price
            shocked_val = pos_val * (1.0 + (market_drop_pct / 100.0))
            position_impacts.append({
                "symbol": pos.symbol,
                "current_val": round(pos_val, 2),
                "shocked_val": round(shocked_val, 2),
                "loss_inr": round(pos_val - shocked_val, 2)
            })

        # Calculate projected drawdown from peak
        peak = max(portfolio.peak_portfolio_value, metrics.total_portfolio_value)
        projected_drawdown_pct = ((peak - shocked_total_value) / peak) * 100.0 if peak > 0 else 0.0

        return {
            "scenario": f"Market Index Drop {market_drop_pct:.1f}%",
            "market_drop_pct": market_drop_pct,
            "starting_portfolio_value": round(metrics.total_portfolio_value, 2),
            "cash_buffer_inr": round(cash, 2),
            "projected_holdings_value": round(shocked_holdings_val, 2),
            "projected_portfolio_value": round(shocked_total_value, 2),
            "estimated_loss_inr": round(portfolio_loss_inr, 2),
            "portfolio_impact_pct": round(-portfolio_loss_pct, 2),
            "projected_drawdown_pct": round(projected_drawdown_pct, 2),
            "risk_assessment": (
                "CRITICAL_HALT" if projected_drawdown_pct >= 15.0 else
                "HIGH_VOLATILITY" if projected_drawdown_pct >= 10.0 else "MANAGED"
            ),
            "position_impacts": position_impacts
        }

    @staticmethod
    def simulate_single_stock_collapse(
        db: Session,
        portfolio: Portfolio,
        symbol: str,
        collapse_pct: float = -25.0
    ) -> Dict[str, Any]:
        """Simulates single-stock black-swan gap-down."""
        metrics = portfolio_ledger.calculate_metrics(db, portfolio)
        pos = db.query(Position).filter(Position.portfolio_id == portfolio.id, Position.symbol == symbol).first()

        if not pos:
            return {
                "error": f"Symbol {symbol} not found in active portfolio positions.",
                "total_portfolio_value": round(metrics.total_portfolio_value, 2)
            }

        pos_val = pos.quantity * pos.current_price
        loss_inr = pos_val * (abs(collapse_pct) / 100.0)
        projected_total = metrics.total_portfolio_value - loss_inr

        return {
            "symbol": symbol,
            "collapse_pct": collapse_pct,
            "position_value": round(pos_val, 2),
            "loss_inr": round(loss_inr, 2),
            "starting_total_value": round(metrics.total_portfolio_value, 2),
            "projected_total_value": round(projected_total, 2),
            "portfolio_drag_pct": round((loss_inr / metrics.total_portfolio_value) * 100.0, 2) if metrics.total_portfolio_value > 0 else 0.0
        }
