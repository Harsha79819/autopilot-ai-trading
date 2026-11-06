"""
Market Breadth & Sector Flow Service
Tracks 200+ Indian F&O stocks, counts bullish vs bearish, calculates sector flows,
and enforces the 2-picks-per-sector cap.
"""
from typing import Dict, Any, List
from collections import defaultdict
import numpy as np
from datetime import datetime

# Standard NSE F&O Sector Map
NSE_SECTOR_MAP: Dict[str, str] = {
    "HDFCBANK": "Banking", "ICICIBANK": "Banking", "SBIN": "Banking", "AXISBANK": "Banking", "KOTAKBANK": "Banking",
    "INFY": "IT", "TCS": "IT", "WIPRO": "IT", "HCLTECH": "IT", "TECHM": "IT",
    "RELIANCE": "Energy", "ONGC": "Energy", "BPCL": "Energy", "IOC": "Energy", "POWERGRID": "Energy", "COALINDIA": "Energy", "NTPC": "Energy",
    "TATASTEEL": "Metals", "JSWSTEEL": "Metals", "HINDALCO": "Metals", "VEDL": "Metals",
    "SUNPHARMA": "Pharma", "CIPLA": "Pharma", "DRREDDY": "Pharma", "DIVISLAB": "Pharma",
    "TATAMOTORS": "Auto", "MARUTI": "Auto", "M&M": "Auto", "BAJAJ-AUTO": "Auto",
    "ITC": "FMCG", "HINDUNILVR": "FMCG", "NESTLEIND": "FMCG", "BRITANNIA": "FMCG",
    "BAJFINANCE": "Financials", "BAJAJFINSV": "Financials", "CHOLAFIN": "Financials",
    "LT": "Infra", "ADANIENT": "Infra", "ADANIPORTS": "Infra", "ULTRACEMCO": "Cement"
}

class MarketBreadthService:
    def __init__(self):
        self.cached_breadth: Dict[str, Any] = {}

    def compute_breadth_and_picks(self, stock_ticks: List[Dict[str, Any]], ob_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        stock_ticks: list of {'symbol': str, 'change_pct': float, 'last_price': float}
        ob_results: list of active order block objects from OrderBlockEngine
        """
        bullish_count = 0
        bearish_count = 0
        dots = []
        sector_moves = defaultdict(list)

        for tick in stock_ticks:
            sym = tick['symbol']
            pct = tick.get('change_pct', 0.0)
            sector = NSE_SECTOR_MAP.get(sym, 'Others')
            sector_moves[sector].append(pct)

            if pct >= 0:
                bullish_count += 1
            else:
                bearish_count += 1

            dots.append({
                "symbol": sym,
                "pct": pct,
                "sector": sector,
                "is_bullish": pct >= 0
            })

        # Sector aggregates
        sector_summary = []
        for sec, pcts in sector_moves.items():
            if not pcts:
                continue
            avg_pct = round(float(np.mean(pcts)), 2)
            green_count = sum(1 for p in pcts if p > 0)
            sector_summary.append({
                "sector": sec,
                "avg_pct": avg_pct,
                "green_ratio": f"{green_count}/{len(pcts)}",
                "participation_pct": round((green_count / len(pcts)) * 100, 1)
            })

        sector_summary.sort(key=lambda s: s['avg_pct'], reverse=True)
        leading_sector = sector_summary[0] if sector_summary else {"sector": "N/A", "avg_pct": 0.0}
        lagging_sector = sector_summary[-1] if sector_summary else {"sector": "N/A", "avg_pct": 0.0}

        # Match OB results and create Bullish / Bearish boards
        bullish_board = []
        bearish_board = []

        ob_map = {item['symbol']: item for item in ob_results}

        for d in sorted(dots, key=lambda x: x['pct'], reverse=True):
            sym = d['symbol']
            if sym in ob_map and ob_map[sym]['type'] == 'BULLISH':
                ob = ob_map[sym]
                bullish_board.append({**d, **ob})

        for d in sorted(dots, key=lambda x: x['pct']):
            sym = d['symbol']
            if sym in ob_map and ob_map[sym]['type'] == 'BEARISH':
                ob = ob_map[sym]
                bearish_board.append({**d, **ob})

        # Apply SECTOR CAP (Max 2 picks per sector) for Top 3 Picks
        def assign_picks(board: List[Dict[str, Any]], side: str) -> List[Dict[str, Any]]:
            sec_counts = defaultdict(int)
            picks = []
            for item in board:
                sec = item['sector']
                if len(picks) < 3 and sec_counts[sec] < 2:
                    item['is_pick'] = True
                    item['rule_badge'] = f"PICK · {side} #{len(picks) + 1}"
                    sec_counts[sec] += 1
                    picks.append(item)
                else:
                    item['is_pick'] = False
                    if sec_counts[sec] >= 2:
                        item['rule_badge'] = "SECTOR CAP EXCEEDED"
                    else:
                        item['rule_badge'] = "OUTSIDE TOP 3"
            return board[:20]

        top_bullish = assign_picks(bullish_board, "BULLISH")
        top_bearish = assign_picks(bearish_board, "BEARISH")

        result = {
            "counts": {
                "bullish": bullish_count,
                "bearish": bearish_count,
                "total": len(dots)
            },
            "leading_sector": leading_sector,
            "lagging_sector": lagging_sector,
            "sectors": sector_summary,
            "dots": dots,
            "bullish_board": top_bullish,
            "bearish_board": top_bearish,
            "timestamp": datetime.now().isoformat()
        }

        self.cached_breadth = result
        return result
