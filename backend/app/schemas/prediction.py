"""Pydantic schemas for cash flow prediction."""

from decimal import Decimal
from typing import List
from pydantic import BaseModel


class MonthlyCashFlowPointSchema(BaseModel):
    month: str
    is_historical: bool
    income: Decimal
    expenses: Decimal
    net_savings: Decimal
    essential_expenses: Decimal | None = None
    discretionary_expenses: Decimal | None = None
    confidence_lower: Decimal | None = None
    confidence_upper: Decimal | None = None


class CashFlowSummarySchema(BaseModel):
    avg_predicted_income: Decimal
    avg_predicted_expenses: Decimal
    avg_predicted_savings: Decimal
    projected_savings_6m: Decimal
    savings_trend: str


class CashFlowPredictionResponseSchema(BaseModel):
    model_used: str
    historical_months_count: int
    projection_months_count: int
    monthly_series: List[MonthlyCashFlowPointSchema]
    summary: CashFlowSummarySchema
    disclaimer: str

