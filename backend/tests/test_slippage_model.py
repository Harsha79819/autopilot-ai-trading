"""Tests for Task 11: Dynamic Liquidity-Adjusted Slippage Model."""
import pytest
from datetime import datetime
from backend.app.schemas.market import Quote
from backend.app.paper_engine.execution_simulator import ExecutionSimulator, execution_simulator
from backend.app.config import settings


def make_quote_with_volume(symbol: str, price: float, volume: int) -> Quote:
    return Quote(
        symbol=symbol,
        company_name=f"{symbol} Ltd",
        current_price=price,
        open=price,
        high=price * 1.01,
        low=price * 0.99,
        close=price,
        previous_close=price,
        change=0.0,
        change_pct=0.0,
        bid=round(price * 0.999, 2),
        ask=round(price * 1.001, 2),
        spread_pct=0.2,
        volume=volume,
        timestamp=datetime.utcnow(),
        is_stale=False,
    )


def test_liquid_large_cap_floor_slippage():
    # Reliance / TCS with 5M volume, 1 share
    quote = make_quote_with_volume("RELIANCE", 2500.0, 5_000_000)
    slippage_bps = ExecutionSimulator.calculate_slippage_bps(quantity=1, quote=quote)
    # Must respect the 7.5 bps floor
    assert slippage_bps >= 7.5
    assert slippage_bps < 8.0  # Minimal market impact


def test_moderate_volume_slippage():
    # Mid-cap with 500k volume
    quote = make_quote_with_volume("MIDCAP", 500.0, 500_000)
    slippage_bps = ExecutionSimulator.calculate_slippage_bps(quantity=10, quote=quote)
    # 7.5 floor + 2.5 moderate volume penalty = ~10 bps
    assert slippage_bps >= 10.0


def test_illiquid_small_cap_slippage():
    # Illiquid micro-cap with only 25k daily volume
    quote = make_quote_with_volume("MICROCAP", 100.0, 25_000)
    slippage_bps = ExecutionSimulator.calculate_slippage_bps(quantity=50, quote=quote)
    # 7.5 floor + 12.5 illiquid penalty + market impact >= 20.0 bps
    assert slippage_bps >= 20.0


def test_market_impact_scales_with_order_size():
    quote = make_quote_with_volume("STOCK_A", 200.0, 100_000)
    small_order_bps = ExecutionSimulator.calculate_slippage_bps(quantity=10, quote=quote)
    large_order_bps = ExecutionSimulator.calculate_slippage_bps(quantity=10_000, quote=quote)

    # Large order (10% of daily volume) must incur significantly higher slippage
    assert large_order_bps > small_order_bps
    assert large_order_bps - small_order_bps >= 5.0


def test_calculate_execution_price_buy_and_sell():
    quote = make_quote_with_volume("INFY", 1000.0, 2_000_000)
    bm_buy, exec_buy, bps_buy = ExecutionSimulator.calculate_execution_price("INFY", "BUY", 10, quote)
    assert exec_buy > bm_buy
    assert bps_buy >= 7.5

    bm_sell, exec_sell, bps_sell = ExecutionSimulator.calculate_execution_price("INFY", "SELL", 10, quote)
    assert exec_sell < bm_sell
    assert bps_sell >= 7.5


def test_simulate_order_applies_dynamic_slippage():
    quote = make_quote_with_volume("SUZLON", 50.0, 10_000_000)
    res = execution_simulator.simulate_order(
        symbol="SUZLON",
        side="BUY",
        quantity=100,
        quote=quote,
        available_cash=10000.0
    )
    assert res.is_fillable
    assert res.fees.slippage_amount > 0
    # Gross amount + fees
    assert res.net_cash_impact < -res.gross_amount
