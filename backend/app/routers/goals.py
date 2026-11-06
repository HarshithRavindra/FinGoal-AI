"""Savings Goals Router — CRUD, Smart Automated Allocation, and Dual Scenario Planning."""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any, Optional
from dateutil.relativedelta import relativedelta
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import SavingsGoal, SavingsAllocation, Transaction, User
from app.schemas.goal import (
    GoalCreate,
    GoalResponse,
    GoalUpdate,
    GoalsOverviewResponse,
    AllocationPreviewResponse,
    AllocateSavingsRequest,
    AllocationRecordResponse,
)
from app.algorithms.feasibility import assess_goal_feasibility
from app.utils.security import get_current_user

router = APIRouter(prefix="/goals", tags=["Savings Goals"])


def _get_financial_context(user_id: int, db: Session):
    """Aggregate monthly income/expenses and actual liquid ledger balance."""
    from collections import defaultdict

    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txns:
        return 0.0, 0.0, 0.0, 0.0

    # Operational transactions (exclude internal transfers)
    op_txns = [t for t in txns if t.category != "Transfers"]

    credits = [float(t.amount) for t in op_txns if t.transaction_type == "credit"]
    essentials = [float(t.amount) for t in op_txns if t.transaction_type == "debit" and t.expense_type == "Essential"]
    discretionary = [float(t.amount) for t in op_txns if t.transaction_type == "debit" and t.expense_type == "Discretionary"]

    monthly_income_map: Dict[tuple, float] = defaultdict(float)
    for t in op_txns:
        if t.transaction_type == "credit":
            monthly_income_map[(t.date.year, t.date.month)] += float(t.amount)

    months_count = max(len(monthly_income_map), 1)
    avg_income = sum(credits) / months_count
    avg_essential = sum(essentials) / months_count
    avg_discretionary = sum(discretionary) / months_count

    # Actual Accumulated Savings in bank account (all credits minus all debits)
    all_credits = sum(float(t.amount) for t in txns if t.transaction_type == "credit")
    all_debits = sum(float(t.amount) for t in txns if t.transaction_type == "debit")
    actual_accumulated = max(0.0, all_credits - all_debits)

    return avg_income, avg_essential, avg_discretionary, actual_accumulated


