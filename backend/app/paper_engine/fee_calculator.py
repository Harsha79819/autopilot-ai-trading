"""Detailed Indian Equity Transaction Fee Calculator (NSE MIS Intraday & CNC Delivery)."""
import math
from typing import Dict
from backend.app.schemas.portfolio import FeeBreakdown
from backend.app.config import settings


class FeeCalculator:
    """
    Computes precise Indian equity charges according to SEBI and NSE regulations:
    - Brokerage: 0.03% or ₹20 per executed order (whichever is lower)
    - STT/CTT (Securities Transaction Tax):
      * Intraday: 0.025% on sell turnover
      * Delivery: 0.1% on buy and sell turnover
    - Exchange Transaction Charges: NSE 0.00325% on turnover
    - GST: 18% on (Brokerage + Exchange Charges)
    - SEBI Turnover Charges: 0.0001% (₹10 / crore)
    - Stamp Duty:
      * Intraday: 0.003% on buy turnover
      * Delivery: 0.015% on buy turnover
    - DP Charges: ₹15.93 flat on delivery sell
    - Spread and Slippage: Market friction
    """

    @staticmethod
    def calculate_fees(
        symbol: str,
        side: str,  # "BUY" or "SELL"
        quantity: int,
        price: float,
        is_intraday: bool = True,
        slippage_bps: float = None,
        spread_bps: float = None
    ) -> FeeBreakdown:
        if quantity <= 0 or price <= 0:
            return FeeBreakdown()

        turnover = round(quantity * price, 2)
        side_upper = side.upper()

        # 1. Brokerage: min(0.03% of turnover, ₹20.00)
        brokerage = round(min(turnover * 0.0003, 20.00), 2)

        # 2. STT (Securities Transaction Tax)
        if is_intraday:
            # 0.025% on sell turnover only
            stt = round(turnover * 0.00025, 2) if side_upper == "SELL" else 0.0
        else:
            # 0.1% on both buy and sell turnover
            stt = round(turnover * 0.001, 2)

        # 3. Exchange Transaction Charges: NSE = 0.00325%
        exchange_charges = round(turnover * 0.0000325, 4)

        # 4. GST: 18% on (Brokerage + Exchange Charges)
        gst = round((brokerage + exchange_charges) * 0.18, 4)

        # 5. SEBI Turnover Charges: 0.0001% (₹10 per crore)
        sebi_charges = round(turnover * 0.000001, 4)

        # 6. Stamp Duty: State stamp duty on buy orders only
        if side_upper == "BUY":
            stamp_rate = 0.00003 if is_intraday else 0.00015
            stamp_duty = round(turnover * stamp_rate, 4)
        else:
            stamp_duty = 0.0

        # 7. DP (Depository Participant) Charges: Flat ₹15.93 on delivery sell
        if not is_intraday and side_upper == "SELL":
            dp_charges = 15.93
        else:
            dp_charges = 0.0

        # 8. Spread friction
        eff_spread_bps = spread_bps if spread_bps is not None else settings.SIMULATED_SPREAD_BPS
        spread_amount = round(turnover * (eff_spread_bps / 10000.0) / 2.0, 2)

        # 9. Slippage friction
        eff_slippage_bps = slippage_bps if slippage_bps is not None else settings.SIMULATED_SLIPPAGE_BPS
        slippage_amount = round(turnover * (eff_slippage_bps / 10000.0), 2)

        # Total statutory and regulatory charges
        regulatory_charges = round(brokerage + stt + exchange_charges + gst + sebi_charges + stamp_duty + dp_charges, 2)
        total_charges = round(regulatory_charges + slippage_amount + spread_amount, 2)

        return FeeBreakdown(
            brokerage=brokerage,
            stt=stt,
            exchange_charges=exchange_charges,
            gst=gst,
            sebi_charges=sebi_charges,
            stamp_duty=stamp_duty,
            dp_charges=dp_charges,
            slippage_amount=slippage_amount,
            spread_amount=spread_amount,
            total_charges=total_charges
        )

    @staticmethod
    def calculate_round_trip_cost_pct(price: float, is_intraday: bool = True) -> float:
        """
        Estimate round-trip percentage cost (Buy + Sell statutory fees) for a 1-share trade.
        Crucial for the Cost-Aware Gate!
        """
        if price <= 0:
            return 0.0
        buy_fees = FeeCalculator.calculate_fees("DUMMY", "BUY", 1, price, is_intraday)
        sell_fees = FeeCalculator.calculate_fees("DUMMY", "SELL", 1, price, is_intraday)
        total_roundtrip_fees = buy_fees.total_charges + sell_fees.total_charges
        return round((total_roundtrip_fees / price) * 100.0, 3)


fee_calculator = FeeCalculator()
