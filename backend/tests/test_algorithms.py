"""Tests for financial algorithms — FHS, feasibility, rescheduling."""

import pytest
from datetime import date
from dateutil.relativedelta import relativedelta

from app.algorithms.financial_health import compute_financial_health_score
from app.algorithms.feasibility import assess_goal_feasibility
from app.algorithms.rescheduling import simulate_adaptive_rescheduling
from app.algorithms.categorizer import categorizer


# ---------------------------------------------------------------------------
# Financial Health Score tests
# ---------------------------------------------------------------------------

def test_fhs_zero_income():
    result = compute_financial_health_score(
        monthly_income=0.0,
        monthly_expenses=50000.0,
        essential_expenses=30000.0,
        discretionary_expenses=20000.0,
    )
    assert result["overall_score"] == pytest.approx(0.0, abs=20)
    assert result["status_badge"] in ("Critical", "Needs Attention")

def test_fhs_excellent_savings():
    result = compute_financial_health_score(
        monthly_income=100000.0,
        monthly_expenses=40000.0,
        essential_expenses=25000.0,
        discretionary_expenses=15000.0,
        available_liquid_savings=200000.0,
    )
    assert result["overall_score"] > 60

def test_fhs_score_bounded():
    for income in [0, 50000, 100000, 500000]:
        result = compute_financial_health_score(
            monthly_income=float(income),
            monthly_expenses=float(income * 0.6),
            essential_expenses=float(income * 0.3),
            discretionary_expenses=float(income * 0.3),
        )
        assert 0 <= result["overall_score"] <= 100

def test_fhs_has_all_components():
    result = compute_financial_health_score(
        monthly_income=80000.0,
        monthly_expenses=55000.0,
        essential_expenses=35000.0,
        discretionary_expenses=20000.0,
    )
    assert "savings_rate_score" in result
    assert "expense_to_income_score" in result
    assert "essential_coverage_score" in result
    assert "income_stability_score" in result
    assert "status_badge" in result
    assert "summary_explanation" in result
    assert "component_explanations" in result


# ---------------------------------------------------------------------------
# Feasibility tests
# ---------------------------------------------------------------------------

def test_feasibility_achievable():
    result = assess_goal_feasibility(
        target_amount=120000.0,
        current_savings=0.0,
        target_date=date.today() + relativedelta(months=24),
        monthly_income=80000.0,
        essential_expenses=30000.0,
        discretionary_expenses=15000.0,
    )
    assert result["status"] in ("Feasible", "Feasible with adjustments")
    assert result["required_monthly_savings"] == pytest.approx(5000.0, abs=100)

def test_feasibility_not_feasible():
    result = assess_goal_feasibility(
        target_amount=10000000.0,
        current_savings=0.0,
        target_date=date.today() + relativedelta(months=1),
        monthly_income=50000.0,
        essential_expenses=45000.0,
        discretionary_expenses=4000.0,
    )
    assert result["status"] == "Not currently feasible"

def test_feasibility_past_date_handled():
    """Past deadlines must not cause division by zero."""
    result = assess_goal_feasibility(
        target_amount=100000.0,
        current_savings=0.0,
        target_date=date(2020, 1, 1),
        monthly_income=80000.0,
        essential_expenses=30000.0,
        discretionary_expenses=20000.0,
    )
    assert isinstance(result, dict)
    assert result["required_monthly_savings"] > 0

def test_feasibility_no_essential_essentials():
    """Zero income should not crash."""
    result = assess_goal_feasibility(
        target_amount=50000.0,
        current_savings=0.0,
        target_date=date.today() + relativedelta(months=12),
        monthly_income=0.0,
        essential_expenses=0.0,
        discretionary_expenses=0.0,
    )
    assert isinstance(result, dict)


# ---------------------------------------------------------------------------
# Rescheduling Engine tests
# ---------------------------------------------------------------------------

def test_rescheduling_goal_savings_funding():
    today = date.today()
    result = simulate_adaptive_rescheduling(
        target_amount=120000.0,
        current_savings=50000.0,
        original_deadline=today + relativedelta(months=12),
        unexpected_expense_amount=20000.0,
        funding_source="goal_savings",
        monthly_income=80000.0,
        essential_expenses=30000.0,
        discretionary_expenses=15000.0,
        current_date=today,
    )
    assert result["revised_deadline"] >= result["original_deadline"]
    assert float(result["revised_monthly_savings"]) > 0
    assert len(result["roadmap"]) > 0

def test_rescheduling_emergency_fund_no_deadline_change():
    """Emergency fund coverage should not delay deadline if capacity allows."""
    today = date.today()
    result = simulate_adaptive_rescheduling(
        target_amount=100000.0,
        current_savings=10000.0,
        original_deadline=today + relativedelta(months=18),
        unexpected_expense_amount=5000.0,
        funding_source="emergency_fund",
        monthly_income=100000.0,
        essential_expenses=30000.0,
        discretionary_expenses=20000.0,
        current_date=today,
    )
    assert result["delay_months"] == 0
    assert result["feasibility_status"] == "Feasible"

def test_rescheduling_contains_roadmap():
    today = date.today()
    result = simulate_adaptive_rescheduling(
        target_amount=100000.0,
        current_savings=0.0,
        original_deadline=today + relativedelta(months=6),
        unexpected_expense_amount=10000.0,
        funding_source="current_income",
        monthly_income=70000.0,
        essential_expenses=35000.0,
        discretionary_expenses=15000.0,
        current_date=today,
    )
    assert "roadmap" in result
    assert isinstance(result["roadmap"], list)
    for item in result["roadmap"]:
        assert "month" in item
        assert "cumulative_savings" in item

def test_rescheduling_essential_expenses_never_cut():
    """Essential expenses must never be reduced by the engine."""
    today = date.today()
    result = simulate_adaptive_rescheduling(
        target_amount=200000.0,
        current_savings=0.0,
        original_deadline=today + relativedelta(months=6),
        unexpected_expense_amount=50000.0,
        funding_source="current_income",
        monthly_income=60000.0,
        essential_expenses=55000.0,  # almost entire income is essential
        discretionary_expenses=5000.0,
        current_date=today,
    )
    # Should extend deadline, not demand impossible monthly savings
    assert float(result["revised_monthly_savings"]) <= (60000.0 - 55000.0) * 1.1 or result["delay_months"] > 0


# ---------------------------------------------------------------------------
# Categorizer tests
# ---------------------------------------------------------------------------

def test_categorizer_salary():
    cat, conf = categorizer.predict("Salary Credit NEFT", "credit")
    assert cat == "Income"

def test_categorizer_rent():
    cat, conf = categorizer.predict("Apartment Rent Payment", "debit")
    assert cat == "Rent"

def test_categorizer_food():
    cat, conf = categorizer.predict("Swiggy Food Order", "debit")
    assert cat in ("Food and Dining", "Others")

def test_categorizer_groceries():
    cat, conf = categorizer.predict("D-Mart Groceries", "debit")
    assert cat in ("Groceries", "Others")

def test_categorizer_returns_tuple():
    result = categorizer.predict("Unknown transaction", "debit")
    assert isinstance(result, tuple)
    assert len(result) == 2
    assert isinstance(result[0], str)
    assert isinstance(result[1], float)

def test_categorizer_confidence_in_range():
    _, conf = categorizer.predict("Netflix Subscription", "debit")
    assert 0.0 <= conf <= 1.0
