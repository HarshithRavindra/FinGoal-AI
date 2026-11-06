"""Financial Health Score Router."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models.models import FinancialReport, Transaction, User
from app.schemas.health_score import FinancialHealthScoreResponse
from app.algorithms.financial_health import compute_financial_health_score
from app.utils.security import get_current_user

router = APIRouter(prefix="/financial-health", tags=["Financial Health"])


def _aggregate_user_financials(user_id: int, db: Session):
    """Aggregate monthly income, expenses, and historical data from transactions."""
    from sqlalchemy import func, extract
    from app.models.models import Transaction

    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txns:
        return None

    credits = [float(t.amount) for t in txns if t.transaction_type == "credit"]
    debits = [float(t.amount) for t in txns if t.transaction_type == "debit"]
    essentials = [float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Essential"]
    discretionary = [float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Discretionary"]

    # Group income by month
    from collections import defaultdict
    monthly_income: dict = defaultdict(float)
    for t in txns:
        if t.transaction_type == "credit":
            key = (t.date.year, t.date.month)
            monthly_income[key] += float(t.amount)

    historical_incomes = list(monthly_income.values()) if monthly_income else [sum(credits)]

    months_count = max(len(monthly_income), 1)
    avg_monthly_income = sum(credits) / months_count
    avg_monthly_expenses = sum(debits) / months_count
    avg_essential = sum(essentials) / months_count
    avg_discretionary = sum(discretionary) / months_count

    # Liquid savings proxy: total credits - total debits (floored at 0)
    liquid_savings = max(0.0, sum(credits) - sum(debits))

    return {
        "monthly_income": avg_monthly_income,
        "monthly_expenses": avg_monthly_expenses,
        "essential_expenses": avg_essential,
        "discretionary_expenses": avg_discretionary,
        "available_liquid_savings": liquid_savings,
        "historical_incomes": historical_incomes,
    }


@router.get("/score", response_model=FinancialHealthScoreResponse)
def get_financial_health_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Compute or retrieve the latest financial health score for the user."""
    agg = _aggregate_user_financials(current_user.id, db)
    if not agg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transaction data found. Please upload a bank statement first.",
        )

    result = compute_financial_health_score(**agg)

    # Persist to financial_reports
    report = FinancialReport(
        user_id=current_user.id,
        overall_score=result["overall_score"],
        savings_rate_score=result["savings_rate_score"],
        expense_to_income_score=result["expense_to_income_score"],
        essential_coverage_score=result["essential_coverage_score"],
        income_stability_score=result["income_stability_score"],
        monthly_income=Decimal(str(round(agg["monthly_income"], 2))),
        monthly_expenses=Decimal(str(round(agg["monthly_expenses"], 2))),
        monthly_savings=Decimal(str(round(result["metrics"]["monthly_savings"], 2))),
        savings_rate=result["metrics"]["savings_rate"],
        expense_to_income_ratio=result["metrics"]["expense_to_income_ratio"],
        essential_expense_ratio=result["metrics"]["essential_expense_ratio"],
        essential_expenses=Decimal(str(round(agg["essential_expenses"], 2))),
        discretionary_expenses=Decimal(str(round(agg["discretionary_expenses"], 2))),
        emergency_fund_months=result["metrics"]["emergency_fund_months"],
        status_badge=result["status_badge"],
        summary_explanation=result["summary_explanation"],
        component_explanations=result["component_explanations"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "overall_score": result["overall_score"],
        "savings_rate_score": result["savings_rate_score"],
        "expense_to_income_score": result["expense_to_income_score"],
        "essential_coverage_score": result["essential_coverage_score"],
        "income_stability_score": result["income_stability_score"],
        "metrics": {
            "monthly_income": Decimal(str(round(agg["monthly_income"], 2))),
            "monthly_expenses": Decimal(str(round(agg["monthly_expenses"], 2))),
            "monthly_savings": Decimal(str(round(result["metrics"]["monthly_savings"], 2))),
            "savings_rate": result["metrics"]["savings_rate"],
            "expense_to_income_ratio": result["metrics"]["expense_to_income_ratio"],
            "essential_expense_ratio": result["metrics"]["essential_expense_ratio"],
            "essential_expenses": Decimal(str(round(agg["essential_expenses"], 2))),
            "discretionary_expenses": Decimal(str(round(agg["discretionary_expenses"], 2))),
            "emergency_fund_months": result["metrics"]["emergency_fund_months"],
        },
        "status_badge": result["status_badge"],
        "summary_explanation": result["summary_explanation"],
        "component_explanations": result["component_explanations"],
        "calculated_at": report.calculated_at,
    }


@router.get("/history", response_model=List[FinancialHealthScoreResponse])
def get_score_history(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve historical financial health score records."""
    reports = (
        db.query(FinancialReport)
        .filter(FinancialReport.user_id == current_user.id)
        .order_by(FinancialReport.calculated_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in reports:
        result.append({
            "id": r.id,
            "overall_score": r.overall_score,
            "savings_rate_score": r.savings_rate_score,
            "expense_to_income_score": r.expense_to_income_score,
            "essential_coverage_score": r.essential_coverage_score,
            "income_stability_score": r.income_stability_score,
            "metrics": {
                "monthly_income": r.monthly_income,
                "monthly_expenses": r.monthly_expenses,
                "monthly_savings": r.monthly_savings,
                "savings_rate": r.savings_rate,
                "expense_to_income_ratio": r.expense_to_income_ratio,
                "essential_expense_ratio": r.essential_expense_ratio,
                "essential_expenses": r.essential_expenses,
                "discretionary_expenses": r.discretionary_expenses,
                "emergency_fund_months": r.emergency_fund_months,
            },
            "status_badge": r.status_badge,
            "summary_explanation": r.summary_explanation,
            "component_explanations": r.component_explanations or {},
            "calculated_at": r.calculated_at,
        })
    return result

