"""Pydantic schemas for savings goals."""

from datetime import date, datetime
from decimal import Decimal
from pydantic import ConfigDict, BaseModel, Field


class GoalBase(BaseModel):
    name: str = Field(..., max_length=255)
    target_amount: Decimal = Field(..., gt=0)
    current_savings: Decimal = Field(default=0, ge=0)
    target_date: date
    category: str = "General"
    priority: str = "medium"


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    name: str | None = None
    target_amount: Decimal | None = None
    current_savings: Decimal | None = None
    target_date: date | None = None
    category: str | None = None
    priority: str | None = None
    status: str | None = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    status: str
    remaining_months: int
    required_monthly_savings: Decimal
    available_capacity: Decimal
    feasibility_status: str
    feasibility_message: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

