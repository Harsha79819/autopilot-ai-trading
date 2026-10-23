"""Tests for fundamental health gate, penny stock rejection, 20% position sizing, and stop-loss rules."""
import pytest
from datetime import datetime
from backend.app.scanner.fundamental_gate import fundamental_gate, FundamentalMetrics
from backend.app.risk.risk_manager import risk_manager
from backend.app.risk.kill_switch import kill_switch_manager
from backend.app.models.order import Order
from backend.app.models.trade import Trade
from backend.app.schemas.market import Quote


def make_test_quote(symbol: str, price: float) -> Quote:
    return Quote(
        symbol=symbol,
        company_name=f"{symbol} Test Co",
        current_price=price,
        open=price,
        high=price * 1.01,
        low=price * 0.99,
        previous_close=price,
        change=0.0,
        change_pct=0.0,
        bid=round(price * 0.999, 2),
        ask=round(price * 1.001, 2),
        spread_pct=0.15,
        volume=500000,
        timestamp=datetime.utcnow(),
        is_stale=False,
        is_demo=False
    )


def test_penny_stock_cutoff_rejects_sub_100_inr():
    """Stocks priced under ₹100 (IDEA, SUZLON, YESBANK) must be disqualified as penny/speculative."""
    # IDEA at ₹12.28
    passed, reason, _ = fundamental_gate.evaluate("IDEA", 12.28)
    assert not passed
    assert "Penny/Micro-cap rejected" in reason
    assert "cutoff ₹100.00" in reason

    # SUZLON at ₹40.38
    passed, reason, _ = fundamental_gate.evaluate("SUZLON", 40.38)
    assert not passed
    assert "Penny/Micro-cap rejected" in reason


def test_fundamental_health_rejects_high_debt():
    """Companies with Debt-to-Equity >= 1.0 (e.g., TATAMOTORS, NTPC) must be rejected."""
    # TATAMOTORS price ₹840 (above ₹100), but D/E = 1.65
    passed, reason, metrics = fundamental_gate.evaluate("TATAMOTORS", 840.00)
    assert not passed
    assert "Debt-to-Equity" in reason
    assert metrics is not None
    assert metrics.debt_to_equity >= 1.0


def test_fundamental_health_rejects_low_roe():
    """Companies with ROE <= 12% (e.g., TATASTEEL, RELIANCE) must be rejected."""
    # TATASTEEL price ₹150 (above ₹100), D/E 0.82 (< 1.0), but ROE = 8.5%
    passed, reason, metrics = fundamental_gate.evaluate("TATASTEEL", 150.00)
    assert not passed
    assert "Return on Equity" in reason
    assert metrics is not None
    assert metrics.roe_pct <= 12.0


def test_fundamental_health_accepts_quality_large_caps():
    """High-quality companies (INFY, TCS, ITC, BEL) passing all criteria must be accepted."""
    for sym, price in [("INFY", 1475.0), ("TCS", 3850.0), ("ITC", 440.0), ("BEL", 288.0)]:
        passed, reason, metrics = fundamental_gate.evaluate(sym, price)
        assert passed, f"{sym} should have passed: {reason}"
        assert metrics.debt_to_equity < 1.0
        assert metrics.roe_pct > 12.0
        assert metrics.profit_trajectory_positive is True


def test_unregistered_symbol_disqualified():
    """Symbols without verified fundamental records must be disqualified from auto-buy."""
    passed, reason, metrics = fundamental_gate.evaluate("UNKNOWN_TICKER", 250.0)
    assert not passed
    assert "Fundamental data unavailable" in reason
    assert metrics is None


def test_position_sizing_cap_20_percent(db, test_user):
    """Pre-trade risk verification must reject BUY orders exceeding 20% of total portfolio value."""
    portfolio = test_user.portfolio
    portfolio.cash_balance = 1000.00
    portfolio.initial_cash = 1000.00
    portfolio.peak_portfolio_value = 1000.00
    db.commit()

    # 20% of ₹1000 portfolio = ₹200.00 cap
    # 1 share of INFY @ ₹1475 exceeds ₹200 cap -> REJECT
    passed, reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="INFY",
        side="BUY",
        quantity=1,
        price=1475.00
    )
    assert not passed
    assert "exceeds max allowed allocation" in reason
    assert "20.0% of portfolio value" in reason

    # 1 share of TATASTEEL @ ₹150 is <= ₹200 cap -> PASS
    passed, reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="TATASTEEL",
        side="BUY",
        quantity=1,
        price=150.00
    )
    assert passed
    assert "Pre-trade risk verification passed" in reason


def test_stop_loss_sell_permitted_during_risk_halt(db, test_user):
    """When kill-switch or daily loss halt is active, position-closing SELL must be allowed."""
    portfolio = test_user.portfolio
    kill_switch_manager.set_emergency_stop(db, portfolio, activate=True, reason="Emergency Halt")

    # BUY order must be blocked
    buy_passed, buy_reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="BEL",
        side="BUY",
        quantity=1,
        price=288.00
    )
    assert not buy_passed
    assert "Emergency Stop / Kill Switch is active" in buy_reason

    # SELL order (stop-loss protection) must be PERMITTED
    sell_passed, sell_reason = risk_manager.validate_pre_trade_risk(
        db=db,
        portfolio=portfolio,
        symbol="BEL",
        side="SELL",
        quantity=1,
        price=280.00
    )
    assert sell_passed
    assert "position-closing SELL permitted" in sell_reason
