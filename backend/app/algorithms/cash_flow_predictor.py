"""Cash Flow Prediction Engine utilizing Moving Averages and Scikit-Learn Linear Regression."""

from datetime import date
from dateutil.relativedelta import relativedelta
from typing import Dict, List, Any
import numpy as np
from sklearn.linear_model import LinearRegression


def predict_cash_flows(
    historical_data: List[Dict[str, Any]],
    projection_months: int = 6,
) -> Dict[str, Any]:
    """
    Generate projected cash flow series using Moving Average baseline and Linear Regression.
    
    historical_data is expected as a list of dicts:
    [{'month': '2026-05', 'income': 85000.0, 'expenses': 48000.0, 'essential': 32000.0, 'discretionary': 16000.0}, ...]
    """
    disclaimer = (
        "Projections are statistical estimates calculated via linear regression and moving average baselines. "
        "Actual future cash flows will vary with real-world income changes and unpredicted expenses."
    )

    if not historical_data:
        # Default baseline if no statement data exists yet
        today = date.today()
        series = []
        for i in range(1, projection_months + 1):
            fut_date = today + relativedelta(months=i)
            series.append({
                "month": fut_date.strftime("%b %Y"),
                "is_historical": False,
                "income": 0.0,
                "expenses": 0.0,
                "net_savings": 0.0,
                "essential_expenses": 0.0,
                "discretionary_expenses": 0.0,
                "confidence_lower": 0.0,
                "confidence_upper": 0.0,
            })
        return {
            "model_used": "Baseline Fallback (Zero Data)",
            "historical_months_count": 0,
            "projection_months_count": projection_months,
            "monthly_series": series,
            "summary": {
                "avg_predicted_income": 0.0,
                "avg_predicted_expenses": 0.0,
                "avg_predicted_savings": 0.0,
                "projected_savings_6m": 0.0,
                "savings_trend": "stable",
            },
            "disclaimer": disclaimer,
        }

    # Extract historical arrays
    incomes = [float(d.get("income", 0.0)) for d in historical_data]
    expenses = [float(d.get("expenses", 0.0)) for d in historical_data]
    n_hist = len(historical_data)

    series = []
    # 1. Append historical series points
    for item in historical_data:
        inc = float(item.get("income", 0.0))
        exp = float(item.get("expenses", 0.0))
        series.append({
            "month": item.get("month_label", item.get("month", "")),
            "is_historical": True,
            "income": round(inc, 2),
            "expenses": round(exp, 2),
            "net_savings": round(inc - exp, 2),
            "essential_expenses": round(float(item.get("essential", 0.0)), 2),
            "discretionary_expenses": round(float(item.get("discretionary", 0.0)), 2),
            "confidence_lower": round(inc - exp, 2),
            "confidence_upper": round(inc - exp, 2),
        })

    # 2. Select model based on historical data depth
    X = np.arange(n_hist).reshape(-1, 1)

    if n_hist >= 3:
        # Train Linear Regression models
        model_name = "Linear Regression + Moving Average Weighted Ensemble"
        reg_inc = LinearRegression().fit(X, incomes)
        reg_exp = LinearRegression().fit(X, expenses)

        # Baseline moving average window (last 3 months)
        ma_inc = float(np.mean(incomes[-3:]))
        ma_exp = float(np.mean(expenses[-3:]))

        pred_incomes = []
        pred_expenses = []

        for m_idx in range(n_hist, n_hist + projection_months):
            # 60% Linear Regression trend + 40% Recent Moving Average
            p_inc = (0.60 * float(reg_inc.predict([[m_idx]])[0])) + (0.40 * ma_inc)
            p_exp = (0.60 * float(reg_exp.predict([[m_idx]])[0])) + (0.40 * ma_exp)
            p_inc = max(0.0, p_inc)
            p_exp = max(0.0, p_exp)
            pred_incomes.append(p_inc)
            pred_expenses.append(p_exp)

    else:
        # Insufficient data for regression slope: Use simple Moving Average baseline
        model_name = "Moving Average Baseline"
        mean_inc = float(np.mean(incomes))
        mean_exp = float(np.mean(expenses))
        pred_incomes = [max(0.0, mean_inc)] * projection_months
        pred_expenses = [max(0.0, mean_exp)] * projection_months

    # 3. Build future monthly projections
    last_item = historical_data[-1]
    last_month_str = last_item.get("month", "2026-10")
    try:
        parts = last_month_str.split("-")
        last_date = date(int(parts[0]), int(parts[1]), 1)
    except Exception:
        last_date = date.today()

    for i in range(1, projection_months + 1):
        target_date = last_date + relativedelta(months=i)
        p_inc = pred_incomes[i - 1]
        p_exp = pred_expenses[i - 1]
        p_savings = p_inc - p_exp

        # Statistical confidence bounds (± 10% standard error)
        margin = max(1000.0, p_exp * 0.10)
        series.append({
            "month": target_date.strftime("%b %Y"),
            "is_historical": False,
            "income": round(p_inc, 2),
            "expenses": round(p_exp, 2),
            "net_savings": round(p_savings, 2),
            "essential_expenses": round(p_exp * 0.65, 2),
            "discretionary_expenses": round(p_exp * 0.35, 2),
            "confidence_lower": round(p_savings - margin, 2),
            "confidence_upper": round(p_savings + margin, 2),
        })

    avg_inc = float(np.mean(pred_incomes))
    avg_exp = float(np.mean(pred_expenses))
    avg_sav = avg_inc - avg_exp
    total_6m = avg_sav * projection_months

    if len(pred_incomes) > 1 and pred_incomes[-1] - pred_expenses[-1] > (pred_incomes[0] - pred_expenses[0]):
        trend = "increasing"
    elif len(pred_incomes) > 1 and pred_incomes[-1] - pred_expenses[-1] < (pred_incomes[0] - pred_expenses[0]):
        trend = "decreasing"
    else:
        trend = "stable"

    return {
        "model_used": model_name,
        "historical_months_count": n_hist,
        "projection_months_count": projection_months,
        "monthly_series": series,
        "summary": {
            "avg_predicted_income": round(avg_inc, 2),
            "avg_predicted_expenses": round(avg_exp, 2),
            "avg_predicted_savings": round(avg_sav, 2),
            "projected_savings_6m": round(total_6m, 2),
            "savings_trend": trend,
        },
        "disclaimer": disclaimer,
    }

