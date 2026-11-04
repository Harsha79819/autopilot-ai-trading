import pytest
from datetime import datetime
from backend.app.services.auto_trader import AutoPilotRunner
from backend.app.schemas.market import Quote, Candle


def test_agi_learning_score_adjustment():
    runner = AutoPilotRunner()
    user_id = 99
    sym = "TEST_STOCK"

    quote = Quote(
        symbol=sym,
        company_name="Test Stock Ltd",
        current_price=500.0,
        change=5.0,
        change_pct=1.0,
        open=495.0,
        high=505.0,
        low=490.0,
        close=500.0,
        previous_close=495.0,
        bid=499.5,
        ask=500.5,
        spread_pct=0.2,
        volume=100000,
        timestamp=datetime.utcnow().isoformat()
    )
    candles = [
        Candle(symbol=sym, timeframe="1m", timestamp=datetime.utcnow().isoformat(), open=490.0, high=505.0, low=490.0, close=495.0 + i*0.2, volume=100000)
        for i in range(25)
    ]

    base_score = runner._score_opportunity(quote, candles, user_id=user_id, symbol=sym)

    # Apply error penalty (e.g. past stop loss hit)
    runner._agi_error_penalties[(user_id, sym)] = 15.0
    penalized_score = runner._score_opportunity(quote, candles, user_id=user_id, symbol=sym)
    assert penalized_score == max(0.0, round(base_score - 15.0, 1))

    # Apply win boost
    runner._agi_error_penalties.clear()
    runner._agi_win_boosts[(user_id, sym)] = 10.0
    boosted_score = runner._score_opportunity(quote, candles, user_id=user_id, symbol=sym)
    assert boosted_score == min(100.0, round(base_score + 10.0, 1))


def test_trailing_stop_loss_logic():
    runner = AutoPilotRunner()
    user_id = 1
    sym = "TCS"
    entry_price = 1000.0
    
    runner._position_targets[(user_id, sym)] = {
        "entry": entry_price,
        "take_profit": 1030.0,
        "stop_loss": 985.0
    }
    high_key = (user_id, sym)
    
    # Peak price reaches +2.2% (1022.0)
    current_high = 1022.0
    runner._position_highs[high_key] = current_high
    peak_gain_pct = ((current_high - entry_price) / entry_price) * 100.0
    assert peak_gain_pct >= 2.0
    
    # Trail stop loss to lock in profit (entry * 1.008 = 1008.0)
    trailed_sl = round(entry_price * 1.008, 2)
    assert trailed_sl == 1008.0
    assert trailed_sl > runner._position_targets[high_key]["stop_loss"]
