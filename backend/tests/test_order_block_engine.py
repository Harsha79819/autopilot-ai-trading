import pytest
import pandas as pd
import numpy as np

try:
    from backend.app.scanner.order_block_engine import OrderBlockEngine
except ImportError:
    from app.scanner.order_block_engine import OrderBlockEngine

def test_order_block_detection_bullish():
    engine = OrderBlockEngine(min_rr=1.2)
    
    # Construct synthetic 5m candles: consolidation, red candle (OB), then impulsive green breakout
    records = []
    price = 1000.0
    for i in range(20):
        records.append({'open': price, 'high': price + 2, 'low': price - 2, 'close': price + 1, 'volume': 10000})
        price += 0.5
        
    # The Order Block Red Candle
    records.append({'open': 1010.0, 'high': 1011.0, 'low': 1005.0, 'close': 1006.0, 'volume': 25000})
    # Impulsive Breakout Green Candles
    records.append({'open': 1006.0, 'high': 1022.0, 'low': 1006.0, 'close': 1020.0, 'volume': 50000})
    records.append({'open': 1020.0, 'high': 1030.0, 'low': 1019.0, 'close': 1028.0, 'volume': 40000})

    df = pd.DataFrame(records)
    result = engine.analyze_symbol("TEST_STOCK", df)

    assert result is not None
    assert result['type'] == 'BULLISH'
    assert result['zone_z'] == 1011.0
    assert result['invalidation'] == 1005.0
    assert result['risk_per_share'] == 6.0
    assert result['rr_ratio'] >= 1.2
