"""Adaptive Goal Rescheduling Router — Core FinGoal-AI innovation."""

from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import PlanAdjustment, SavingsGoal, SavingsPlan, Transaction, User
from app.schemas.rescheduling import AdaptiveRescheduleResponseSchema, UnexpectedExpenseInputSchema
from app.algorithms.rescheduling import simulate_adaptive_rescheduling
from app.utils.security import get_current_user

router = APIRouter(prefix="/rescheduling", tags=["Adaptive Rescheduling"])


def _get_financial_context(user_id: int, db: Session):
    from collections import defaultdict
    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txns:
        return 0.0, 0.0, 0.0
    credits = [float(t.amount) for t in txns if t.transaction_type == "credit"]
    essentials = [float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Essential"]
    discretionary = [float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Discretionary"]
    monthly_income_map: dict = defaultdict(float)
    for t in txns:
        if t.transaction_type == "credit":
            monthly_income_map[(t.date.year, t.date.month)] += float(t.amount)
    months_count = max(len(monthly_income_map), 1)
    return sum(credits) / months_count, sum(essentials) / months_count, sum(discretionary) / months_count


@router.post("/simulate", response_model=AdaptiveRescheduleResponseSchema)
def simulate_rescheduling(
    payload: UnexpectedExpenseInputSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Simulate adaptive rescheduling for a goal after an unexpected expense.
    Does NOT persist — preview only.
    """
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == payload.goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    income, essential, discretionary = _get_financial_context(current_user.id, db)
    result = simulate_adaptive_rescheduling(
        target_amount=float(goal.target_amount),
        current_savings=float(goal.current_savings),
        original_deadline=goal.target_date,
        unexpected_expense_amount=float(payload.amount),
        funding_source=payload.funding_source,
        monthly_income=income,
        essential_expenses=essential,
        discretionary_expenses=discretionary,
        current_date=payload.expense_date,
    )

    return {
        "goal_id": goal.id,
        "goal_name": goal.name,
        "target_amount": Decimal(str(result["target_amount"])),
        "unexpected_expense_amount": Decimal(str(result["unexpected_expense_amount"])),
        "funding_source": result["funding_source"],
        "original_monthly_savings": Decimal(str(result["original_monthly_savings"])),
        "revised_monthly_savings": Decimal(str(result["revised_monthly_savings"])),
        "original_deadline": result["original_deadline"],
        "revised_deadline": result["revised_deadline"],
        "delay_months": result["delay_months"],
        "remaining_target_amount": Decimal(str(result["remaining_target_amount"])),
        "feasibility_status": result["feasibility_status"],
        "rescheduling_reason": result["rescheduling_reason"],
        "discretionary_reduction_recommended": Decimal(str(result["discretionary_reduction_recommended"])),
        "explanation": result["explanation"],
        "roadmap": result["roadmap"],
        "created_at": datetime.now(timezone.utc),
    }


@router.post("/apply", response_model=AdaptiveRescheduleResponseSchema)
def apply_rescheduling(
    payload: UnexpectedExpenseInputSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply adaptive rescheduling: persist the new plan and audit record.
    """
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == payload.goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    income, essential, discretionary = _get_financial_context(current_user.id, db)
    result = simulate_adaptive_rescheduling(
        target_amount=float(goal.target_amount),
        current_savings=float(goal.current_savings),
        original_deadline=goal.target_date,
        unexpected_expense_amount=float(payload.amount),
        funding_source=payload.funding_source,
        monthly_income=income,
        essential_expenses=essential,
        discretionary_expenses=discretionary,
        current_date=payload.expense_date,
    )

    # Deactivate previous plan versions
    db.query(SavingsPlan).filter(
        SavingsPlan.goal_id == goal.id, SavingsPlan.is_active == True
    ).update({"is_active": False})

    # Count existing versions
    version_count = db.query(SavingsPlan).filter(SavingsPlan.goal_id == goal.id).count()

    new_plan = SavingsPlan(
        goal_id=goal.id,
        user_id=current_user.id,
        plan_version=version_count + 1,
        is_active=True,
        target_amount=Decimal(str(result["target_amount"])),
        required_monthly_savings=Decimal(str(result["revised_monthly_savings"])),
        available_capacity=Decimal(str(income - essential)),
        target_date=result["revised_deadline"],
        feasibility_status=result["feasibility_status"],
        roadmap_json=result["roadmap"],
    )
    db.add(new_plan)

    # Audit record
    adjustment = PlanAdjustment(
        goal_id=goal.id,
        user_id=current_user.id,
        unexpected_expense_amount=payload.amount,
        description=payload.description,
        funding_source=payload.funding_source,
        original_deadline=result["original_deadline"],
        revised_deadline=result["revised_deadline"],
        original_monthly_savings=Decimal(str(result["original_monthly_savings"])),
        revised_monthly_savings=Decimal(str(result["revised_monthly_savings"])),
        delay_months=result["delay_months"],
        reason=result["explanation"],
        discretionary_reduction_recommended=Decimal(str(result["discretionary_reduction_recommended"])),
    )
    db.add(adjustment)

    # Update goal deadline to match revised plan
    goal.target_date = result["revised_deadline"]
    if payload.funding_source == "goal_savings":
        goal.current_savings = Decimal(str(max(0.0, float(goal.current_savings) - float(payload.amount))))

    db.commit()
    db.refresh(new_plan)

    return {
        "goal_id": goal.id,
        "goal_name": goal.name,
        "target_amount": Decimal(str(result["target_amount"])),
        "unexpected_expense_amount": Decimal(str(result["unexpected_expense_amount"])),
        "funding_source": result["funding_source"],
        "original_monthly_savings": Decimal(str(result["original_monthly_savings"])),
        "revised_monthly_savings": Decimal(str(result["revised_monthly_savings"])),
        "original_deadline": result["original_deadline"],
        "revised_deadline": result["revised_deadline"],
        "delay_months": result["delay_months"],
        "remaining_target_amount": Decimal(str(result["remaining_target_amount"])),
        "feasibility_status": result["feasibility_status"],
        "rescheduling_reason": result["rescheduling_reason"],
        "discretionary_reduction_recommended": Decimal(str(result["discretionary_reduction_recommended"])),
        "explanation": result["explanation"],
        "roadmap": result["roadmap"],
        "created_at": new_plan.created_at,
    }

