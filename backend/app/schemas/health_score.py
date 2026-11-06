"""Pydantic schemas for Financial Health Score (FHS)."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict
from pydantic import ConfigDict, BaseModel


class HealthMetricsSchema(BaseModel):
    monthly_income: Decimal
    monthly_expenses: Decimal
    monthly_savings: Decimal
    savings_rate: float
    expense_to_income_ratio: float
    essential_expense_ratio: float
    essential_expenses: Decimal
    discretionary_expenses: Decimal
    emergency_fund_months: float


class ComponentExplanationsSchema(BaseModel):
    savings_rate: str
    expense_to_income: str
    essential_coverage: str
    income_stability: str


class FinancialHealthScoreResponse(BaseModel):
    id: int | None = None
    overall_score: float
    savings_rate_score: float
    expense_to_income_score: float
    essential_coverage_score: float
    income_stability_score: float
    metrics: HealthMetricsSchema
    status_badge: str
    summary_explanation: str
    component_explanations: ComponentExplanationsSchema | Dict[str, Any]
    calculated_at: datetime

    model_config = ConfigDict(from_attributes=True)

