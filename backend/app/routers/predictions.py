"""Cash Flow Predictions Router."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Transaction, User
from app.schemas.prediction import CashFlowPredictionResponseSchema
from app.algorithms.cash_flow_predictor import predict_cash_flows
from app.utils.security import get_current_user

router = APIRouter(prefix="/predictions", tags=["Cash Flow Predictions"])


@router.get("/cash-flow", response_model=CashFlowPredictionResponseSchema)
def get_cash_flow_predictions(
    months_ahead: int = 6,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate cash flow predictions for the next N months."""
    if months_ahead < 1 or months_ahead > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="months_ahead must be between 1 and 24.",
        )

    txns = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()

    if not txns:
        # Return empty projections
        result = predict_cash_flows(historical_data=[], projection_months=months_ahead)
        return result

    # Aggregate by month
    from collections import defaultdict
    monthly: dict = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "essential": 0.0, "discretionary": 0.0})
    for t in txns:
        key = f"{t.date.year}-{t.date.month:02d}"
        if t.transaction_type == "credit":
            monthly[key]["income"] += float(t.amount)
        else:
            monthly[key]["expenses"] += float(t.amount)
            if t.expense_type == "Essential":
                monthly[key]["essential"] += float(t.amount)
            elif t.expense_type == "Discretionary":
                monthly[key]["discretionary"] += float(t.amount)

    historical_data = []
    for month_key in sorted(monthly.keys()):
        yr, mo = month_key.split("-")
        from datetime import date
        from dateutil.relativedelta import relativedelta
        d = date(int(yr), int(mo), 1)
        entry = monthly[month_key]
        historical_data.append({
            "month": month_key,
            "month_label": d.strftime("%b %Y"),
            "income": entry["income"],
            "expenses": entry["expenses"],
            "essential": entry["essential"],
            "discretionary": entry["discretionary"],
        })

    result = predict_cash_flows(historical_data=historical_data, projection_months=months_ahead)
    return result
