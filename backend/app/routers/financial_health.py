"""Financial Health Score & Comprehensive Financial Health Analytics Router."""

from datetime import datetime, timezone, date
from typing import List, Optional, Dict, Any
from collections import defaultdict
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import FinancialReport, Transaction, User
from app.schemas.health_score import (
    FinancialHealthScoreResponse,
    DetailedFinancialSummaryResponse,
    ExpenseReductionSimulationRequest,
    ExpenseReductionSimulationResponse,
)
from app.algorithms.financial_health import compute_financial_health_score
from app.services.recommendation_engine import generate_rule_based_recommendations
from app.utils.security import get_current_user

router = APIRouter(prefix="/financial-health", tags=["Financial Health"])


# Standard suggested reduction percentages by discretionary category
DISCRETIONARY_RECOMMENDED_REDUCTION = {
    "Food and Dining": 30.0,
    "Shopping": 25.0,
    "Entertainment": 40.0,
    "Others": 20.0,
    "Transfers": 0.0,
}


def _aggregate_user_financials(user_id: int, db: Session):
    """Aggregate monthly income, expenses, and historical data from transactions."""
    txns = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    if not txns:
        return None

    # Exclude internal transfers from operational income/expenses
    operational_txns = [t for t in txns if t.category != "Transfers"]

    credits = [float(t.amount) for t in operational_txns if t.transaction_type == "credit"]
    debits = [float(t.amount) for t in operational_txns if t.transaction_type == "debit"]
    essentials = [float(t.amount) for t in operational_txns if t.transaction_type == "debit" and t.expense_type == "Essential"]
    discretionary = [float(t.amount) for t in operational_txns if t.transaction_type == "debit" and t.expense_type == "Discretionary"]

    # Group income by month
    monthly_income: Dict[tuple, float] = defaultdict(float)
    for t in operational_txns:
        if t.transaction_type == "credit":
            key = (t.date.year, t.date.month)
            monthly_income[key] += float(t.amount)

    historical_incomes = list(monthly_income.values()) if monthly_income else [sum(credits)]

    months_count = max(len(monthly_income), 1)
    avg_monthly_income = sum(credits) / months_count
    avg_monthly_expenses = sum(debits) / months_count
    avg_essential = sum(essentials) / months_count
    avg_discretionary = sum(discretionary) / months_count

    # Liquid savings proxy: total credits - total debits across ledger (floored at 0)
    all_credits = sum(float(t.amount) for t in txns if t.transaction_type == "credit")
    all_debits = sum(float(t.amount) for t in txns if t.transaction_type == "debit")
    liquid_savings = max(0.0, all_credits - all_debits)

    return {
        "monthly_income": avg_monthly_income,
        "monthly_expenses": avg_monthly_expenses,
        "essential_expenses": avg_essential,
        "discretionary_expenses": avg_discretionary,
        "available_liquid_savings": liquid_savings,
        "historical_incomes": historical_incomes,
        "months_count": months_count,
        "all_credits": all_credits,
        "all_debits": all_debits,
    }


def _build_health_report_record(current_user: User, db: Session, agg: Dict[str, Any]) -> FinancialReport:
    """Helper to compute and persist FinancialReport."""
    result = compute_financial_health_score(
        monthly_income=agg["monthly_income"],
        monthly_expenses=agg["monthly_expenses"],
        essential_expenses=agg["essential_expenses"],
        discretionary_expenses=agg["discretionary_expenses"],
        available_liquid_savings=agg["available_liquid_savings"],
        historical_incomes=agg["historical_incomes"],
    )

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
    return report


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

    report = _build_health_report_record(current_user, db, agg)

    return {
        "id": report.id,
        "overall_score": report.overall_score,
        "savings_rate_score": report.savings_rate_score,
        "expense_to_income_score": report.expense_to_income_score,
        "essential_coverage_score": report.essential_coverage_score,
        "income_stability_score": report.income_stability_score,
        "metrics": {
            "monthly_income": report.monthly_income,
            "monthly_expenses": report.monthly_expenses,
            "monthly_savings": report.monthly_savings,
            "savings_rate": report.savings_rate,
            "expense_to_income_ratio": report.expense_to_income_ratio,
            "essential_expense_ratio": report.essential_expense_ratio,
            "essential_expenses": report.essential_expenses,
            "discretionary_expenses": report.discretionary_expenses,
            "emergency_fund_months": report.emergency_fund_months,
        },
        "status_badge": report.status_badge,
        "summary_explanation": report.summary_explanation,
        "component_explanations": report.component_explanations or {},
        "calculated_at": report.calculated_at,
    }


