"""Test Indian equity fee calculations."""
import pytest
from backend.app.paper_engine.fee_calculator import FeeCalculator


def test_intraday_buy_charges():
    """Intraday buy should include brokerage, GST, exchange charges, stamp duty, but NO STT and NO DP charges."""
    fees = FeeCalculator.calculate_fees(
        symbol="ZOMATO",
        side="BUY",
        quantity=1,
        price=100.00,
        is_intraday=True,
        slippage_bps=0.0,
        spread_bps=0.0
    )
    assert fees.stt == 0.0  # STT not charged on intraday buy in Indian markets
    assert fees.dp_charges == 0.0  # DP charges not charged on buys
    assert fees.brokerage > 0.0
    assert fees.exchange_charges > 0.0
    assert fees.gst > 0.0
    assert fees.stamp_duty > 0.0
    assert fees.total_charges > 0.0


def test_intraday_sell_charges():
    """Intraday sell should include 0.025% STT."""
    fees = FeeCalculator.calculate_fees(
        symbol="ZOMATO",
        side="SELL",
        quantity=10,
        price=100.00,  # Turnover = 1000
        is_intraday=True,
        slippage_bps=0.0,
        spread_bps=0.0
    )
    # STT = 1000 * 0.00025 = 0.25
    assert fees.stt == 0.25
    assert fees.dp_charges == 0.0


def test_delivery_sell_dp_charges():
    """Delivery sell must apply flat DP charge (₹15.93) which heavily penalizes small capital."""
    fees = FeeCalculator.calculate_fees(
        symbol="ZOMATO",
        side="SELL",
        quantity=1,
        price=100.00,
        is_intraday=False,
        slippage_bps=0.0,
        spread_bps=0.0
    )
    assert fees.dp_charges == 15.93
    # Demonstrates that on a ₹100 trade, DP charges alone represent ~16% of value!
    assert fees.total_charges >= 15.93


def test_round_trip_cost_pct():
    """Round-trip cost calculation should return realistic friction percentage."""
    pct = FeeCalculator.calculate_round_trip_cost_pct(price=100.00, is_intraday=True)
    assert pct > 0.0
    assert pct < 5.0