def _enrich_goal(
    goal: SavingsGoal,
    income: float,
    essential: float,
    discretionary: float,
    today: Optional[date] = None,
) -> dict:
    """Compute feasibility and dual planning scenarios (Current vs Optimized)."""
    if today is None:
        today = date.today()

    target_amt = float(goal.target_amount)
    current_sav = float(goal.current_savings)
    remaining_amt = max(0.0, target_amt - current_sav)
    completion_pct = min(100.0, round((current_sav / target_amt * 100.0), 1)) if target_amt > 0 else 0.0

    feasibility = assess_goal_feasibility(
        target_amount=target_amt,
        current_savings=current_sav,
        target_date=goal.target_date,
        monthly_income=income,
        essential_expenses=essential,
        discretionary_expenses=discretionary,
        current_date=today,
    )

    remaining_months = feasibility["remaining_months"]
    req_monthly = feasibility["required_monthly_savings"]
    uncommitted_cap = feasibility["available_capacity"]
    current_surplus = feasibility["current_actual_savings"]

    # 1. CURRENT SAVINGS PLAN SCENARIO
    if current_surplus > 0:
        cur_est_months = max(1, int(np.ceil(remaining_amt / current_surplus)))
    else:
        cur_est_months = remaining_months + 12

    cur_est_completion_date = today + relativedelta(months=cur_est_months)

    current_plan = {
        "monthly_contribution": Decimal(str(round(min(req_monthly, current_surplus if current_surplus > 0 else req_monthly), 2))),
        "remaining_amount": Decimal(str(round(remaining_amt, 2))),
        "remaining_months": remaining_months,
        "estimated_completion_date": cur_est_completion_date,
        "completion_percentage": completion_pct,
        "feasibility_status": feasibility["status"],
    }

    # 2. OPTIMIZED SAVINGS PLAN SCENARIO
    # Prune non-essential discretionary items by 30% to accelerate allocation
    discretionary_trim_potential = discretionary * 0.30
    opt_monthly_capacity = current_surplus + discretionary_trim_potential

    if opt_monthly_capacity > 0:
        opt_est_months = max(1, int(np.ceil(remaining_amt / opt_monthly_capacity)))
        time_saved = max(0, cur_est_months - opt_est_months)
        opt_est_completion_date = today + relativedelta(months=opt_est_months)
        achievable_by_deadline = min(target_amt, current_sav + (opt_monthly_capacity * remaining_months))
    else:
        opt_est_months = cur_est_months
        time_saved = 0
        opt_est_completion_date = cur_est_completion_date
        achievable_by_deadline = current_sav

    opt_feasibility = "Achievable" if (req_monthly <= opt_monthly_capacity) else "Achievable with adjustments"

    optimized_plan = {
        "optimized_monthly_contribution": Decimal(str(round(opt_monthly_capacity, 2))),
        "potential_additional_savings": Decimal(str(round(discretionary_trim_potential, 2))),
        "estimated_completion_date": opt_est_completion_date,
        "estimated_months": opt_est_months,
        "time_saved_months": time_saved,
        "amount_achievable_by_deadline": Decimal(str(round(achievable_by_deadline, 2))),
        "feasibility_status": opt_feasibility,
    }

    # Feasibility details diagnostic
    gap_amount = max(0.0, req_monthly - current_surplus)
    suggested_alt_deadline = today + relativedelta(months=feasibility["suggested_months"])

    feasibility_details = {
        "shortfall_per_month": Decimal(str(round(gap_amount, 2))),
        "discretionary_reduction_needed": Decimal(str(round(feasibility["discretionary_reduction_needed"], 2))),
        "suggested_deadline": suggested_alt_deadline,
        "suggested_months": feasibility["suggested_months"],
        "advice": feasibility["message"],
    }

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "name": goal.name,
        "target_amount": goal.target_amount,
        "current_savings": goal.current_savings,
        "target_date": goal.target_date,
        "category": goal.category,
        "priority": goal.priority,
        "status": goal.status,
        "remaining_months": remaining_months,
        "required_monthly_savings": Decimal(str(req_monthly)),
        "available_capacity": Decimal(str(uncommitted_cap)),
        "feasibility_status": feasibility["status"],
        "feasibility_message": feasibility["message"],
        "completion_percentage": completion_pct,
        "estimated_completion_date": cur_est_completion_date,
        "current_plan": current_plan,
        "optimized_plan": optimized_plan,
        "feasibility_details": feasibility_details,
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new savings goal with real-time feasibility and scenario analysis."""
    if payload.target_date <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target date must be in the future.",
        )
    goal = SavingsGoal(
        user_id=current_user.id,
        name=payload.name,
        target_amount=payload.target_amount,
        current_savings=payload.current_savings,
        target_date=payload.target_date,
        category=payload.category,
        priority=payload.priority.lower() if payload.priority else "medium",
        status="active",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    income, essential, discretionary, _ = _get_financial_context(current_user.id, db)
    return _enrich_goal(goal, income, essential, discretionary)


@router.get("/overview", response_model=GoalsOverviewResponse)
def get_goals_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Overview metrics across all active goals:
    - Total targets, allocated savings, and remaining gap
    - Monthly savings capacity vs Actual accumulated bank surplus
    - Unallocated accumulated savings available for auto-allocation
    """
    income, essential, discretionary, actual_accumulated = _get_financial_context(current_user.id, db)
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id,
        SavingsGoal.status == "active"
    ).all()

    total_target = sum(float(g.target_amount) for g in goals)
    total_allocated = sum(float(g.current_savings) for g in goals)
    remaining_goal = max(0.0, total_target - total_allocated)
    overall_pct = min(100.0, round((total_allocated / total_target * 100.0), 1)) if total_target > 0 else 0.0

    # Monthly capacity: Income - Expenses (Operational monthly cashflow surplus)
    monthly_capacity = max(0.0, income - essential - discretionary)
    potential_additional_savings = discretionary * 0.30
    potential_max_monthly = monthly_capacity + potential_additional_savings

    # Unallocated liquid savings: Actual bank balance minus what is already earmarked for active goals
    unallocated_savings = max(0.0, actual_accumulated - total_allocated)

    target_dates = [g.target_date for g in goals if g.target_date]
    earliest_date = min(target_dates) if target_dates else None
    latest_date = max(target_dates) if target_dates else None

    return {
        "total_active_goals": len(goals),
        "total_target_amount": Decimal(str(round(total_target, 2))),
        "total_actual_savings_allocated": Decimal(str(round(total_allocated, 2))),
        "remaining_goal_amount": Decimal(str(round(remaining_goal, 2))),
        "monthly_savings_capacity": Decimal(str(round(monthly_capacity, 2))),
        "actual_accumulated_savings": Decimal(str(round(actual_accumulated, 2))),
        "unallocated_accumulated_savings": Decimal(str(round(unallocated_savings, 2))),
        "potential_maximum_monthly_savings": Decimal(str(round(potential_max_monthly, 2))),
        "overall_achievement_percentage": overall_pct,
        "earliest_target_date": earliest_date,
        "latest_target_date": latest_date,
    }


