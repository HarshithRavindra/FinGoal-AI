"""Financial Health Score (FHS) Multi-Factor Evaluation Engine.

Weighted Formulation:
FHS = 0.30S + 0.25E + 0.25C + 0.20I
Where:
- S: Savings Rate Score (30%)
- E: Expense-to-Income Score (25%)
- C: Essential Expense Coverage Score (25%)
- I: Income Stability Score (20%)
"""

from typing import Dict, List, Any, Tuple
import numpy as np

# Type alias
Tuple_score = Tuple[float, str]


def calculate_savings_rate_score(savings_rate: float) -> Tuple_score:
    """
    Score savings rate from 0 to 100.
    A savings rate of 30% or higher is considered optimal (100).
    A savings rate between 0% and 30% scales linearly.
    Negative savings rate (dissaving) scores 0.
    """
    if savings_rate <= 0:
        return 0.0, "You are currently spending more than your monthly income, resulting in a deficit."
    elif savings_rate >= 0.30:
        return 100.0, "Outstanding savings rate exceeding the recommended 30% wealth accumulation benchmark."
    else:
        score = (savings_rate / 0.30) * 100.0
        return round(score, 1), f"Current savings rate is {savings_rate*100:.1f}%. Increasing towards 30% will accelerate your goal timeline."


def calculate_expense_to_income_score(expense_ratio: float) -> Tuple_score:
    """
    Score expense-to-income ratio from 0 to 100.
    Spending 50% or less of income yields 100.
    Spending between 50% and 100% scales down to 20.
    Spending > 100% yields 0.
    """
    if expense_ratio <= 0.50:
        return 100.0, "Lean expenditure profile: Total operational spending is under 50% of monthly inflows."
    elif expense_ratio >= 1.0:
        return 0.0, "Critical spending burden: Expenses meet or exceed 100% of income."
    else:
        # 0.50 -> 100, 1.0 -> 20
        score = 100.0 - ((expense_ratio - 0.50) / 0.50) * 80.0
        return round(score, 1), f"Total expenses consume {expense_ratio*100:.1f}% of your income. Pruning discretionary line items is recommended."


def calculate_essential_coverage_score(
    available_savings: float, monthly_essential_expenses: float
) -> Tuple_score:
    """
    Score emergency buffer against fixed living costs (0 to 100).
    6+ months of essential living costs = 100
    3 months = 70
    1 month = 40
    < 1 month = 15
    """
    if monthly_essential_expenses <= 0:
        return 75.0, "No ongoing essential commitments detected."

    months_covered = available_savings / monthly_essential_expenses
    if months_covered >= 6.0:
        return 100.0, f"Resilient safety cushion: Liquid reserves cover {months_covered:.1f} months of essential needs."
    elif months_covered >= 3.0:
        score = 70.0 + ((months_covered - 3.0) / 3.0) * 30.0
        return round(score, 1), f"Moderate emergency cushion covering {months_covered:.1f} months of mandatory expenses."
    elif months_covered >= 1.0:
        score = 40.0 + ((months_covered - 1.0) / 2.0) * 30.0
        return round(score, 1), f"Vulnerable liquidity: Reserves only cover {months_covered:.1f} months of essential obligations."
    else:
        score = max(5.0, months_covered * 40.0)
        return round(score, 1), f"Urgent: Emergency reserves cover less than 1 full month of essential expenses ({months_covered:.1f} mos)."


def calculate_income_stability_score(monthly_incomes: List[float]) -> Tuple_score:
    """
    Score income consistency based on coefficient of variation (0 to 100).
    """
    if not monthly_incomes or len(monthly_incomes) < 2:
        return 75.0, "Stable baseline income assumed from initial statements."

    arr = np.array(monthly_incomes)
    mean_inc = np.mean(arr)
    if mean_inc <= 0:
        return 0.0, "No positive income stream detected."

    std_inc = np.std(arr)
    cv = std_inc / mean_inc  # Coefficient of variation

    if cv <= 0.05:
        return 100.0, "Highly predictable and stable income stream."
    elif cv <= 0.20:
        score = 100.0 - ((cv - 0.05) / 0.15) * 25.0
        return round(score, 1), "Fairly consistent monthly income with minor periodic fluctuations."
    else:
        score = max(10.0, 75.0 - ((cv - 0.20) / 0.40) * 65.0)
        return round(score, 1), "Significant income volatility detected across statement periods."



def compute_financial_health_score(
    monthly_income: float,
    monthly_expenses: float,
    essential_expenses: float,
    discretionary_expenses: float,
    available_liquid_savings: float = 0.0,
    historical_incomes: List[float] = None,
) -> Dict[str, Any]:
    """
    Calculate composite Financial Health Score and component breakdowns.
    """
    if historical_incomes is None:
        historical_incomes = [monthly_income]

    # Handle zero or negative income safely
    if monthly_income <= 0:
        savings = 0.0
        savings_rate = 0.0
        expense_ratio = 1.0
    else:
        savings = monthly_income - monthly_expenses
        savings_rate = savings / monthly_income
        expense_ratio = monthly_expenses / monthly_income

    essential_ratio = (
        (essential_expenses / monthly_income) if monthly_income > 0 else 1.0
    )

    s_score, s_expl = calculate_savings_rate_score(savings_rate)
    e_score, e_expl = calculate_expense_to_income_score(expense_ratio)
    c_score, c_expl = calculate_essential_coverage_score(
        available_liquid_savings, essential_expenses
    )
    i_score, i_expl = calculate_income_stability_score(historical_incomes)

    # Weighted model: FHS = 0.30S + 0.25E + 0.25C + 0.20I
    overall = (0.30 * s_score) + (0.25 * e_score) + (0.25 * c_score) + (0.20 * i_score)
    overall = round(max(0.0, min(100.0, overall)), 1)

    # Status Badge
    if overall >= 80:
        badge = "Excellent"
        summary = "Your financial health is exceptionally strong with disciplined savings, minimal fixed cost bloat, and resilient emergency buffering."
    elif overall >= 65:
        badge = "Good"
        summary = "Healthy financial foundation. Continuing to monitor discretionary outflows will further strengthen your resilience against unexpected shocks."
    elif overall >= 50:
        badge = "Fair"
        summary = "Moderate financial balance. Reallocating non-essential spending toward an emergency reserve will significantly enhance stability."
    elif overall >= 35:
        badge = "Needs Attention"
        summary = "Constrained financial headroom. Discretionary spending or high fixed costs are compressing your ability to build meaningful savings."
    else:
        badge = "Critical"
        summary = "Urgent structural deficit. Operating expenses meet or exceed current income. Prioritizing essential commitments is recommended."

    emergency_months = (
        round(available_liquid_savings / essential_expenses, 1)
        if essential_expenses > 0
        else 0.0
    )

    return {
        "overall_score": overall,
        "savings_rate_score": s_score,
        "expense_to_income_score": e_score,
        "essential_coverage_score": c_score,
        "income_stability_score": i_score,
        "metrics": {
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "monthly_savings": savings,
            "savings_rate": savings_rate,
            "expense_to_income_ratio": expense_ratio,
            "essential_expense_ratio": essential_ratio,
            "essential_expenses": essential_expenses,
            "discretionary_expenses": discretionary_expenses,
            "emergency_fund_months": emergency_months,
        },
        "status_badge": badge,
        "summary_explanation": summary,
        "component_explanations": {
            "savings_rate": s_expl,
            "expense_to_income": e_expl,
            "essential_coverage": c_expl,
            "income_stability": i_expl,
        },
    }

