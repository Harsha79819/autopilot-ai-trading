"""Automated tests for stress testing and what-if scenario simulations."""
import pytest
from backend.app.services.scenario_simulator import ScenarioSimulator
from backend.app.models.position import Position


def test_market_shock_simulation(db, test_user):
    """Verify that simulated market decline accurately models holdings loss and capital preservation."""
    portfolio = test_user.portfolio

    # Add a dummy holding
    pos = Position(
        portfolio_id=portfolio.id,
        symbol="INFY",
        quantity=2,
        average_buy_price=1500.0,
        current_price=1500.0,
        unrealized_pnl=0.0
    )
    db.add(pos)
    db.commit()

    # Simulate -10% market crash
    res = ScenarioSimulator.simulate_market_shock(db, portfolio, market_drop_pct=-10.0)

    assert res["market_drop_pct"] == -10.0
    # Holdings were ₹3,000; a -10% drop loses ₹300 on holdings
    assert res["projected_holdings_value"] == 2700.0
    assert res["estimated_loss_inr"] == 300.0
    assert len(res["position_impacts"]) == 1
    assert res["position_impacts"][0]["loss_inr"] == 300.0


def test_single_stock_collapse_simulation(db, test_user):
    """Verify that single stock gap-down is isolated accurately."""
    portfolio = test_user.portfolio

    pos = Position(
        portfolio_id=portfolio.id,
        symbol="TCS",
        quantity=1,
        average_buy_price=3500.0,
        current_price=3500.0,
        unrealized_pnl=0.0
    )
    db.add(pos)
    db.commit()

    res = ScenarioSimulator.simulate_single_stock_collapse(db, portfolio, symbol="TCS", collapse_pct=-20.0)
    assert res["symbol"] == "TCS"
    assert res["position_value"] == 3500.0
    assert res["loss_inr"] == 700.0
    assert res["projected_total_value"] == res["starting_total_value"] - 700.0