@router.get("/allocation-preview", response_model=AllocationPreviewResponse)
def get_automatic_savings_allocation_preview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Automatic savings allocation calculation:
    - User does NOT manually enter an amount.
    - System detects actual available accumulated liquid savings from bank statement records.
    - Determines unallocated amount not yet earmarked for goals.
    - Allocates across active goals based on priority weights (High: 50%, Medium: 35%, Low: 15%)
      and deadline urgency.
    """
    income, essential, discretionary, actual_accumulated = _get_financial_context(current_user.id, db)
    goals = db.query(SavingsGoal).filter(
        SavingsGoal.user_id == current_user.id,
        SavingsGoal.status == "active"
    ).all()

    total_allocated_previously = sum(float(g.current_savings) for g in goals)
    unallocated_available = max(0.0, actual_accumulated - total_allocated_previously)

    # Incomplete active goals needing funding
    unfunded_goals = [g for g in goals if float(g.target_amount) > float(g.current_savings)]

    if not goals:
        return {
            "actual_accumulated_savings": Decimal(str(round(actual_accumulated, 2))),
            "total_allocated_previously": Decimal(str(round(total_allocated_previously, 2))),
            "unallocated_savings_available": Decimal("0.0"),
            "total_recommended_allocation": Decimal("0.0"),
            "is_balance_available": False,
            "status_note": "No active savings goals found. Create a goal first to allocate savings.",
            "allocations": [],
        }

    if unallocated_available <= 0:
        return {
            "actual_accumulated_savings": Decimal(str(round(actual_accumulated, 2))),
            "total_allocated_previously": Decimal(str(round(total_allocated_previously, 2))),
            "unallocated_savings_available": Decimal("0.0"),
            "total_recommended_allocation": Decimal("0.0"),
            "is_balance_available": False,
            "status_note": "Savings balance unavailable or fully allocated to existing goals. No unallocated surplus detected.",
            "allocations": [],
        }

    if not unfunded_goals:
        return {
            "actual_accumulated_savings": Decimal(str(round(actual_accumulated, 2))),
            "total_allocated_previously": Decimal(str(round(total_allocated_previously, 2))),
            "unallocated_savings_available": Decimal(str(round(unallocated_available, 2))),
            "total_recommended_allocation": Decimal("0.0"),
            "is_balance_available": True,
            "status_note": "All active savings goals are 100% completed!",
            "allocations": [],
        }

    # Priority weighting
    PRIORITY_WEIGHTS = {"high": 3.0, "medium": 2.0, "low": 1.0}
    weights = []
    for g in unfunded_goals:
        p_wt = PRIORITY_WEIGHTS.get(g.priority.lower(), 2.0)
        rem = float(g.target_amount) - float(g.current_savings)
        weights.append(p_wt * rem)

    total_weight = sum(weights) or 1.0

    allocations_preview = []
    total_distributed = 0.0

    for idx, g in enumerate(unfunded_goals):
        rem = float(g.target_amount) - float(g.current_savings)
        share_ratio = weights[idx] / total_weight
        # Target allocation share of unallocated available
        prop_alloc = round(min(rem, unallocated_available * share_ratio), 2)
        total_distributed += prop_alloc

        new_total = float(g.current_savings) + prop_alloc
        new_pct = min(100.0, round((new_total / float(g.target_amount) * 100.0), 1)) if float(g.target_amount) > 0 else 0.0

        p_str = g.priority.capitalize()
        reason = f"{p_str} priority weighting ({round(share_ratio*100, 1)}% allocation quota based on remaining ₹{rem:,.0f} requirement)."

        allocations_preview.append({
            "goal_id": g.id,
            "goal_name": g.name,
            "category": g.category,
            "priority": g.priority,
            "target_amount": g.target_amount,
            "current_savings": g.current_savings,
            "remaining_amount": Decimal(str(round(rem, 2))),
            "recommended_allocation": Decimal(str(prop_alloc)),
            "new_savings_total": Decimal(str(round(new_total, 2))),
            "new_completion_percentage": new_pct,
            "priority_weight_percentage": round(share_ratio * 100.0, 1),
            "reason": reason,
        })

    return {
        "actual_accumulated_savings": Decimal(str(round(actual_accumulated, 2))),
        "total_allocated_previously": Decimal(str(round(total_allocated_previously, 2))),
        "unallocated_savings_available": Decimal(str(round(unallocated_available, 2))),
        "total_recommended_allocation": Decimal(str(round(total_distributed, 2))),
        "is_balance_available": True,
        "status_note": f"System automatically identified ₹{unallocated_available:,.0f} in unallocated liquid savings available for smart priority distribution.",
        "allocations": allocations_preview,
    }


@router.post("/allocate-savings", response_model=List[GoalResponse])
def execute_savings_allocation(
    payload: AllocateSavingsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Confirm and apply automatic/guided savings allocation:
    - Validates total allocated does NOT exceed actual unallocated liquid balance.
    - Updates goal current_savings and creates audit record in savings_allocations.
    - Prevents double-counting or allocating money that does not exist.
    """
    if not payload.allocations:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No allocations provided.")

    income, essential, discretionary, actual_accumulated = _get_financial_context(current_user.id, db)
    all_goals = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()
    goals_map = {g.id: g for g in all_goals}

    total_allocated_previously = sum(float(g.current_savings) for g in all_goals if g.status == "active")
    unallocated_available = max(0.0, actual_accumulated - total_allocated_previously)

    requested_sum = sum(float(item.amount) for item in payload.allocations)
    if requested_sum > (unallocated_available + 0.5):  # allow minor float rounding
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested allocation (₹{requested_sum:,.2f}) exceeds available unallocated savings (₹{unallocated_available:,.2f}).",
        )

    updated_goals = []
    for item in payload.allocations:
        goal = goals_map.get(item.goal_id)
        if not goal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Goal {item.goal_id} not found.")

        alloc_amt = float(item.amount)
        if alloc_amt <= 0:
            continue

        goal.current_savings = Decimal(str(round(float(goal.current_savings) + alloc_amt, 2)))

        # Create audit record in savings_allocations
        record = SavingsAllocation(
            user_id=current_user.id,
            goal_id=goal.id,
            amount=Decimal(str(round(alloc_amt, 2))),
            allocation_date=date.today(),
            source=payload.source,
            notes=item.notes or f"Smart priority auto-allocation from accumulated savings reserve.",
        )
        db.add(record)
        updated_goals.append(goal)

    db.commit()

    return [_enrich_goal(g, income, essential, discretionary) for g in updated_goals]


