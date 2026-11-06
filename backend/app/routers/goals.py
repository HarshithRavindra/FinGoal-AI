"""Savings Goals Router — CRUD + feasibility assessment."""

from datetime import date
from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import SavingsGoal, Transaction, User
from app.schemas.goal import GoalCreate, GoalResponse, GoalUpdate
from app.algorithms.feasibility import assess_goal_feasibility
from app.utils.security import get_current_user

router = APIRouter(prefix="/goals", tags=["Savings Goals"])


def _get_financial_context(user_id: int, db: Session):
    """Aggregate monthly income/expenses for feasibility calculations."""
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
    avg_income = sum(credits) / months_count
    avg_essential = sum(essentials) / months_count
    avg_discretionary = sum(discretionary) / months_count
    return avg_income, avg_essential, avg_discretionary


def _enrich_goal(goal: SavingsGoal, income: float, essential: float, discretionary: float) -> dict:
    """Compute feasibility and merge into goal dict."""
    feasibility = assess_goal_feasibility(
        target_amount=float(goal.target_amount),
        current_savings=float(goal.current_savings),
        target_date=goal.target_date,
        monthly_income=income,
        essential_expenses=essential,
        discretionary_expenses=discretionary,
    )
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
        "remaining_months": feasibility["remaining_months"],
        "required_monthly_savings": Decimal(str(feasibility["required_monthly_savings"])),
        "available_capacity": Decimal(str(feasibility["available_capacity"])),
        "feasibility_status": feasibility["status"],
        "feasibility_message": feasibility["message"],
        "created_at": goal.created_at,
        "updated_at": goal.updated_at,
    }


@router.post("/", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new savings goal."""
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
        priority=payload.priority,
        status="active",
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    income, essential, discretionary = _get_financial_context(current_user.id, db)
    return _enrich_goal(goal, income, essential, discretionary)


@router.get("/", response_model=List[GoalResponse])
def list_goals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all savings goals for the user."""
    goals = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.created_at.desc())
        .all()
    )
    income, essential, discretionary = _get_financial_context(current_user.id, db)
    return [_enrich_goal(g, income, essential, discretionary) for g in goals]


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a single savings goal with feasibility assessment."""
    goal = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == current_user.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found.")
    income, essential, discretionary = _get_financial_context(current_user.id, db)
    return _enrich_goal(goal, income, essential, discretionary)


@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a savings goal."""
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
    income, essential, discretionary = _get_financial_context(current_user.id, db)
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

