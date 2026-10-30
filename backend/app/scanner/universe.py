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
    },
    # Extended High-Quality Nifty 50 Liquid Equities
    "COALINDIA": {
        "name": "Coal India Ltd",
        "symbol": "COALINDIA",
        "yahoo_ticker": "COALINDIA.NS",
        "smartapi_token": "20374",
        "base_price": 485.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.013
    },
    "POWERGRID": {
        "name": "Power Grid Corporation of India Ltd",
        "symbol": "POWERGRID",
        "yahoo_ticker": "POWERGRID.NS",
        "smartapi_token": "14977",
        "base_price": 320.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "ONGC": {
        "name": "Oil and Natural Gas Corporation Ltd",
        "symbol": "ONGC",
        "yahoo_ticker": "ONGC.NS",
        "smartapi_token": "2475",
        "base_price": 275.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.014
    },
    "BPCL": {
        "name": "Bharat Petroleum Corporation Ltd",
        "symbol": "BPCL",
        "yahoo_ticker": "BPCL.NS",
        "smartapi_token": "526",
        "base_price": 310.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.015
    },
    "IOC": {
        "name": "Indian Oil Corporation Ltd",
        "symbol": "IOC",
        "yahoo_ticker": "IOC.NS",
        "smartapi_token": "1624",
        "base_price": 145.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "GAIL": {
        "name": "GAIL India Ltd",
        "symbol": "GAIL",
        "yahoo_ticker": "GAIL.NS",
        "smartapi_token": "4717",
        "base_price": 205.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.013
    },
    "HCLTECH": {
        "name": "HCL Technologies Ltd",
        "symbol": "HCLTECH",
        "yahoo_ticker": "HCLTECH.NS",
        "smartapi_token": "7229",
        "base_price": 1780.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "TECHM": {
        "name": "Tech Mahindra Ltd",
        "symbol": "TECHM",
        "yahoo_ticker": "TECHM.NS",
        "smartapi_token": "13538",
        "base_price": 1620.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.014
    },
    "HINDUNILVR": {
        "name": "Hindustan Unilever Ltd",
        "symbol": "HINDUNILVR",
        "yahoo_ticker": "HINDUNILVR.NS",
        "smartapi_token": "1394",
        "base_price": 2500.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.009
    },
    "NESTLEIND": {
        "name": "Nestle India Ltd",
        "symbol": "NESTLEIND",
        "yahoo_ticker": "NESTLEIND.NS",
        "smartapi_token": "17963",
        "base_price": 2350.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.009
    },
    "BRITANNIA": {
        "name": "Britannia Industries Ltd",
        "symbol": "BRITANNIA",
        "yahoo_ticker": "BRITANNIA.NS",
        "smartapi_token": "547",
        "base_price": 5100.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "CIPLA": {
        "name": "Cipla Ltd",
        "symbol": "CIPLA",
        "yahoo_ticker": "CIPLA.NS",
        "smartapi_token": "694",
        "base_price": 1540.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "DRREDDY": {
        "name": "Dr. Reddy's Laboratories Ltd",
        "symbol": "DRREDDY",
        "yahoo_ticker": "DRREDDY.NS",
        "smartapi_token": "881",
        "base_price": 6600.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "SUNPHARMA": {
        "name": "Sun Pharmaceutical Industries Ltd",
        "symbol": "SUNPHARMA",
        "yahoo_ticker": "SUNPHARMA.NS",
        "smartapi_token": "3351",
        "base_price": 1820.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "HAL": {
        "name": "Hindustan Aeronautics Ltd",
        "symbol": "HAL",
        "yahoo_ticker": "HAL.NS",
        "smartapi_token": "2303",
        "base_price": 4450.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.016
    },
    "BAJAJ-AUTO": {
        "name": "Bajaj Auto Ltd",
        "symbol": "BAJAJ-AUTO",
        "yahoo_ticker": "BAJAJ-AUTO.NS",
        "smartapi_token": "16669",
        "base_price": 9200.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.013
    },
    "MARUTI": {
        "name": "Maruti Suzuki India Ltd",
        "symbol": "MARUTI",
        "yahoo_ticker": "MARUTI.NS",
        "smartapi_token": "10999",
        "base_price": 11800.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "KOTAKBANK": {
        "name": "Kotak Mahindra Bank Ltd",
        "symbol": "KOTAKBANK",
        "yahoo_ticker": "KOTAKBANK.NS",
        "smartapi_token": "1922",
        "base_price": 1750.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.011
    },
    "AXISBANK": {
        "name": "Axis Bank Ltd",
        "symbol": "AXISBANK",
        "yahoo_ticker": "AXISBANK.NS",
        "smartapi_token": "5900",
        "base_price": 1180.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    },
    "BHARTIARTL": {
        "name": "Bharti Airtel Ltd",
        "symbol": "BHARTIARTL",
        "yahoo_ticker": "BHARTIARTL.NS",
        "smartapi_token": "10604",
        "base_price": 1650.00,
        "tick_size": 0.05,
        "lot_size": 1,
        "volatility": 0.012
    }
}

# Primary liquid large/mid-cap trading universe (strictly >= ₹100 instruments)
PRIMARY_UNIVERSE_SYMBOLS: List[str] = [
    "INFY", "TCS", "ITC", "BEL", "WIPRO", "TATASTEEL",
    "TATAMOTORS", "SBIN", "RELIANCE", "NTPC", "HDFCBANK", "ICICIBANK",
    "COALINDIA", "POWERGRID", "ONGC", "BPCL", "IOC", "GAIL",
    "HCLTECH", "TECHM", "HINDUNILVR", "NESTLEIND", "BRITANNIA",
    "CIPLA", "DRREDDY", "SUNPHARMA", "HAL", "BAJAJ-AUTO", "MARUTI",
    "KOTAKBANK", "AXISBANK", "BHARTIARTL"
]

UNIVERSE_SYMBOLS: List[str] = list(NSE_STOCKS.keys())


def get_universe_metadata() -> Dict[str, Any]:
    """Return dictionary of universe symbols and their metadata."""
    return NSE_STOCKS


def get_primary_universe_symbols() -> List[str]:
    """Return primary established large/mid-cap symbols."""
    return PRIMARY_UNIVERSE_SYMBOLS