@router.post("/recalculate", response_model=FinancialHealthScoreResponse)
def recalculate_financial_health_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger on-demand recalculation of financial health score based on newest data."""
    return get_financial_health_score(current_user=current_user, db=db)


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


@router.get("/detailed-summary", response_model=DetailedFinancialSummaryResponse)
def get_detailed_financial_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Comprehensive financial diagnostic report containing:
    - 10-point overview metrics (actual vs optimized)
    - Essential vs Discretionary classification breakdown
    - Month-wise spending trends
    - In-depth discretionary analysis with suggested cuts
    - Transparent Score diagnostic drivers
    - Actionable personalized recommendations
    """
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    if not txns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transaction data found. Please upload a bank statement first.",
        )

    # Filter operational transactions (excluding transfers)
    op_txns = [t for t in txns if t.category != "Transfers"]

    # Month-by-month groupings
    monthly_data: Dict[str, Dict[str, float]] = defaultdict(lambda: {
        "income": 0.0, "total_expenses": 0.0, "essential": 0.0, "discretionary": 0.0, "review": 0.0
    })

    category_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "total": 0.0, "count": 0, "type": "Review", "transactions": []
    })

    all_credits = 0.0
    all_debits = 0.0

    for t in txns:
        amount = float(t.amount)
        if t.transaction_type == "credit":
            all_credits += amount
        else:
            all_debits += amount

    for t in op_txns:
        amount = float(t.amount)
        month_key = t.date.strftime("%b %Y")
        sort_key = t.date.strftime("%Y-%m")

        if t.transaction_type == "credit":
            monthly_data[sort_key]["income"] += amount
        else:
            monthly_data[sort_key]["total_expenses"] += amount
            if t.expense_type == "Essential":
                monthly_data[sort_key]["essential"] += amount
            elif t.expense_type == "Discretionary":
                monthly_data[sort_key]["discretionary"] += amount
            else:
                monthly_data[sort_key]["review"] += amount

            # Category aggregation for expenses
            cat_entry = category_stats[t.category]
            cat_entry["total"] += amount
            cat_entry["count"] += 1
            cat_entry["type"] = t.expense_type
            cat_entry["transactions"].append(t)

    sorted_month_keys = sorted(monthly_data.keys())
    months_count = max(len(sorted_month_keys), 1)

    # Monthly averages
    total_income = sum(m["income"] for m in monthly_data.values())
    total_expenses = sum(m["total_expenses"] for m in monthly_data.values())
    total_essential = sum(m["essential"] for m in monthly_data.values())
    total_discretionary = sum(m["discretionary"] for m in monthly_data.values())
    total_review = sum(m["review"] for m in monthly_data.values())

    avg_income = total_income / months_count
    avg_expenses = total_expenses / months_count
    avg_essential = total_essential / months_count
    avg_discretionary = total_discretionary / months_count
    avg_review = total_review / months_count

    current_monthly_savings = max(0.0, avg_income - avg_expenses)
    actual_accumulated_savings = max(0.0, all_credits - all_debits)

    # Build category breakdown & discretionary savings potential
    category_breakdown_items = []
    potential_additional_savings = 0.0

    for cat_name, stats in sorted(category_stats.items(), key=lambda x: x[1]["total"], reverse=True):
        cat_monthly = stats["total"] / months_count
        pct_income = (cat_monthly / avg_income * 100.0) if avg_income > 0 else 0.0
        pct_expense = (cat_monthly / avg_expenses * 100.0) if avg_expenses > 0 else 0.0

        # Suggested reduction % applies strictly to Discretionary categories
        suggested_red = DISCRETIONARY_RECOMMENDED_REDUCTION.get(cat_name, 25.0) if stats["type"] == "Discretionary" else 0.0
        pot_sav = (cat_monthly * suggested_red / 100.0) if stats["type"] == "Discretionary" else 0.0
        potential_additional_savings += pot_sav

        category_breakdown_items.append({
            "category": cat_name,
            "total_amount": Decimal(str(round(cat_monthly, 2))),
            "transaction_count": stats["count"],
            "expense_type": stats["type"],
            "percentage_of_income": round(pct_income, 1),
            "percentage_of_total_expense": round(pct_expense, 1),
            "suggested_reduction_percentage": suggested_red,
            "potential_savings": Decimal(str(round(pot_sav, 2))),
        })

    optimized_monthly_savings = current_monthly_savings + potential_additional_savings
    current_savings_rate = (current_monthly_savings / avg_income * 100.0) if avg_income > 0 else 0.0
    optimized_savings_rate = (optimized_monthly_savings / avg_income * 100.0) if avg_income > 0 else 0.0
    potential_annual_savings = potential_additional_savings * 12.0
    emergency_months = (actual_accumulated_savings / avg_essential) if avg_essential > 0 else 0.0

    # Month-over-month comparison if >= 2 months exist
    prev_month_comp = None
    if len(sorted_month_keys) >= 2:
        curr_m = monthly_data[sorted_month_keys[-1]]
        prev_m = monthly_data[sorted_month_keys[-2]]
        curr_sav = curr_m["income"] - curr_m["total_expenses"]
        prev_sav = prev_m["income"] - prev_m["total_expenses"]

        inc_change_pct = ((curr_m["income"] - prev_m["income"]) / prev_m["income"] * 100.0) if prev_m["income"] > 0 else 0.0
        exp_change_pct = ((curr_m["total_expenses"] - prev_m["total_expenses"]) / prev_m["total_expenses"] * 100.0) if prev_m["total_expenses"] > 0 else 0.0

        prev_month_comp = {
            "current_month": sorted_month_keys[-1],
            "previous_month": sorted_month_keys[-2],
            "income_diff": round(curr_m["income"] - prev_m["income"], 2),
            "income_pct_change": round(inc_change_pct, 1),
            "expense_diff": round(curr_m["total_expenses"] - prev_m["total_expenses"], 2),
            "expense_pct_change": round(exp_change_pct, 1),
            "savings_diff": round(curr_sav - prev_sav, 2),
        }

    # Month-wise trend items
    monthly_trends = []
    for m_key in sorted_month_keys:
        m_val = monthly_data[m_key]
        m_sav = m_val["income"] - m_val["total_expenses"]
        m_rate = (m_sav / m_val["income"] * 100.0) if m_val["income"] > 0 else 0.0
        # Parse month label from sort key
        try:
            m_date = datetime.strptime(m_key, "%Y-%m")
            label = m_date.strftime("%b %Y")
        except Exception:
            label = m_key

        monthly_trends.append({
            "month_label": label,
            "income": Decimal(str(round(m_val["income"], 2))),
            "total_expenses": Decimal(str(round(m_val["total_expenses"], 2))),
            "essential_expenses": Decimal(str(round(m_val["essential"], 2))),
            "discretionary_expenses": Decimal(str(round(m_val["discretionary"], 2))),
            "savings": Decimal(str(round(m_sav, 2))),
            "savings_rate": round(m_rate, 1),
        })

    # Discretionary analysis
    discretionary_txns = [t for t in op_txns if t.expense_type == "Discretionary" and t.transaction_type == "debit"]
    discretionary_txns_sorted = sorted(discretionary_txns, key=lambda t: float(t.amount), reverse=True)

    top_discretionary_items = []
    for t in discretionary_txns_sorted[:10]:
        pct_inc = (float(t.amount) / avg_income * 100.0) if avg_income > 0 else 0.0
        top_discretionary_items.append({
            "id": t.id,
            "date": t.date,
            "description": t.description,
            "category": t.category,
            "amount": Decimal(str(round(float(t.amount), 2))),
            "percentage_of_income": round(pct_inc, 1),
            "expense_type": t.expense_type,
        })

    top_discretionary_cats = [c for c in category_breakdown_items if c["expense_type"] == "Discretionary"]
    highest_spending_cat = top_discretionary_cats[0]["category"] if top_discretionary_cats else "None"
    largest_txn = top_discretionary_items[0] if top_discretionary_items else None

    # Compute baseline and simulated health scores
    historical_incomes = [m["income"] for m in monthly_data.values() if m["income"] > 0] or [avg_income]
    fhs_baseline = compute_financial_health_score(
        monthly_income=avg_income,
        monthly_expenses=avg_expenses,
        essential_expenses=avg_essential,
        discretionary_expenses=avg_discretionary,
        available_liquid_savings=actual_accumulated_savings,
        historical_incomes=historical_incomes,
    )

    fhs_simulated = compute_financial_health_score(
        monthly_income=avg_income,
        monthly_expenses=max(avg_essential, avg_expenses - potential_additional_savings),
        essential_expenses=avg_essential,
        discretionary_expenses=max(0.0, avg_discretionary - potential_additional_savings),
        available_liquid_savings=actual_accumulated_savings + potential_additional_savings,
        historical_incomes=historical_incomes,
    )

    # Positive and dragging drivers
    positive_drivers = []
    dragging_drivers = []

    if current_savings_rate >= 25.0:
        positive_drivers.append(f"Strong savings discipline: {current_savings_rate:.1f}% monthly savings rate exceeds baseline.")
    else:
        dragging_drivers.append(f"Sub-optimal savings rate of {current_savings_rate:.1f}%. Increasing to 25%+ will accelerate goal timelines.")

    if avg_income > 0 and (avg_essential / avg_income) <= 0.50:
        positive_drivers.append(f"Lean fixed living obligations: Essential commitments consume only {(avg_essential/avg_income*100):.1f}% of income.")
    elif avg_income > 0:
        dragging_drivers.append(f"High fixed expense burden: Essential expenses absorb {(avg_essential/avg_income*100):.1f}% of income.")

    if emergency_months >= 3.0:
        positive_drivers.append(f"Resilient emergency safety buffer covering {emergency_months:.1f} months of essential needs.")
    else:
        dragging_drivers.append(f"Liquid emergency reserves cover only {emergency_months:.1f} months of living costs (target: 3.0+ months).")

    if avg_income > 0 and (avg_discretionary / avg_income) >= 0.25:
        dragging_drivers.append(f"Discretionary lifestyle spending consumes {(avg_discretionary/avg_income*100):.1f}% (₹{avg_discretionary:,.0f}/mo) of total inflows.")

    # Pillar action items
    pillar_recs = {
        "savings_rate": "Automate an auto-mandate on salary day to save before discretionary spending occurs.",
        "expense_to_income": "Cap discretionary shopping & food delivery at a pre-set monthly limit.",
        "essential_coverage": "Index liquid reserves to cover at least 3 months of essential fixed costs.",
        "income_stability": "Maintain secondary revenue streams and monitor income consistency across statement cycles.",
    }

    # Generate grounded recommendations
    recs_raw = generate_rule_based_recommendations(
        monthly_income=avg_income,
        monthly_expenses=avg_expenses,
        essential_expenses=avg_essential,
        discretionary_expenses=avg_discretionary,
        savings_rate=current_savings_rate / 100.0,
        emergency_months=emergency_months,
        goals=[],
    )

    return {
        "overview": {
            "monthly_income": Decimal(str(round(avg_income, 2))),
            "monthly_expenses": Decimal(str(round(avg_expenses, 2))),
            "essential_expenses": Decimal(str(round(avg_essential, 2))),
            "discretionary_expenses": Decimal(str(round(avg_discretionary, 2))),
            "review_expenses": Decimal(str(round(avg_review, 2))),
            "current_monthly_savings": Decimal(str(round(current_monthly_savings, 2))),
            "actual_accumulated_savings": Decimal(str(round(actual_accumulated_savings, 2))),
            "potential_additional_savings": Decimal(str(round(potential_additional_savings, 2))),
            "optimized_monthly_savings": Decimal(str(round(optimized_monthly_savings, 2))),
            "current_savings_rate": round(current_savings_rate, 1),
            "optimized_savings_rate": round(optimized_savings_rate, 1),
            "potential_annual_savings": Decimal(str(round(potential_annual_savings, 2))),
            "emergency_fund_months": round(emergency_months, 1),
            "previous_month_comparison": prev_month_comp,
        },
        "classification": {
            "essential_total": Decimal(str(round(avg_essential, 2))),
            "essential_percentage": round((avg_essential / avg_expenses * 100.0) if avg_expenses > 0 else 0.0, 1),
            "discretionary_total": Decimal(str(round(avg_discretionary, 2))),
            "discretionary_percentage": round((avg_discretionary / avg_expenses * 100.0) if avg_expenses > 0 else 0.0, 1),
            "review_total": Decimal(str(round(avg_review, 2))),
            "review_percentage": round((avg_review / avg_expenses * 100.0) if avg_expenses > 0 else 0.0, 1),
        },
        "category_breakdown": category_breakdown_items,
        "monthly_trends": monthly_trends,
        "discretionary_analysis": {
            "total_discretionary_amount": Decimal(str(round(avg_discretionary, 2))),
            "discretionary_transaction_count": len(discretionary_txns),
            "discretionary_percentage_of_income": round((avg_discretionary / avg_income * 100.0) if avg_income > 0 else 0.0, 1),
            "discretionary_percentage_of_expenses": round((avg_discretionary / avg_expenses * 100.0) if avg_expenses > 0 else 0.0, 1),
            "highest_spending_category": highest_spending_cat,
            "largest_transaction": largest_txn,
            "top_categories": top_discretionary_cats[:5],
            "top_transactions": top_discretionary_items,
            "suggested_reductions": [
                {
                    "category": c["category"],
                    "monthly_spending": c["total_amount"],
                    "suggested_reduction_percentage": c["suggested_reduction_percentage"],
                    "potential_savings": c["potential_savings"],
                }
                for c in top_discretionary_cats
            ],
        },
        "score_diagnostics": {
            "overall_score": fhs_baseline["overall_score"],
            "status_badge": fhs_baseline["status_badge"],
            "summary_explanation": fhs_baseline["summary_explanation"],
            "positive_drivers": positive_drivers,
            "dragging_drivers": dragging_drivers,
            "pillar_recommendations": pillar_recs,
            "simulated_optimized_score": fhs_simulated["overall_score"],
        },
        "recommendations": recs_raw,
        "calculated_at": datetime.now(timezone.utc),
    }


