"""Fundamental Health & Penny Stock Rejection Gate.

Enforces quantitative health checks and minimum price cutoffs on candidates
before generating autonomous BUY intent:
1. Minimum share price cutoff (>= ₹100) to reject penny / speculative stocks.
2. Debt-to-Equity ratio < 1.0 (exclude overleveraged companies).
3. Return on Equity (ROE) > 12.0% (ensure capital efficiency).
4. Positive annual/quarterly net profit trajectory.
5. Strict disqualification if fundamental metrics are unavailable or fail.
"""
from dataclasses import dataclass
from typing import Optional, Dict, Tuple
import logging
from backend.app.config import settings

logger = logging.getLogger("autopilot.fundamental_gate")


@dataclass
class FundamentalMetrics:
    symbol: str
    debt_to_equity: Optional[float]
    roe_pct: Optional[float]
    profit_trajectory_positive: Optional[bool]
    industry: str = ""
    notes: str = ""


# Curated, verified fundamental metrics for liquid large/mid-cap equities
# Values reflect consolidated annual/quarterly financial reports.
VERIFIED_FUNDAMENTALS: Dict[str, FundamentalMetrics] = {
    # High-Quality Large-Caps (Meet All Strict Thresholds)
    "INFY": FundamentalMetrics(
        symbol="INFY",
        debt_to_equity=0.12,
        roe_pct=31.8,
        profit_trajectory_positive=True,
        industry="IT Services",
        notes="Zero net debt, high cash flow, strong ROE"
    ),
    "TCS": FundamentalMetrics(
        symbol="TCS",
        debt_to_equity=0.08,
        roe_pct=48.0,
        profit_trajectory_positive=True,
        industry="IT Services",
        notes="Debt-free, industry-leading ROE, steady profit expansion"
    ),
    "ITC": FundamentalMetrics(
        symbol="ITC",
        debt_to_equity=0.01,
        roe_pct=28.5,
        profit_trajectory_positive=True,
        industry="FMCG",
        notes="Virtually zero debt, robust dividend yield and margins"
    ),
    "BEL": FundamentalMetrics(
        symbol="BEL",
        debt_to_equity=0.00,
        roe_pct=24.5,
        profit_trajectory_positive=True,
        industry="Defence / Electronics",
        notes="Debt-free defense PSU with growing order book and profit"
    ),
    "WIPRO": FundamentalMetrics(
        symbol="WIPRO",
        debt_to_equity=0.25,
        roe_pct=15.2,
        profit_trajectory_positive=True,
        industry="IT Services",
        notes="Low leverage and healthy capital return"
    ),
    "NTPC": FundamentalMetrics(
        symbol="NTPC",
        debt_to_equity=1.35,  # Exceeds 1.0 -> Fails D/E
        roe_pct=13.0,
        profit_trajectory_positive=True,
        industry="Power Utilities",
        notes="Capital intensive PSU utility with high leverage"
    ),
    "TATASTEEL": FundamentalMetrics(
        symbol="TATASTEEL",
        debt_to_equity=0.82,
        roe_pct=8.5,  # Below 12% -> Fails ROE
        profit_trajectory_positive=False,
        industry="Steel",
        notes="Cyclical commodity headwinds, lower return on equity"
    ),
    "TATAMOTORS": FundamentalMetrics(
        symbol="TATAMOTORS",
        debt_to_equity=1.65,  # Exceeds 1.0 -> Fails D/E
        roe_pct=16.8,
        profit_trajectory_positive=True,
        industry="Automobiles",
        notes="High gross debt from commercial vehicle financing"
    ),
    "SBIN": FundamentalMetrics(
        symbol="SBIN",
        debt_to_equity=1.45,  # Banking leverage metric
        roe_pct=16.2,
        profit_trajectory_positive=True,
        industry="Banking",
        notes="State Bank of India banking balance sheet"
    ),
    "RELIANCE": FundamentalMetrics(
        symbol="RELIANCE",
        debt_to_equity=0.44,
        roe_pct=9.4,  # Below 12% -> Fails ROE
        profit_trajectory_positive=True,
        industry="Conglomerate / Energy",
        notes="Heavy ongoing capital expenditures dilute ROE below 12%"
    ),
    "HDFCBANK": FundamentalMetrics(
        symbol="HDFCBANK",
        debt_to_equity=1.10,  # Exceeds 1.0
        roe_pct=15.5,
        profit_trajectory_positive=True,
        industry="Banking",
        notes="Large financial sector balance sheet"
    ),
    "ICICIBANK": FundamentalMetrics(
        symbol="ICICIBANK",
        debt_to_equity=1.05,  # Exceeds 1.0
        roe_pct=17.2,
        profit_trajectory_positive=True,
        industry="Banking",
        notes="Private bank capital structure"
    ),

    # Speculative / Penny Stocks (Included to test rejection gates)
    "SUZLON": FundamentalMetrics(
        symbol="SUZLON",
        debt_to_equity=1.15,
        roe_pct=14.0,
        profit_trajectory_positive=True,
        industry="Renewable Energy",
        notes="Penny price < ₹100, historically restructured debt"
    ),
    "IDEA": FundamentalMetrics(
        symbol="IDEA",
        debt_to_equity=12.50,  # Extreme negative equity / debt
        roe_pct=-45.0,
        profit_trajectory_positive=False,
        industry="Telecom",
        notes="Severe financial distress, massive negative net worth"
    ),
    "YESBANK": FundamentalMetrics(
        symbol="YESBANK",
        debt_to_equity=2.10,
        roe_pct=4.2,
        profit_trajectory_positive=False,
        industry="Banking",
        notes="Sub-par return on equity and high legacy provisions"
    )
}


