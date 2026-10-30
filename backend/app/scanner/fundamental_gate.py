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

    # Extended High-Quality Nifty 50 Liquid Equities
    "COALINDIA": FundamentalMetrics(
        symbol="COALINDIA",
        debt_to_equity=0.05,
        roe_pct=52.0,
        profit_trajectory_positive=True,
        industry="Mining / Energy",
        notes="Near zero debt, high cash flow, industry-leading 52% ROE"
    ),
    "POWERGRID": FundamentalMetrics(
        symbol="POWERGRID",
        debt_to_equity=0.92,
        roe_pct=19.5,
        profit_trajectory_positive=True,
        industry="Power Transmission",
        notes="Regulated return model, high dividend yield, healthy interest coverage"
    ),
    "ONGC": FundamentalMetrics(
        symbol="ONGC",
        debt_to_equity=0.42,
        roe_pct=14.5,
        profit_trajectory_positive=True,
        industry="Oil & Gas Exploration",
        notes="Strong upstream cash flows and low net gearing"
    ),
    "BPCL": FundamentalMetrics(
        symbol="BPCL",
        debt_to_equity=0.78,
        roe_pct=36.0,
        profit_trajectory_positive=True,
        industry="Refining & Marketing",
        notes="High refining margins and robust return on capital"
    ),
    "IOC": FundamentalMetrics(
        symbol="IOC",
        debt_to_equity=0.82,
        roe_pct=27.0,
        profit_trajectory_positive=True,
        industry="Oil Marketing",
        notes="Affordable liquid large-cap with strong domestic distribution network"
    ),
    "GAIL": FundamentalMetrics(
        symbol="GAIL",
        debt_to_equity=0.28,
        roe_pct=14.0,
        profit_trajectory_positive=True,
        industry="Gas Utilities",
        notes="Low leverage natural gas transmission monopoly"
    ),
    "HCLTECH": FundamentalMetrics(
        symbol="HCLTECH",
        debt_to_equity=0.08,
        roe_pct=23.5,
        profit_trajectory_positive=True,
        industry="IT Services",
        notes="Zero net debt, high recurring software and digital revenue"
    ),
    "TECHM": FundamentalMetrics(
        symbol="TECHM",
        debt_to_equity=0.15,
        roe_pct=14.8,
        profit_trajectory_positive=True,
        industry="IT Services",
        notes="Solid balance sheet and 5G telecom digital engineering focus"
    ),
    "HINDUNILVR": FundamentalMetrics(
        symbol="HINDUNILVR",
        debt_to_equity=0.04,
        roe_pct=20.2,
        profit_trajectory_positive=True,
        industry="FMCG",
        notes="Virtually debt-free FMCG leader with negative working capital cycle"
    ),
    "NESTLEIND": FundamentalMetrics(
        symbol="NESTLEIND",
        debt_to_equity=0.12,
        roe_pct=105.0,
        profit_trajectory_positive=True,
        industry="FMCG / Food",
        notes="Unmatched return on capital and defensive pricing power"
    ),
    "BRITANNIA": FundamentalMetrics(
        symbol="BRITANNIA",
        debt_to_equity=0.85,
        roe_pct=54.0,
        profit_trajectory_positive=True,
        industry="FMCG / Bakery",
        notes="Market leader in biscuits and dairy with excellent brand equity"
    ),
    "CIPLA": FundamentalMetrics(
        symbol="CIPLA",
        debt_to_equity=0.03,
        roe_pct=16.5,
        profit_trajectory_positive=True,
        industry="Pharmaceuticals",
        notes="Negligible debt, strong respiratory formulation franchise in US/India"
    ),
    "DRREDDY": FundamentalMetrics(
        symbol="DRREDDY",
        debt_to_equity=0.06,
        roe_pct=21.0,
        profit_trajectory_positive=True,
        industry="Pharmaceuticals",
        notes="Cash-rich global generics player with steady R&D pipeline"
    ),
    "SUNPHARMA": FundamentalMetrics(
        symbol="SUNPHARMA",
        debt_to_equity=0.07,
        roe_pct=16.8,
        profit_trajectory_positive=True,
        industry="Pharmaceuticals",
        notes="India's largest pharma company with expanding global specialty portfolio"
    ),
    "HAL": FundamentalMetrics(
        symbol="HAL",
        debt_to_equity=0.00,
        roe_pct=26.0,
        profit_trajectory_positive=True,
        industry="Aerospace & Defence",
        notes="Zero debt, sovereign aerospace monopoly with multi-year order backlog"
    ),
    "BAJAJ-AUTO": FundamentalMetrics(
        symbol="BAJAJ-AUTO",
        debt_to_equity=0.01,
        roe_pct=24.5,
        profit_trajectory_positive=True,
        industry="Automobiles",
        notes="Net-cash 2-wheeler and 3-wheeler export champion"
    ),
    "MARUTI": FundamentalMetrics(
        symbol="MARUTI",
        debt_to_equity=0.02,
        roe_pct=17.5,
        profit_trajectory_positive=True,
        industry="Automobiles",
        notes="Dominant passenger car market share and fortress balance sheet"
    ),
    "BHARTIARTL": FundamentalMetrics(
        symbol="BHARTIARTL",
        debt_to_equity=0.92,
        roe_pct=15.2,
        profit_trajectory_positive=True,
        industry="Telecommunications",
        notes="Leading ARPU, expanding 5G subscriber base and strong operating leverage"
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
