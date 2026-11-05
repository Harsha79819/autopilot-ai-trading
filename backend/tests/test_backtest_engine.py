"""Unit and integration tests for BacktestingEngine with next-bar open execution."""
import pytest
from datetime import datetime, timedelta

from backend.app.schemas.backtest import BacktestRequest, BacktestResponse
from backend.app.schemas.strategy import StrategySignal, CostGateResult
from backend.app.schemas.market import Candle
from backend.app.backtesting.engine import BacktestingEngine
from backend.app.strategies.base import BaseStrategy


def make_mock_cost_gate(passed=True):
    return CostGateResult(
        passed=passed,
        multiplier_k=1.5,
        expected_move_pct=2.0,
        round_trip_cost_pct=0.2,
        spread_pct=0.1,
        slippage_pct=0.05,
        total_friction_pct=0.35,
        hurdle_rate_pct=0.525,
        reason="Passed" if passed else "Failed"
    )


class MockPredictableStrategy(BaseStrategy):
    """Predictable strategy for deterministic backtest assertions."""

    def __init__(self):
        super().__init__("MockPredictable", "Predictable Mock", "Predictable mock strategy for testing")

    def get_entry_conditions(self): return ["Price < 100"]
    def get_exit_conditions(self): return ["Price >= 105"]
    def get_assumptions(self): return ["Liquid market"]
    def get_risk_limits(self): return ["Max 1 position"]
    def get_required_market_data(self): return ["5m candles"]
    def get_known_limitations(self): return ["Mock strategy only"]
    def get_default_parameters(self): return {"threshold": 100.0}

    def evaluate(self, quote, candles, owned_quantity=0, available_cash=100.0) -> StrategySignal:
        if quote.current_price < 100.0 and owned_quantity == 0:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="BUY",
                confidence=0.9,
                rationale="Oversold entry",
                timestamp=quote.timestamp,
                price=quote.current_price,
                suggested_quantity=1,
                cost_gate=make_mock_cost_gate(True),
                is_actionable=True
            )
        elif quote.current_price >= 105.0 and owned_quantity > 0:
            return StrategySignal(
                strategy_name=self.name,
                symbol=quote.symbol,
                action="SELL",
                confidence=0.9,
                rationale="Target hit exit",
                timestamp=quote.timestamp,
                price=quote.current_price,
                suggested_quantity=owned_quantity,
                cost_gate=make_mock_cost_gate(True),
                is_actionable=True
            )
        return StrategySignal(
            strategy_name=self.name,
            symbol=quote.symbol,
            action="HOLD",
            confidence=0.5,
            rationale="Hold",
            timestamp=quote.timestamp,
            price=quote.current_price,
            suggested_quantity=0,
            cost_gate=make_mock_cost_gate(True),
            is_actionable=False
        )


@pytest.fixture
def synthetic_candles():
    """Generates 60 synthetic 5m candles with known price oscillation."""
    candles = []
    base_time = datetime(2026, 1, 5, 9, 15)
    history_pad = [102.0 for _ in range(20)]
    prices = [
        102.0, 101.5, 101.0, 100.5, 99.0,   # Bar 24 triggers BUY signal on close (99.0 < 100)
        99.5, 100.0, 102.0, 104.0, 106.0,  # Bar 25 opens at 99.3 -> fills BUY here!
        107.0, 105.5, 103.0, 101.0, 98.5,  # Bar 29 triggers SELL signal on close (106 >= 105)
        99.0, 100.5, 103.0, 106.0, 108.0   # Bar 30 opens at 106.8 -> fills SELL here!
    ]
    full_prices = history_pad + prices + [102.0 + (i % 5) for i in range(20)]

    for idx, p in enumerate(full_prices):
        t = base_time + timedelta(minutes=idx * 5)
        candles.append(Candle(
            symbol="TESTSYM",
            open=round(p - 0.2, 2),
            high=round(p + 0.8, 2),
            low=round(p - 0.5, 2),
            close=round(p, 2),
            volume=500_000,
            timestamp=t,
            timeframe="5m"
        ))
    return candles


def test_next_bar_open_fill_eliminates_lookahead(monkeypatch, synthetic_candles):
    """
    Verifies that a signal generated on bar i's close executes at bar i+1's open,
    NOT on bar i's close (eliminating look-ahead bias).
    """
    engine = BacktestingEngine()
    monkeypatch.setattr("backend.app.backtesting.engine.history_cache.get_cached_candles", lambda *args, **kwargs: synthetic_candles)
    monkeypatch.setitem(
        __import__("backend.app.strategies", fromlist=["STRATEGY_REGISTRY"]).STRATEGY_REGISTRY,
        "MockPredictable",
        MockPredictableStrategy()
    )

    req = BacktestRequest(
        strategy_name="MockPredictable",
        symbol="TESTSYM",
        initial_capital=5000.0,
        train_split_pct=60.0,
        val_split_pct=20.0,
        test_split_pct=20.0,
        slippage_bps=0.0
    )

    resp = engine.run_backtest(req)
    assert isinstance(resp, BacktestResponse)
    assert resp.total_trades >= 1

    first_trade = resp.sample_trades[0]
    # The BUY was triggered when close was 99.0 (bar index 24).
    # Next bar (bar index 25) had open = 99.3.
    # Entry price is filled at bar 25 open + dynamic slippage, NOT bar 24's close!
    assert first_trade.entry_price >= synthetic_candles[25].open
    assert abs(first_trade.entry_price - synthetic_candles[25].open) < 0.5
    assert first_trade.entry_price != synthetic_candles[24].close