@router.get("/allocation-history", response_model=List[AllocationRecordResponse])
def get_allocation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve audit trail of historical savings allocations across goals."""
    records = (
        db.query(SavingsAllocation)
        .filter(SavingsAllocation.user_id == current_user.id)
        .order_by(SavingsAllocation.created_at.desc())
        .limit(50)
        .all()
    )

    result = []
    goals_cache: Dict[int, str] = {}
    for r in records:
        if r.goal_id not in goals_cache:
            g = db.query(SavingsGoal).filter(SavingsGoal.id == r.goal_id).first()
            goals_cache[r.goal_id] = g.name if g else "Goal"

        result.append({
            "id": r.id,
            "goal_id": r.goal_id,
            "goal_name": goals_cache[r.goal_id],
            "amount": r.amount,
            "allocation_date": r.allocation_date,
            "source": r.source,
            "notes": r.notes,
            "created_at": r.created_at,
        })
    return result


@router.get("/", response_model=List[GoalResponse])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all savings goals enriched with Current vs Optimized plans and feasibility diagnostics."""
    goals = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.created_at.desc())
        .all()
    )
    income, essential, discretionary, _ = _get_financial_context(current_user.id, db)
    return [_enrich_goal(g, income, essential, discretionary) for g in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single savings goal with comprehensive scenario plans."""
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    income, essential, discretionary, _ = _get_financial_context(current_user.id, db)
    return _enrich_goal(goal, income, essential, discretionary)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update goal parameters (target, deadline, category, priority)."""
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    income, essential, discretionary, _ = _get_financial_context(current_user.id, db)
    return _enrich_goal(goal, income, essential, discretionary)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a savings goal."""
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    db.delete(goal)
    db.commit()
