"""
Order Block AutoPilot Strategy
Automatically executes simulated paper trades when price pulls back to Zone Z.
"""
from typing import Dict, Any, Optional, List

try:
    from backend.app.strategies.base import BaseStrategy
except ImportError:
    from app.strategies.base import BaseStrategy

class OrderBlockStrategy(BaseStrategy):
    name = "Institutional Order Block Pullback"
    description = "Enters long/short when price re-tests Zone Z with 4-point breadth alignment."

    def __init__(self, min_rr: float = 1.5, max_risk_per_trade: float = 50.0):
        try:
            super().__init__(
                name="order_block",
                display_name="Institutional Order Block Pullback",
                description="Enters long/short when price re-tests Zone Z with 4-point breadth alignment."
            )
        except TypeError:
            super().__init__()
        self.min_rr = min_rr
        self.max_risk_per_trade = max_risk_per_trade

    def get_entry_conditions(self) -> List[str]:
        return ["Price retests Zone Z", "BOS confirmed on 5m candles", "R:R >= 1:1.5", "VWAP aligned"]

    def get_exit_conditions(self) -> List[str]:
        return ["Target R2 hit", "Stop S1/R1 pierced"]

    def get_assumptions(self) -> List[str]:
        return ["Institutional order blocks act as high-liquidity reaction zones"]

    def get_risk_limits(self) -> List[str]:
        return [f"Max risk per trade: ₹{self.max_risk_per_trade}"]

    def get_required_market_data(self) -> List[str]:
        return ["5-minute OHLCV", "VWAP", "Market breadth"]

    def get_known_limitations(self) -> List[str]:
        return ["Gap-through market opens can pierce Zone Z directly"]

    def get_default_parameters(self) -> Dict[str, Any]:
        return {"min_rr": self.min_rr, "max_risk_per_trade": self.max_risk_per_trade}

    def evaluate_signal(self, setup_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validates whether setup meets entry criteria at Zone Z.
        """
        if not setup_data or setup_data.get("rr_ratio", 0) < self.min_rr:
            return None

        if not setup_data.get("vwap_aligned", False):
            return None

        current_p = setup_data["current_price"]
        zone_z = setup_data["zone_z"]
        risk = setup_data["risk_per_share"]

        # Check proximity to Zone Z within 0.15%
        pullback_threshold = zone_z * 0.0015
        if abs(current_p - zone_z) <= pullback_threshold:
            qty = max(1, int(self.max_risk_per_trade / risk)) if risk > 0 else 1
            side = "BUY" if setup_data["type"] == "BULLISH" else "SELL"

            return {
                "symbol": setup_data["symbol"],
                "side": side,
                "quantity": qty,
                "entry_price": zone_z,
                "stop_loss": setup_data["invalidation"],
                "target": setup_data["target_r2"],
                "rationale": f"Order Block {setup_data['type']} touch at Z={zone_z} with R:R={setup_data['rr_ratio']}"
            }
        return None
