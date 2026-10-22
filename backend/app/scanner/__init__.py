"""Market scanner package exports."""
from backend.app.scanner.universe import UNIVERSE_SYMBOLS, get_universe_metadata

def __getattr__(name: str):
    if name in ("MarketScanner", "market_scanner"):
        from backend.app.scanner.scanner_service import MarketScanner, market_scanner
        return {"MarketScanner": MarketScanner, "market_scanner": market_scanner}[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "UNIVERSE_SYMBOLS",
    "get_universe_metadata",
    "MarketScanner",
    "market_scanner",
]

