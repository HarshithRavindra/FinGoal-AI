"""Pydantic schemas for savings goals, scenarios, and smart allocation."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import ConfigDict, BaseModel, Field


class GoalBase(BaseModel):
    name: str = Field(..., max_length=255)
    target_amount: Decimal = Field(..., gt=0)
    current_savings: Decimal = Field(default=0, ge=0)
    target_date: date
    category: str = "General"
    priority: str = "medium"


class GoalCreate(GoalBase):
    description: Optional[str] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_savings: Optional[Decimal] = None
    target_date: Optional[date] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class GoalPlanScenario(BaseModel):
    monthly_contribution: Decimal
    remaining_amount: Decimal
    remaining_months: int
    estimated_completion_date: date
    feasibility_status: str
    completion_percentage: float
    time_saved_months: Optional[int] = None
    monthly_difference: Optional[Decimal] = None
    notes: Optional[str] = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    status: str
    remaining_months: int
    required_monthly_savings: Decimal
    available_capacity: Decimal
    feasibility_status: str
    feasibility_message: str
    completion_percentage: Optional[float] = 0.0
    estimated_completion_date: Optional[date] = None
    current_plan: Optional[Dict[str, Any]] = None
    optimized_plan: Optional[Dict[str, Any]] = None
    feasibility_details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GoalsOverviewResponse(BaseModel):
    total_active_goals: int
    total_target_amount: Decimal
    total_actual_savings_allocated: Decimal
    remaining_goal_amount: Decimal
    monthly_savings_capacity: Decimal
    actual_accumulated_savings: Decimal
    unallocated_accumulated_savings: Decimal
    potential_maximum_monthly_savings: Decimal
    overall_achievement_percentage: float
    earliest_target_date: Optional[date] = None
    latest_target_date: Optional[date] = None


class AllocationPreviewItem(BaseModel):
    goal_id: int
    goal_name: str
    category: str
    priority: str
    target_amount: Decimal
    current_savings: Decimal
    remaining_amount: Decimal
    recommended_allocation: Decimal
    new_savings_total: Decimal
    new_completion_percentage: float
    priority_weight_percentage: float
    reason: str


class AllocationPreviewResponse(BaseModel):
    actual_accumulated_savings: Decimal
    total_allocated_previously: Decimal
    unallocated_savings_available: Decimal
    total_recommended_allocation: Decimal
    is_balance_available: bool
    status_note: str
    allocations: List[AllocationPreviewItem]


class SingleAllocationItem(BaseModel):
    goal_id: int
    amount: Decimal = Field(..., gt=0)
    notes: Optional[str] = None


class AllocateSavingsRequest(BaseModel):
    allocations: List[SingleAllocationItem]
    source: str = "accumulated_savings"


class AllocationRecordResponse(BaseModel):
    id: int
    goal_id: int
    goal_name: str
    amount: Decimal
    allocation_date: date
    source: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
