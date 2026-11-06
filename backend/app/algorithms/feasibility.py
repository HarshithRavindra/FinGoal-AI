"""Goal Feasibility Assessment Engine."""

from datetime import date
from typing import Dict, Any
import numpy as np


def assess_goal_feasibility(
    target_amount: float,
    current_savings: float,
    target_date: date,
    monthly_income: float,
    essential_expenses: float,
    discretionary_expenses: float,
    other_obligations: float = 0.0,
    current_date: date = None,
) -> Dict[str, Any]:
    """
    Assess whether a savings goal is achievable within the requested deadline.
    
    Formulas:
    Remaining Amount = Target Amount - Current Goal Savings
    Remaining Months = Date Difference in months
    Required Monthly Savings = Remaining Amount / Remaining Months
    Available Savings Capacity = Monthly Income - Essential Expenses - Other Obligations
    """
    if current_date is None:
        current_date = date.today()

    # Calculate remaining months
    diff_months = (target_date.year - current_date.year) * 12 + (
        target_date.month - current_date.month
    )
    if diff_months <= 0:
        diff_months = 1  # Minimum 1 month divisor

    remaining_amount = max(0.0, target_amount - current_savings)
    required_monthly = round(remaining_amount / diff_months, 2)

    # Available uncommitted capacity (strictly preserving essential commitments)
    uncommitted_capacity = max(
        0.0, monthly_income - essential_expenses - other_obligations
    )
    current_actual_savings = max(
        0.0, monthly_income - essential_expenses - discretionary_expenses - other_obligations
    )

    # Feasibility Evaluation
    if required_monthly <= current_actual_savings:
        status = "Feasible"
        message = (
            f"Achievable on schedule. Your current monthly savings rate easily accommodates "
            f"the required ₹{required_monthly:,.0f}/mo contribution."
        )
        adjustments_needed = False
        discretionary_reduction_needed = 0.0
        months_needed = diff_months

    elif required_monthly <= uncommitted_capacity:
        # Feasible if user reduces some discretionary spending
        discretionary_reduction_needed = required_monthly - current_actual_savings
        status = "Feasible with adjustments"
        message = (
            f"Achievable with lifestyle adjustments. Your required savings of ₹{required_monthly:,.0f}/mo "
            f"exceeds current unallocated surplus, but is within your discretionary margin. "
            f"Trimming ₹{discretionary_reduction_needed:,.0f}/mo from dining or shopping makes this goal attainable."
        )
        adjustments_needed = True
        months_needed = diff_months

    else:
        # Required monthly exceeds even the entire discretionary margin
        status = "Not currently feasible"
        # Calculate realistic timeline based on full uncommitted capacity
        if uncommitted_capacity > 0:
            suggested_months = int(np.ceil(remaining_amount / uncommitted_capacity))
            message = (
                f"Your goal requires ₹{required_monthly:,.0f}/mo, which exceeds your total available "
                f"savings capacity (₹{uncommitted_capacity:,.0f}/mo). We recommend extending your timeline "
                f"from {diff_months} to {suggested_months} months or adjusting the target amount."
            )
            months_needed = suggested_months
        else:
            suggested_months = diff_months + 12
            message = (
                f"Your essential expenses consume all current monthly income. Achieving this goal requires "
                f"enhancing income or extending timeline significantly."
            )
            months_needed = suggested_months

        adjustments_needed = True
        discretionary_reduction_needed = discretionary_expenses

    return {
        "status": status,
        "message": message,
        "required_monthly_savings": required_monthly,
        "available_capacity": round(uncommitted_capacity, 2),
        "current_actual_savings": round(current_actual_savings, 2),
        "remaining_amount": round(remaining_amount, 2),
        "remaining_months": diff_months,
        "suggested_months": months_needed,
        "discretionary_reduction_needed": round(discretionary_reduction_needed, 2),
        "adjustments_needed": adjustments_needed,
    }


