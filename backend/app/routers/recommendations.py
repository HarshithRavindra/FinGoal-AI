"""Financial Recommendations Router."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Recommendation, Transaction, FinancialReport, User
from app.schemas.recommendation import RecommendationResponseSchema, RecommendationSchema
from app.services.recommendation_engine import generate_rule_based_recommendations
from app.utils.security import get_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/", response_model=RecommendationResponseSchema)
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate and return personalized financial recommendations."""
    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    if not txns:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No transaction data found. Upload a bank statement first.",
        )

    # Aggregate financial data
    from collections import defaultdict
    monthly_income_map: dict = defaultdict(float)
    credits = sum(float(t.amount) for t in txns if t.transaction_type == "credit")
    debits = sum(float(t.amount) for t in txns if t.transaction_type == "debit")
    essentials = sum(float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Essential")
    discretionary = sum(float(t.amount) for t in txns if t.transaction_type == "debit" and t.expense_type == "Discretionary")
    for t in txns:
        if t.transaction_type == "credit":
            monthly_income_map[(t.date.year, t.date.month)] += float(t.amount)

    months_count = max(len(monthly_income_map), 1)
    avg_income = credits / months_count
    avg_expenses = debits / months_count
    avg_essential = essentials / months_count
    avg_discretionary = discretionary / months_count
    liquid_savings = max(0.0, credits - debits)

    savings_rate = (avg_income - avg_expenses) / avg_income if avg_income > 0 else 0.0
    emergency_months = liquid_savings / avg_essential if avg_essential > 0 else 0.0

    recs = generate_rule_based_recommendations(
        monthly_income=avg_income,
        monthly_expenses=avg_expenses,
        essential_expenses=avg_essential,
        discretionary_expenses=avg_discretionary,
        savings_rate=savings_rate,
        emergency_months=emergency_months,
        goals=[],
    )

    # Persist recommendations
    saved_recs = []
    for rec in recs:
        db_rec = Recommendation(
            user_id=current_user.id,
            category=rec["category"],
            title=rec["title"],
            description=rec["description"],
            impact_level=rec.get("impact_level", "medium"),
            suggested_action=rec["suggested_action"],
            potential_monthly_savings=rec.get("potential_monthly_savings", 0.0),
            source=rec.get("source", "rule_engine"),
        )
        db.add(db_rec)
        saved_recs.append(db_rec)

    db.commit()
    for r in saved_recs:
        db.refresh(r)

    return {
        "recommendations": [
            {
                "id": str(r.id),
                "category": r.category,
                "title": r.title,
                "description": r.description,
                "impact_level": r.impact_level,
                "suggested_action": r.suggested_action,
                "potential_monthly_savings": r.potential_monthly_savings,
                "source": r.source,
                "is_dismissed": r.is_dismissed,
            }
            for r in saved_recs
        ],
        "generated_at": datetime.now(timezone.utc),
        "source": "rule_engine",
    }


@router.patch("/{recommendation_id}/dismiss")
def dismiss_recommendation(
    recommendation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismiss a recommendation."""
    rec = (
        db.query(Recommendation)
        .filter(Recommendation.id == recommendation_id, Recommendation.user_id == current_user.id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation not found.")
    rec.is_dismissed = True
    db.commit()
    return {"message": "Recommendation dismissed."}