def test_dynamic_slippage_and_fee_frictions(monkeypatch, synthetic_candles):
    """
    Verifies that dynamic liquidity-adjusted slippage and Indian statutory taxes
    are applied to reduce gross return to realistic net return.
    """
    engine = BacktestingEngine()
    monkeypatch.setattr("backend.app.backtesting.engine.history_cache.get_cached_candles", lambda *args, **kwargs: synthetic_candles)
    monkeypatch.setitem(
        __import__("backend.app.strategies", fromlist=["STRATEGY_REGISTRY"]).STRATEGY_REGISTRY,
        "MockPredictable",
        MockPredictableStrategy()
    )

    req = BacktestRequest(
        strategy_name="MockPredictable",
        symbol="TESTSYM",
        initial_capital=5000.0,
        train_split_pct=60.0,
        val_split_pct=20.0,
        test_split_pct=20.0,
        slippage_bps=10.0
    )

    resp = engine.run_backtest(req)
    assert resp.total_fees_paid > 0.0
    assert resp.net_return_pct < resp.gross_return_pct
    assert resp.cost_drag_pct >= 0.0


def test_chronological_splits_and_benchmark(monkeypatch, synthetic_candles):
    """Verifies that Train, Validation, and Test splits are generated with benchmark comparison."""
    engine = BacktestingEngine()
    monkeypatch.setattr("backend.app.backtesting.engine.history_cache.get_cached_candles", lambda *args, **kwargs: synthetic_candles)
    monkeypatch.setitem(
        __import__("backend.app.strategies", fromlist=["STRATEGY_REGISTRY"]).STRATEGY_REGISTRY,
        "MockPredictable",
        MockPredictableStrategy()
    )

    req = BacktestRequest(
        strategy_name="MockPredictable",
        symbol="TESTSYM",
        initial_capital=10000.0,
        train_split_pct=50.0,
        val_split_pct=25.0,
        test_split_pct=25.0
    )

    resp = engine.run_backtest(req)
    assert len(resp.splits) == 3
    split_names = [s.split_name for s in resp.splits]
    assert split_names == ["Train", "Validation", "Test"]

    assert resp.benchmark_symbol == "TESTSYM"
    expected_b_ret = round(((synthetic_candles[-1].close - synthetic_candles[0].close) / synthetic_candles[0].close) * 100.0, 2)
    assert resp.benchmark_return_pct == expected_b_ret


def test_multi_symbol_universe_backtest(monkeypatch, synthetic_candles):
    """Verifies multi-symbol universe portfolio backtesting with shared capital."""
    engine = BacktestingEngine()

    def mock_get_candles(sym, **kwargs):
        return [
            Candle(
                symbol=sym,
                open=c.open,
                high=c.high,
                low=c.low,
                close=c.close,
                volume=c.volume,
                timestamp=c.timestamp,
                timeframe="5m"
            )
            for c in synthetic_candles
        ]

    monkeypatch.setattr("backend.app.backtesting.engine.history_cache.get_cached_candles", mock_get_candles)
    monkeypatch.setitem(
        __import__("backend.app.strategies", fromlist=["STRATEGY_REGISTRY"]).STRATEGY_REGISTRY,
        "MockPredictable",
        MockPredictableStrategy()
    )

    req = BacktestRequest(
        strategy_name="MockPredictable",
        symbol="INFY,TCS",
        symbols=["INFY", "TCS"],
        initial_capital=10000.0,
        train_split_pct=60.0,
        val_split_pct=20.0,
        test_split_pct=20.0
    )

    resp = engine.run_backtest(req)
    assert resp.symbol == "UNIVERSE"
    assert "INFY" in resp.symbols_tested
    assert "TCS" in resp.symbols_tested
    assert resp.benchmark_symbol == "NIFTY_UNIVERSE_EQUAL_WEIGHT"
    assert len(resp.equity_curve) > 0


def test_invalid_strategy_raises_error():
    """Verifies error raised when strategy name does not exist."""
    engine = BacktestingEngine()
    req = BacktestRequest(
        strategy_name="NonExistentStrategy123",
        symbol="INFY",
        initial_capital=5000.0
    )
    with pytest.raises(ValueError, match="not found in registry"):
        engine.run_backtest(req)
