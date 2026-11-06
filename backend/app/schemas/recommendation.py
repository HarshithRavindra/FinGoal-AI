"""Pydantic schemas for financial recommendations."""

from datetime import datetime
from decimal import Decimal
from typing import List
from pydantic import ConfigDict, BaseModel


class RecommendationSchema(BaseModel):
    id: str
    category: str
    title: str
    description: str
    impact_level: str
    suggested_action: str
    potential_monthly_savings: Decimal
    source: str
    is_dismissed: bool = False

    model_config = ConfigDict(from_attributes=True)


class RecommendationResponseSchema(BaseModel):
    recommendations: List[RecommendationSchema]
    generated_at: datetime
    source: str

