"""Deterministic Financial Mathematics & Personal Finance Calculators."""
from typing import Dict, Any, List
import math


class FinancialCalculators:
    """Mathematical calculators for Personal Finance, SIP, Loans, and Retirement."""

    @staticmethod
    def calculate_sip(
        monthly_investment: float,
        expected_annual_return_pct: float,
        tenure_years: int,
        annual_inflation_pct: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calculates Systematic Investment Plan (SIP) returns and inflation-adjusted real purchasing power.
        Formula: M = P * ((1 + i)^n - 1) / i * (1 + i)
        """
        if monthly_investment <= 0 or tenure_years <= 0:
            return {
                "invested_amount": 0.0,
                "estimated_returns": 0.0,
                "total_value": 0.0,
                "inflation_adjusted_value": 0.0,
                "yearly_breakdown": []
            }

        total_months = tenure_years * 12
        monthly_rate = (expected_annual_return_pct / 100.0) / 12.0
        invested_amount = monthly_investment * total_months

        if monthly_rate > 0:
            future_value = monthly_investment * (((1 + monthly_rate) ** total_months - 1) / monthly_rate) * (1 + monthly_rate)
        else:
            future_value = invested_amount

        # Inflation adjustment (Purchasing Power)
        inflation_factor = (1 + annual_inflation_pct / 100.0) ** tenure_years if annual_inflation_pct > 0 else 1.0
        real_future_value = future_value / inflation_factor

        # Year-by-year curve
        breakdown = []
        for yr in range(1, tenure_years + 1):
            m = yr * 12
            inv = monthly_investment * m
            val = monthly_investment * (((1 + monthly_rate) ** m - 1) / monthly_rate) * (1 + monthly_rate) if monthly_rate > 0 else inv
            breakdown.append({
                "year": yr,
                "invested": round(inv, 2),
                "wealth": round(val, 2),
                "returns": round(val - inv, 2)
            })

        return {
            "invested_amount": round(invested_amount, 2),
            "estimated_returns": round(future_value - invested_amount, 2),
            "total_value": round(future_value, 2),
            "inflation_adjusted_value": round(real_future_value, 2),
            "yearly_breakdown": breakdown
        }

    @staticmethod
    def calculate_lumpsum(
        principal: float,
        annual_rate_pct: float,
        years: int,
        annual_inflation_pct: float = 0.0
    ) -> Dict[str, Any]:
        """Calculates Compound Interest for lumpsum deposits."""
        if principal <= 0 or years <= 0:
            return {"principal": 0.0, "total_value": 0.0, "returns": 0.0, "inflation_adjusted_value": 0.0}

        rate = annual_rate_pct / 100.0
        total_value = principal * ((1.0 + rate) ** years)
        inflation_factor = (1 + annual_inflation_pct / 100.0) ** years if annual_inflation_pct > 0 else 1.0
        real_value = total_value / inflation_factor

        return {
            "principal": round(principal, 2),
            "estimated_returns": round(total_value - principal, 2),
            "total_value": round(total_value, 2),
            "inflation_adjusted_value": round(real_value, 2)
        }

    @staticmethod
    def calculate_emi(
        principal: float,
        annual_interest_rate_pct: float,
        tenure_months: int
    ) -> Dict[str, Any]:
        """
        Calculates Equal Monthly Installment (EMI) and interest amortization.
        Formula: EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
        """
        if principal <= 0 or tenure_months <= 0:
            return {"emi": 0.0, "total_interest": 0.0, "total_payment": 0.0}

        monthly_rate = (annual_interest_rate_pct / 100.0) / 12.0

        if monthly_rate > 0:
            emi = principal * monthly_rate * ((1 + monthly_rate) ** tenure_months) / (((1 + monthly_rate) ** tenure_months) - 1)
        else:
            emi = principal / tenure_months

        total_payment = emi * tenure_months
        total_interest = total_payment - principal

        return {
            "emi": round(emi, 2),
            "principal": round(principal, 2),
            "total_interest": round(total_interest, 2),
            "total_payment": round(total_payment, 2)
        }

    @staticmethod
    def calculate_emergency_fund(
        monthly_expenses: float,
        months_of_coverage: int = 6
    ) -> Dict[str, Any]:
        """Calculates recommended emergency buffer based on monthly fixed overhead."""
        target = monthly_expenses * months_of_coverage
        return {
            "monthly_expenses": round(monthly_expenses, 2),
            "months_of_coverage": months_of_coverage,
            "target_emergency_fund": round(target, 2),
            "allocation_recommendation": {
                "liquid_savings_inr": round(target * 0.40, 2),
                "high_yield_fd_inr": round(target * 0.60, 2)
            }
        }

    @staticmethod
    def calculate_retirement_corpus(
        current_age: int,
        retirement_age: int,
        current_monthly_expense: float,
        expected_inflation_pct: float = 6.0,
        post_retirement_return_pct: float = 8.0,
        life_expectancy_age: int = 85
    ) -> Dict[str, Any]:
        """
        Estimates retirement corpus required using inflation-adjusted expense projection
        and safe withdrawal rate.
        """
        years_to_retirement = max(retirement_age - current_age, 0)
        years_in_retirement = max(life_expectancy_age - retirement_age, 0)

        # Future annual expense at retirement
        future_annual_expense = (current_monthly_expense * 12) * ((1 + expected_inflation_pct / 100.0) ** years_to_retirement)

        # Real rate of return in retirement
        real_return = ((1 + post_retirement_return_pct / 100.0) / (1 + expected_inflation_pct / 100.0)) - 1.0

        if real_return > 0:
            corpus_required = future_annual_expense * ((1 - ((1 + real_return) ** -years_in_retirement)) / real_return)
        else:
            corpus_required = future_annual_expense * years_in_retirement

        return {
            "years_to_retirement": years_to_retirement,
            "future_annual_expense": round(future_annual_expense, 2),
            "corpus_required": round(corpus_required, 2),
            "recommended_monthly_savings": round(corpus_required / (years_to_retirement * 12), 2) if years_to_retirement > 0 else 0.0
        }
