"""
Order Block & Liquidity Detection Engine
Reverse engineered from institutional order block mechanics (5-minute finished candles).
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime

class OrderBlockEngine:
    def __init__(self, min_rr: float = 1.5, swing_window: int = 5):
        self.min_rr = min_rr
        self.swing_window = swing_window

    def compute_vwap(self, df: pd.DataFrame) -> pd.Series:
        """Calculates Volume Weighted Average Price (VWAP)."""
        typical_price = (df['high'] + df['low'] + df['close']) / 3.0
        cumulative_tp_vol = (typical_price * df['volume']).cumsum()
        cumulative_vol = df['volume'].cumsum()
        return cumulative_tp_vol / cumulative_vol.replace(0, np.nan)

    def detect_swings(self, df: pd.DataFrame) -> pd.DataFrame:
        """Identifies local swing highs and swing lows."""
        k = self.swing_window
        df['is_swing_high'] = df['high'] == df['high'].rolling(window=2*k+1, center=True).max()
        df['is_swing_low'] = df['low'] == df['low'].rolling(window=2*k+1, center=True).min()
        return df

    def analyze_symbol(self, symbol: str, ohlcv_5m: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """
        Processes 5-minute finished candles for a symbol.
        Returns the active order block setup, zone levels, liquidity targets, and R:R.
        """
        if ohlcv_5m is None or len(ohlcv_5m) < 20:
            return None

        df = ohlcv_5m.copy()
        if 'vwap' not in df.columns:
            df['vwap'] = self.compute_vwap(df)
            
        df = self.detect_swings(df)
        df['is_red'] = df['close'] < df['open']
        df['is_green'] = df['close'] > df['open']
        
        current_price = float(df['close'].iloc[-1])
        current_vwap = float(df['vwap'].iloc[-1])
        day_open = float(df['open'].iloc[0])
        day_high = float(df['high'].max())
        day_low = float(df['low'].min())
        pct_change = round(((current_price - day_open) / day_open) * 100, 2)

        active_setup = None

        # Look back from latest finished candle for Break of Structure (BOS)
        n = len(df)
        for i in range(n - 1, max(5, n - 20), -1):
            curr_c = df['close'].iloc[i]
            prev_c = df['close'].iloc[i - 1]

            # ----------------- 1. BULLISH ORDER BLOCK -----------------
            # Prior swing high broken with closed candle
            recent_highs = df['high'].iloc[:i]
            swing_highs = df.iloc[:i].loc[df.iloc[:i]['is_swing_high'], 'high']
            ref_high = swing_highs.iloc[-1] if len(swing_highs) > 0 else recent_highs.iloc[-15:].max()

            if curr_c > ref_high and prev_c <= ref_high:
                # Find last red candle before this impulsive rally
                for j in range(i - 1, max(0, i - 8), -1):
                    if df['is_red'].iloc[j]:
                        ob_high = float(df['high'].iloc[j])
                        ob_low = float(df['low'].iloc[j])
                        zone_z = ob_high
                        stop_s1 = ob_low
                        risk_per_share = round(zone_z - stop_s1, 2)

                        # Find liquidity target (R1 & R2)
                        unmitigated_highs = [h for h in recent_highs if h > zone_z]
                        target_r1 = float(min(unmitigated_highs)) if unmitigated_highs else round(day_high, 2)
                        target_r2 = round(max(day_high, target_r1 * 1.01), 2)

                        reward = target_r2 - zone_z
                        rr_ratio = round(reward / risk_per_share, 2) if risk_per_share > 0 else 0.0
                        vwap_aligned = current_price >= current_vwap

                        # Invalidation check: did any 5m candle close below S1 since formation?
                        invalidated = any(df['close'].iloc[j+1:] < stop_s1)

                        if not invalidated and risk_per_share > 0 and rr_ratio >= self.min_rr:
                            active_setup = {
                                "symbol": symbol,
                                "type": "BULLISH",
                                "current_price": current_price,
                                "day_pct": pct_change,
                                "vwap": current_vwap,
                                "vwap_aligned": vwap_aligned,
                                "zone_z": zone_z,
                                "invalidation": stop_s1,
                                "stop_label": "S1",
                                "target_r1": target_r1,
                                "target_r2": target_r2,
                                "risk_per_share": risk_per_share,
                                "rr_ratio": rr_ratio,
                                "ob_time": str(df.index[j]),
                                "candle_low": ob_low,
                                "candle_high": ob_high
                            }
                            break
                if active_setup:
                    break

            # ----------------- 2. BEARISH ORDER BLOCK -----------------
            recent_lows = df['low'].iloc[:i]
            swing_lows = df.iloc[:i].loc[df.iloc[:i]['is_swing_low'], 'low']
            ref_low = swing_lows.iloc[-1] if len(swing_lows) > 0 else recent_lows.iloc[-15:].min()

            if curr_c < ref_low and prev_c >= ref_low:
                for j in range(i - 1, max(0, i - 8), -1):
                    if df['is_green'].iloc[j]:
                        ob_high = float(df['high'].iloc[j])
                        ob_low = float(df['low'].iloc[j])
                        zone_z = ob_low
                        stop_r1 = ob_high
                        risk_per_share = round(stop_r1 - zone_z, 2)

                        unmitigated_lows = [l for l in recent_lows if l < zone_z]
                        target_s1 = float(max(unmitigated_lows)) if unmitigated_lows else round(day_low, 2)
                        target_s2 = round(min(day_low, target_s1 * 0.99), 2)

                        reward = zone_z - target_s2
                        rr_ratio = round(reward / risk_per_share, 2) if risk_per_share > 0 else 0.0
                        vwap_aligned = current_price <= current_vwap

                        invalidated = any(df['close'].iloc[j+1:] > stop_r1)

                        if not invalidated and risk_per_share > 0 and rr_ratio >= self.min_rr:
                            active_setup = {
                                "symbol": symbol,
                                "type": "BEARISH",
                                "current_price": current_price,
                                "day_pct": pct_change,
                                "vwap": current_vwap,
                                "vwap_aligned": vwap_aligned,
                                "zone_z": zone_z,
                                "invalidation": stop_r1,
                                "stop_label": "R1",
                                "target_r1": target_s1,
                                "target_r2": target_s2,
                                "risk_per_share": risk_per_share,
                                "rr_ratio": rr_ratio,
                                "ob_time": str(df.index[j]),
                                "candle_low": ob_low,
                                "candle_high": ob_high
                            }
                            break
                if active_setup:
                    break

        return active_setup
