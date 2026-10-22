"""Test whole-share constraints and INR 100 capital gating."""
import pytest
from datetime import datetime
from backend.app.schemas.market import Quote
from backend.app.paper_engine.execution_simulator import execution_simulator


def make_quote(symbol: str, price: float) -> Quote:
    return Quote(
        symbol=symbol,
        company_name=symbol,
        current_price=price,
        open=price,
        high=price,
        low=price,
        previous_close=price,
        change=0.0,
        change_pct=0.0,
        bid=round(price * 0.999, 2),
        ask=round(price * 1.001, 2),
        spread_pct=0.20,
        volume=100000,
        timestamp=datetime.utcnow(),
        is_stale=False,
        is_demo=True
    )


def test_reject_fractional_shares():
    """Fractional quantities must be rejected immediately."""
    quote = make_quote("IDEA", 7.50)
    # Quantity 0 or fractional float
    res = execution_simulator.simulate_order("IDEA", "BUY", quantity=0, quote=quote, available_cash=100.0)
    assert not res.is_fillable
    assert "Whole-share constraint violated" in res.rejection_reason


def test_reject_unaffordable_stock_above_100_inr():
    """Stocks priced above ₹100 cannot be purchased with ₹100 virtual cash."""
    quote = make_quote("TATAMOTORS", 845.00)
    res = execution_simulator.simulate_order("TATAMOTORS", "BUY", quantity=1, quote=quote, available_cash=100.00)
    assert not res.is_fillable
    assert "Insufficient available cash" in res.rejection_reason


def test_reject_unaffordable_stock_above_500_inr():
    """Stocks priced above ₹500 (like TATAMOTORS at ₹845) cannot be purchased with ₹500 cash."""
    quote = make_quote("TATAMOTORS", 845.00)
    res = execution_simulator.simulate_order("TATAMOTORS", "BUY", quantity=1, quote=quote, available_cash=500.00)
    assert not res.is_fillable
    assert "Insufficient available cash" in res.rejection_reason


def test_allow_affordable_stock_under_500_inr():
    """Stocks priced under ₹500 (like ZOMATO at ₹92.80) can be purchased with ₹500 cash."""
    quote = make_quote("ZOMATO", 92.80)
    res = execution_simulator.simulate_order("ZOMATO", "BUY", quantity=1, quote=quote, available_cash=500.00)
    assert res.is_fillable
    assert res.quantity == 1
    assert abs(res.net_cash_impact) <= 500.00


def test_allow_affordable_stock_under_100_inr():
    """Stocks priced under ₹100 with whole shares can be purchased with ₹100 virtual cash."""
    quote = make_quote("SUZLON", 54.50)
    res = execution_simulator.simulate_order("SUZLON", "BUY", quantity=1, quote=quote, available_cash=100.00)
    assert res.is_fillable
    assert res.quantity == 1
    assert res.gross_amount > 0
    assert abs(res.net_cash_impact) <= 100.00


def test_multiple_affordable_shares():
    """Can purchase multiple whole shares if total value + fees is within cash balance."""
    quote = make_quote("IDEA", 7.50)
    # 10 shares of ₹7.50 = ₹75.00 (+ fees < ₹100) -> allowed
    res_10 = execution_simulator.simulate_order("IDEA", "BUY", quantity=10, quote=quote, available_cash=100.00)
    assert res_10.is_fillable

    # 20 shares of ₹7.50 = ₹150.00 -> rejected
    res_20 = execution_simulator.simulate_order("IDEA", "BUY", quantity=20, quote=quote, available_cash=100.00)
    assert not res_20.is_fillable
    assert "Insufficient available cash" in res_20.rejection_reason
