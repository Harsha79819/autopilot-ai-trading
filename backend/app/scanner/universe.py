"""NSE Stock Universe Catalog with Real Market Instruments."""
from typing import Dict, Any, List

# Valid NSE equities catalog with Yahoo Finance tickers and SmartAPI instrument tokens
NSE_STOCKS: Dict[str, Dict[str, Any]] = {
    # High-Quality Nifty 50 / Nifty Next 50 Liquid Large & Mid-Cap Equities
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
    "TCS": {
        "name": "Tata Consultancy Services Ltd",
        "symbol": "TCS",
        "yahoo_ticker": "TCS.NS",
        "smartapi_token": "11536",
        "base_price": 3850.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.010
    },
    "ITC": {
        "name": "ITC Ltd",
        "symbol": "ITC",
        "yahoo_ticker": "ITC.NS",
        "smartapi_token": "1660",
        "base_price": 440.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.010
    },
    "BEL": {
        "name": "Bharat Electronics Ltd",
        "symbol": "BEL",
        "yahoo_ticker": "BEL.NS",
        "smartapi_token": "383",
        "base_price": 288.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.016
    },
    "WIPRO": {
        "name": "Wipro Ltd",
        "symbol": "WIPRO",
        "yahoo_ticker": "WIPRO.NS",
        "smartapi_token": "3787",
        "base_price": 510.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.014
    },
    "TATASTEEL": {
        "name": "Tata Steel Ltd",
        "symbol": "TATASTEEL",
        "yahoo_ticker": "TATASTEEL.NS",
        "smartapi_token": "3499",
        "base_price": 150.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.018
    },
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
    "RELIANCE": {
        "name": "Reliance Industries Ltd",
        "symbol": "RELIANCE",
        "yahoo_ticker": "RELIANCE.NS",
        "smartapi_token": "2885",
        "base_price": 2850.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.010
    },
    "NTPC": {
        "name": "NTPC Ltd",
        "symbol": "NTPC",
        "yahoo_ticker": "NTPC.NS",
        "smartapi_token": "11630",
        "base_price": 380.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "HDFCBANK": {
        "name": "HDFC Bank Ltd",
        "symbol": "HDFCBANK",
        "yahoo_ticker": "HDFCBANK.NS",
        "smartapi_token": "1333",
        "base_price": 1650.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "ICICIBANK": {
        "name": "ICICI Bank Ltd",
        "symbol": "ICICIBANK",
        "yahoo_ticker": "ICICIBANK.NS",
        "smartapi_token": "4963",
        "base_price": 1250.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },

    # Small-cap / Penny / Legacy Equities (Retained for catalog compatibility & rejection testing)
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
    }
}

# Primary liquid large/mid-cap trading universe (strictly >= ₹100 instruments)
PRIMARY_UNIVERSE_SYMBOLS: List[str] = [
    "INFY", "TCS", "ITC", "BEL", "WIPRO", "TATASTEEL",
    "TATAMOTORS", "SBIN", "RELIANCE", "NTPC", "HDFCBANK", "ICICIBANK"
]

UNIVERSE_SYMBOLS: List[str] = list(NSE_STOCKS.keys())


def get_universe_metadata() -> Dict[str, Any]:
    """Return dictionary of universe symbols and their metadata."""
    return NSE_STOCKS


def get_primary_universe_symbols() -> List[str]:
    """Return primary established large/mid-cap symbols."""
    return PRIMARY_UNIVERSE_SYMBOLS
