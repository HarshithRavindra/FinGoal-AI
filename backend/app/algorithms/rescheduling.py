"""Adaptive Goal Rescheduling Engine — The Core Algorithmic Innovation of FinGoal-AI.

Recalculates savings capacity, models financial shock absorption across funding sources,
re-evaluates feasibility, adjusts discretionary margins, and synthesizes revised monthly roadmaps.
"""

from datetime import date
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from typing import Dict, List, Any
import numpy as np


def generate_monthly_roadmap(
    start_date: date,
    months_count: int,
    monthly_target: float,
    initial_savings: float = 0.0,
) -> List[Dict[str, Any]]:
    """Synthesize month-by-month cumulative milestone progress."""
    roadmap = []
    cumulative = initial_savings
    for m in range(1, months_count + 1):
        target_month_date = start_date + relativedelta(months=m)
        month_label = target_month_date.strftime("%b %Y")
        cumulative += monthly_target
        roadmap.append({
            "month": month_label,
            "month_number": m,
            "target_savings": round(monthly_target, 2),
            "cumulative_savings": round(cumulative, 2),
            "target_met": False,
        })
    return roadmap


def simulate_adaptive_rescheduling(
    target_amount: float,
    current_savings: float,
    original_deadline: date,
    unexpected_expense_amount: float,
    funding_source: str,  # 'emergency_fund', 'current_income', 'goal_savings', 'other'
    monthly_income: float,
    essential_expenses: float,
    discretionary_expenses: float,
    other_obligations: float = 0.0,
    current_date: date = None,
) -> Dict[str, Any]:
    """
    Simulate the dynamic adjustment of a savings goal upon an unexpected life event.
    
    Guiding Principles:
    1. Essential living expenses (Rent, Food, Healthcare) are strictly protected.
    2. Funding source determines whether shock affects accumulated principal, monthly cash flow, or safety reserve.
    3. If cash flow capacity is constrained, timeline is extended rationally rather than imposing impossible contributions.
    """
    if current_date is None:
        current_date = date.today()

    # Original timeline duration in months
    original_remaining_months = max(
        1,
        (original_deadline.year - current_date.year) * 12
        + (original_deadline.month - current_date.month),
    )
    original_remaining_amount = max(0.0, target_amount - current_savings)
    original_monthly_savings = round(
        original_remaining_amount / original_remaining_months, 2
    )

    # 1. Determine impact of the financial shock based on selected funding source
    revised_savings = current_savings
    monthly_capacity_reduction = 0.0
    shock_reason_detail = ""

    if funding_source == "goal_savings":
        # Shock was directly withdrawn from accumulated goal capital
        revised_savings = max(0.0, current_savings - unexpected_expense_amount)
        shock_reason_detail = (
            f"An unexpected expense of ₹{unexpected_expense_amount:,.0f} was funded directly from your accumulated "
            f"goal savings, reducing your saved balance from ₹{current_savings:,.0f} to ₹{revised_savings:,.0f}."
        )

    elif funding_source == "current_income":
        # Shock was absorbed by current month's income, zeroing or compressing available monthly surplus
        monthly_capacity_reduction = unexpected_expense_amount
        shock_reason_detail = (
            f"An unexpected expense of ₹{unexpected_expense_amount:,.0f} was absorbed by your current monthly earnings. "
            f"This creates a temporary cash flow deficit for the current billing cycle."
        )

    elif funding_source == "emergency_fund":
        # Funded by emergency cushion: goal balance is intact, but future monthly savings should replenish safety buffer
        shock_reason_detail = (
            f"An unexpected expense of ₹{unexpected_expense_amount:,.0f} was absorbed by your emergency savings cushion. "
            f"Your goal balance remains intact, but replenishing your liquid safety reserves is factored into your financial health."
        )

    else:  # 'other'
        shock_reason_detail = (
            f"An unexpected expense of ₹{unexpected_expense_amount:,.0f} occurred and was funded via external credit or family support."
        )

    # 2. Recalculate remaining goal amount
    revised_remaining_amount = max(0.0, target_amount - revised_savings)

    # 3. Assess uncommitted capacity (strictly income minus essential expenses)
    uncommitted_monthly_capacity = max(
        0.0, monthly_income - essential_expenses - other_obligations
    )
    current_actual_monthly_surplus = max(
        0.0,
        monthly_income - essential_expenses - discretionary_expenses - other_obligations,
    )

    # 4. Formulate revised timeline and monthly contribution
    discretionary_reduction_recommended = 0.0

    if uncommitted_monthly_capacity <= 0:
        # User has zero discretionary headroom; timeline must extend considerably
        delay_months = 6
        revised_months = original_remaining_months + delay_months
        revised_monthly = (
            round(revised_remaining_amount / revised_months, 2)
            if revised_months > 0
            else 0.0
        )
        feasibility_status = "Not currently feasible"
        explanation = (
            f"{shock_reason_detail} Your fixed essential commitments consume all available monthly income. "
            f"To keep this goal realistic without compromising essential living standards, the timeline is deferred by {delay_months} months."
        )

    elif (
        revised_remaining_amount / original_remaining_months
        <= current_actual_monthly_surplus
    ):
        # Shock can be absorbed without timeline delay or discretionary cuts
        delay_months = 0
        revised_months = original_remaining_months
        revised_monthly = round(revised_remaining_amount / revised_months, 2)
        feasibility_status = "Feasible"
        explanation = (
            f"{shock_reason_detail} Fortunately, your existing monthly surplus is sufficient to absorb this impact "
            f"while maintaining your original deadline of {original_deadline.strftime('%b %Y')}."
        )

    elif (
        revised_remaining_amount / original_remaining_months
        <= uncommitted_monthly_capacity
    ):
        # Shock can be absorbed on original deadline if discretionary spending is trimmed
        needed_monthly = revised_remaining_amount / original_remaining_months
        discretionary_reduction_recommended = max(
            0.0, needed_monthly - current_actual_monthly_surplus
        )
        delay_months = 0
        revised_months = original_remaining_months
        revised_monthly = round(needed_monthly, 2)
        feasibility_status = "Feasible with adjustments"
        explanation = (
            f"{shock_reason_detail} To achieve your target by the original deadline, we recommend trimming non-essential "
            f"discretionary spending (entertainment, dining out, subscriptions) by ~₹{discretionary_reduction_recommended:,.0f}/mo. "
            f"Essential expenses remain 100% safeguarded."
        )

    else:
        # Exceeds total capacity; timeline MUST be extended to keep monthly target realistic
        # Target a monthly contribution equal to 85% of available uncommitted capacity
        sustainable_monthly = uncommitted_monthly_capacity * 0.85
        revised_months = int(np.ceil(revised_remaining_amount / sustainable_monthly))
        delay_months = max(1, revised_months - original_remaining_months)
        revised_monthly = round(revised_remaining_amount / revised_months, 2)
        discretionary_reduction_recommended = discretionary_expenses * 0.50
        feasibility_status = "Feasible with adjustments"
        explanation = (
            f"{shock_reason_detail} Attempting to meet the original deadline would impose an unsustainable monthly burden. "
            f"The adaptive engine has dynamically extended your deadline by {delay_months} months (new target: "
            f"{(current_date + relativedelta(months=revised_months)).strftime('%b %Y')}), reducing monthly required savings to a manageable ₹{revised_monthly:,.0f}/mo."
        )

    revised_deadline = current_date + relativedelta(months=revised_months)
    roadmap = generate_monthly_roadmap(
        current_date, revised_months, revised_monthly, revised_savings
    )

    return {
        "target_amount": target_amount,
        "unexpected_expense_amount": unexpected_expense_amount,
        "funding_source": funding_source,
        "original_monthly_savings": original_monthly_savings,
        "revised_monthly_savings": revised_monthly,
        "original_deadline": original_deadline,
        "revised_deadline": revised_deadline,
        "delay_months": delay_months,
        "remaining_target_amount": revised_remaining_amount,
        "feasibility_status": feasibility_status,
        "rescheduling_reason": shock_reason_detail,
        "discretionary_reduction_recommended": round(
            discretionary_reduction_recommended, 2
        ),
        "explanation": explanation,
        "roadmap": roadmap,
    }

