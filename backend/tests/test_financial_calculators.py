"""Automated tests for deterministic financial mathematics and planners."""
import pytest
from backend.app.services.financial_calculators import FinancialCalculators


def test_sip_calculator_math():
    """Verify SIP calculation with and without inflation adjustments."""
    res = FinancialCalculators.calculate_sip(
        monthly_investment=5000.0,
        expected_annual_return_pct=12.0,
        tenure_years=10,
        annual_inflation_pct=6.0
    )
    # 5000 * 120 months = 6,00,000
    assert res["invested_amount"] == 600000.0
    # Standard future value should be roughly ~11.61 Lakhs
    assert 1150000.0 <= res["total_value"] <= 1180000.0
    assert res["estimated_returns"] == round(res["total_value"] - res["invested_amount"], 2)
    # Inflation adjusted purchasing power must be less than nominal value
    assert res["inflation_adjusted_value"] < res["total_value"]
    assert len(res["yearly_breakdown"]) == 10


def test_lumpsum_compound_interest():
    """Verify compound interest for single deposits."""
    res = FinancialCalculators.calculate_lumpsum(
        principal=100000.0,
        annual_rate_pct=10.0,
        years=5,
        annual_inflation_pct=5.0
    )
    # 100000 * (1.10)^5 = 161,051
    assert 161000.0 <= res["total_value"] <= 162000.0
    assert res["estimated_returns"] == round(res["total_value"] - 100000.0, 2)
    assert res["inflation_adjusted_value"] < res["total_value"]


def test_emi_calculator():
    """Verify loan EMI formula."""
    res = FinancialCalculators.calculate_emi(
        principal=1000000.0,  # 10 Lakhs
        annual_interest_rate_pct=8.5,
        tenure_months=120  # 10 Years
    )
    # Monthly EMI for 10L @ 8.5% for 10y is approximately ~12,398
    assert 12300.0 <= res["emi"] <= 12500.0
    assert res["total_payment"] > res["principal"]
    assert res["total_interest"] == round(res["total_payment"] - res["principal"], 2)


def test_emergency_fund_and_retirement():
    """Verify emergency fund and retirement corpus projections."""
    ef = FinancialCalculators.calculate_emergency_fund(monthly_expenses=40000.0, months_of_coverage=6)
    assert ef["target_emergency_fund"] == 240000.0
    assert ef["allocation_recommendation"]["liquid_savings_inr"] == 96000.0

    ret = FinancialCalculators.calculate_retirement_corpus(
        current_age=30,
        retirement_age=60,
        current_monthly_expense=50000.0,
        expected_inflation_pct=6.0,
        post_retirement_return_pct=8.0
    )
    assert ret["years_to_retirement"] == 30
    assert ret["corpus_required"] > 10000000.0  # > 1 Crore in future terms
