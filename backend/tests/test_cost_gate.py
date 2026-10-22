"""Test Cost-Aware Gate and No-Trade decisions."""
import pytest
from datetime import datetime
from backend.app.schemas.market import Quote
from backend.app.strategies.cost_gate import cost_aware_gate


def make_quote(price: float = 100.0, spread_pct: float = 0.20) -> Quote:
    return Quote(
        symbol="TEST",
        company_name="Test Company",
        current_price=price,
        open=price,
        high=price,
        low=price,
        previous_close=price,
        change=0.0,
        change_pct=0.0,
        bid=round(price * (1 - spread_pct / 200), 2),
        ask=round(price * (1 + spread_pct / 200), 2),
        spread_pct=spread_pct,
        volume=50000,
        timestamp=datetime.utcnow(),
        is_stale=False,
        is_demo=True
    )


def test_cost_gate_rejects_insufficient_edge():
    """Cost-Aware Gate must fail and trigger NO_TRADE when expected move does not clear hurdle rate."""
    quote = make_quote(price=50.0, spread_pct=0.20)
    # Expected return of only 0.3% is too low for 3x friction
    res = cost_aware_gate.evaluate(quote, expected_move_pct=0.30, multiplier_k=3.0)
    assert not res.passed
    assert res.hurdle_rate_pct > 0.30
    assert "Cost gate FAILED (NO TRADE)" in res.reason


def test_cost_gate_passes_strong_edge():
    """Cost-Aware Gate must pass when expected edge comfortably clears 3x transaction friction."""
    quote = make_quote(price=50.0, spread_pct=0.10)
    # Expected return of 3.5% clears hurdle rate
    res = cost_aware_gate.evaluate(quote, expected_move_pct=3.50, multiplier_k=3.0)
    assert res.passed
    assert res.expected_move_pct >= res.hurdle_rate_pct
    assert "Cost gate PASSED" in res.reason