class FundamentalHealthGate:
    """Evaluates candidate instrument quality before generating BUY signals."""

    def __init__(self):
        self.min_price = getattr(settings, "MIN_STOCK_PRICE_INR", 100.0)
        self.max_debt_to_equity = 1.0
        self.min_roe_pct = 12.0

    def evaluate(self, symbol: str, current_price: float) -> Tuple[bool, str, Optional[FundamentalMetrics]]:
        """Evaluate if an instrument passes both penny-stock rejection and fundamental health gates.

        Returns:
            Tuple of (passed: bool, reason: str, metrics: Optional[FundamentalMetrics])
        """
        # Gate 1: Minimum Price Cutoff (Reject penny / micro-cap speculative stocks)
        if current_price < self.min_price:
            reason = (
                f"Penny/Micro-cap rejected: Share price ₹{current_price:.2f} is below "
                f"the minimum institutional cutoff ₹{self.min_price:.2f}."
            )
            return False, reason, VERIFIED_FUNDAMENTALS.get(symbol)

        # Gate 2: Fundamental Metrics Availability
        metrics = VERIFIED_FUNDAMENTALS.get(symbol)
        if not metrics:
            reason = (
                f"Fundamental data unavailable for {symbol}. Disqualified from autonomous "
                f"selection under strict quality verification policy."
            )
            return False, reason, None

        # Gate 3: Debt-to-Equity Ratio Check (< 1.0)
        if metrics.debt_to_equity is None or metrics.debt_to_equity >= self.max_debt_to_equity:
            de_str = f"{metrics.debt_to_equity:.2f}" if metrics.debt_to_equity is not None else "N/A"
            reason = (
                f"Fundamental failure: Debt-to-Equity ratio ({de_str}) exceeds max threshold "
                f"({self.max_debt_to_equity:.1f}). Overleveraged balance sheet."
            )
            return False, reason, metrics

        # Gate 4: Return on Equity (ROE) Check (> 12.0%)
        if metrics.roe_pct is None or metrics.roe_pct <= self.min_roe_pct:
            roe_str = f"{metrics.roe_pct:.1f}%" if metrics.roe_pct is not None else "N/A"
            reason = (
                f"Fundamental failure: Return on Equity ({roe_str}) is below minimum "
                f"required hurdle ({self.min_roe_pct:.1f}%)."
            )
            return False, reason, metrics

        # Gate 5: Net Profit Trajectory Check (Must be positive)
        if not metrics.profit_trajectory_positive:
            reason = (
                f"Fundamental failure: Net profit trajectory is flat or negative over "
                f"recent reporting periods."
            )
            return False, reason, metrics

        success_msg = (
            f"Fundamental health verified: D/E {metrics.debt_to_equity:.2f} < 1.0, "
            f"ROE {metrics.roe_pct:.1f}% > 12%, Profit Trajectory Positive."
        )
        return True, success_msg, metrics


fundamental_gate = FundamentalHealthGate()
