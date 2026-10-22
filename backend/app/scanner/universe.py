"""NSE Stock Universe Catalog with Real Market Instruments."""
from typing import Dict, Any, List

# Valid NSE equities catalog with Yahoo Finance tickers and SmartAPI instrument tokens
NSE_STOCKS: Dict[str, Dict[str, Any]] = {
    # Liquid Whole-Share Under-₹100 Candidates (Ideal for ₹500 paper trading)
    "SUZLON": {
        "name": "Suzlon Energy Ltd",
        "symbol": "SUZLON",
        "yahoo_ticker": "SUZLON.NS",
        "smartapi_token": "3472",
        "base_price": 40.38,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.022
    },
    "IDEA": {
        "name": "Vodafone Idea Ltd",
        "symbol": "IDEA",
        "yahoo_ticker": "IDEA.NS",
        "smartapi_token": "14366",
        "base_price": 12.28,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.025
    },
    "YESBANK": {
        "name": "Yes Bank Ltd",
        "symbol": "YESBANK",
        "yahoo_ticker": "YESBANK.NS",
        "smartapi_token": "11915",
        "base_price": 16.88,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.018
    },
    "IRFC": {
        "name": "Indian Railway Finance Corp",
        "symbol": "IRFC",
        "yahoo_ticker": "IRFC.NS",
        "smartapi_token": "1660",
        "base_price": 78.44,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "NHPC": {
        "name": "NHPC Ltd",
        "symbol": "NHPC",
        "yahoo_ticker": "NHPC.NS",
        "smartapi_token": "14977",
        "base_price": 70.70,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.010
    },
    "ZOMATO": {
        "name": "Zomato Ltd",
        "symbol": "ZOMATO",
        "yahoo_ticker": "ZOMATO.NS",
        "smartapi_token": "5097",
        "base_price": 93.20,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.020
    },

    # High-Capital NSE Benchmark Equities (Exceeds available cash for capital gating tests)
    "TATAMOTORS": {
        "name": "Tata Motors Ltd",
        "symbol": "TATAMOTORS",
        "yahoo_ticker": "TATAMOTORS.NS",
        "smartapi_token": "3456",
        "base_price": 840.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.015
    },
    "SBIN": {
        "name": "State Bank of India",
        "symbol": "SBIN",
        "yahoo_ticker": "SBIN.NS",
        "smartapi_token": "3045",
        "base_price": 765.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "INFY": {
        "name": "Infosys Ltd",
        "symbol": "INFY",
        "yahoo_ticker": "INFY.NS",
        "smartapi_token": "1594",
        "base_price": 1475.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "RELIANCE": {
        "name": "Reliance Industries Ltd",
        "symbol": "RELIANCE",
        "yahoo_ticker": "RELIANCE.NS",
        "smartapi_token": "2885",
        "base_price": 2850.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.010
    }
}

UNIVERSE_SYMBOLS: List[str] = list(NSE_STOCKS.keys())


def get_universe_metadata() -> Dict[str, Any]:
    """Return dictionary of universe symbols and their metadata."""
    return NSE_STOCKS
