"""Strategies package exports."""
from backend.app.strategies.base import BaseStrategy
from backend.app.strategies.cost_gate import CostAwareGate, cost_aware_gate
from backend.app.strategies.momentum_breakout import MomentumBreakoutStrategy
from backend.app.strategies.mean_reversion_rsi import MeanReversionRSIStrategy
from backend.app.strategies.trend_following import TrendFollowingSupertrendStrategy

# Registry of active strategies
STRATEGY_REGISTRY = {
    "MomentumBreakout": MomentumBreakoutStrategy(),
    "MeanReversionRSI": MeanReversionRSIStrategy(),
    "TrendFollowing": TrendFollowingSupertrendStrategy(),
}

__all__ = [
    "BaseStrategy",
    "CostAwareGate",
    "cost_aware_gate",
    "MomentumBreakoutStrategy",
    "MeanReversionRSIStrategy",
    "TrendFollowingSupertrendStrategy",
    "STRATEGY_REGISTRY",
]
