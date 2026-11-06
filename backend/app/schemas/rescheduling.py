"""Pydantic schemas for the Adaptive Goal Rescheduling Engine."""

from datetime import date, datetime
from decimal import Decimal
from typing import List
from pydantic import BaseModel, Field


class UnexpectedExpenseInputSchema(BaseModel):
    goal_id: int
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=2, max_length=500)
    funding_source: str = Field(..., pattern="^(emergency_fund|current_income|goal_savings|other)$")
    expense_date: date | None = None


class MonthlyRoadmapItemSchema(BaseModel):
    month: str
    month_number: int
    target_savings: Decimal
    cumulative_savings: Decimal
    target_met: bool = False


class AdaptiveRescheduleResponseSchema(BaseModel):
    goal_id: int
    goal_name: str
    target_amount: Decimal
    unexpected_expense_amount: Decimal
    funding_source: str
    original_monthly_savings: Decimal
    revised_monthly_savings: Decimal
    original_deadline: date
    revised_deadline: date
    delay_months: int
    remaining_target_amount: Decimal
    feasibility_status: str
    rescheduling_reason: str
    discretionary_reduction_recommended: Decimal
    explanation: str
    roadmap: List[MonthlyRoadmapItemSchema]
    created_at: datetime

