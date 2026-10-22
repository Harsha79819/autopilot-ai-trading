"""Test stale market data detection and rejection."""
import pytest
from datetime import datetime, timedelta
from backend.app.schemas.market import Quote
from backend.app.market_data.staleness_detector import staleness_detector
from backend.app.paper_engine.execution_simulator import execution_simulator


def test_staleness_detector():
    """Quotes older than threshold (30s) must be detected as stale."""
    fresh_time = datetime.utcnow()
    stale_time = datetime.utcnow() - timedelta(seconds=45)

    fresh_quote = Quote(
        symbol="SUZLON",
        company_name="Suzlon",
        current_price=54.50,
        open=54.50,
        high=54.50,
        low=54.50,
        previous_close=54.50,
        change=0.0,
        change_pct=0.0,
        bid=54.45,
        ask=54.55,
        spread_pct=0.18,
        volume=10000,
        timestamp=fresh_time,
        is_stale=False,
        is_demo=True
    )

    stale_quote = fresh_quote.model_copy()
    stale_quote.timestamp = stale_time

    is_fresh_1, age_1 = staleness_detector.check_quote_freshness(fresh_quote)
    assert is_fresh_1
    assert age_1 < 5

    is_fresh_2, age_2 = staleness_detector.check_quote_freshness(stale_quote)
    assert not is_fresh_2
    assert age_2 >= 45


def test_execution_simulator_rejects_stale_quote():
    """Simulated order must reject execution on stale market data."""
    stale_quote = Quote(
        symbol="SUZLON",
        company_name="Suzlon",
        current_price=54.50,
        open=54.50,
        high=54.50,
        low=54.50,
        previous_close=54.50,
        change=0.0,
        change_pct=0.0,
        bid=54.45,
        ask=54.55,
        spread_pct=0.18,
        volume=10000,
        timestamp=datetime.utcnow() - timedelta(seconds=60),
        is_stale=True,
        is_demo=True
    )

    res = execution_simulator.simulate_order(
        symbol="SUZLON",
        side="BUY",
        quantity=1,
        quote=stale_quote,
        available_cash=100.00
    )
    assert not res.is_fillable
    assert "Stale market data detected" in res.rejection_reason