@router.post("/simulate-calculator", response_model=ExpenseReductionSimulationResponse)
def simulate_expense_reduction(
    payload: ExpenseReductionSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Simulate interactive discretionary reduction calculator:
    - Essential living costs (Rent, Groceries, Healthcare, Utilities) are 100% safeguarded.
    - User tunes percentage sliders on discretionary categories.
    - Yields dynamic comparison of Current vs Optimized financial condition.
    """
    agg = _aggregate_user_financials(current_user.id, db)
    if not agg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No transaction data found.")

    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    op_txns = [t for t in txns if t.category != "Transfers" and t.transaction_type == "debit"]

    months_count = agg["months_count"]
    avg_income = agg["monthly_income"]
    avg_expenses = agg["monthly_expenses"]
    current_savings = max(0.0, avg_income - avg_expenses)
    current_savings_rate = (current_savings / avg_income * 100.0) if avg_income > 0 else 0.0

    # Aggregate monthly spending per discretionary category
    discretionary_cats: Dict[str, float] = defaultdict(float)
    for t in op_txns:
        if t.expense_type == "Discretionary":
            discretionary_cats[t.category] += float(t.amount)

    category_impacts = []
    total_additional_monthly_savings = 0.0

    for cat, total in discretionary_cats.items():
        monthly_spent = total / months_count
        # Lookup user-requested reduction percentage (clamped 0 to 100)
        reduction_pct = max(0.0, min(100.0, float(payload.category_reductions.get(cat, 0.0))))
        amount_saved = monthly_spent * (reduction_pct / 100.0)
        total_additional_monthly_savings += amount_saved
        new_spending = monthly_spent - amount_saved

        category_impacts.append({
            "category": cat,
            "original_monthly_spending": round(monthly_spent, 2),
            "reduction_percentage": reduction_pct,
            "monthly_amount_saved": round(amount_saved, 2),
            "optimized_monthly_spending": round(new_spending, 2),
        })

    optimized_expenses = max(agg["essential_expenses"], avg_expenses - total_additional_monthly_savings)
    optimized_savings = current_savings + total_additional_monthly_savings
    optimized_savings_rate = (optimized_savings / avg_income * 100.0) if avg_income > 0 else 0.0

    return {
        "current": {
            "monthly_income": Decimal(str(round(avg_income, 2))),
            "monthly_expenses": Decimal(str(round(avg_expenses, 2))),
            "monthly_savings": Decimal(str(round(current_savings, 2))),
            "savings_rate": round(current_savings_rate, 1),
        },
        "optimized": {
            "optimized_monthly_expenses": Decimal(str(round(optimized_expenses, 2))),
            "optimized_monthly_savings": Decimal(str(round(optimized_savings, 2))),
            "optimized_savings_rate": round(optimized_savings_rate, 1),
        },
        "category_impacts": category_impacts,
        "additional_monthly_savings": Decimal(str(round(total_additional_monthly_savings, 2))),
        "additional_annual_savings": Decimal(str(round(total_additional_monthly_savings * 12.0, 2))),
        "calculated_at": datetime.now(timezone.utc),
    }
