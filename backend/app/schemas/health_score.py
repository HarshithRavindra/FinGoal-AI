"""Pydantic schemas for Financial Health Score (FHS) & In-Depth Analytics."""

from datetime import date as date_type, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import ConfigDict, BaseModel, Field


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
    id: Optional[int] = None
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


class CategoryExpenseItem(BaseModel):
    category: str
    total_amount: Decimal
    transaction_count: int
    expense_type: str  # Essential, Discretionary, Review
    percentage_of_income: float
    percentage_of_total_expense: float
    suggested_reduction_percentage: float = 0.0
    potential_savings: Decimal = Decimal("0.0")


class MonthlyTrendItem(BaseModel):
    month_label: str
    income: Decimal
    total_expenses: Decimal
    essential_expenses: Decimal
    discretionary_expenses: Decimal
    savings: Decimal
    savings_rate: float


class TopDiscretionaryTransaction(BaseModel):
    id: int
    date: date_type
    description: str
    category: str
    amount: Decimal
    percentage_of_income: float
    expense_type: str


class DetailedFinancialOverview(BaseModel):
    monthly_income: Decimal
    monthly_expenses: Decimal
    essential_expenses: Decimal
    discretionary_expenses: Decimal
    review_expenses: Decimal
    current_monthly_savings: Decimal
    actual_accumulated_savings: Decimal
    potential_additional_savings: Decimal
    optimized_monthly_savings: Decimal
    current_savings_rate: float
    optimized_savings_rate: float
    potential_annual_savings: Decimal
    emergency_fund_months: float
    previous_month_comparison: Optional[Dict[str, Any]] = None


class DiscretionaryAnalysisSection(BaseModel):
    total_discretionary_amount: Decimal
    discretionary_transaction_count: int
    discretionary_percentage_of_income: float
    discretionary_percentage_of_expenses: float
    highest_spending_category: str
    largest_transaction: Optional[TopDiscretionaryTransaction] = None
    top_categories: List[CategoryExpenseItem]
    top_transactions: List[TopDiscretionaryTransaction]
    suggested_reductions: List[Dict[str, Any]]


class ScoreDiagnostics(BaseModel):
    overall_score: float
    status_badge: str
    summary_explanation: str
    positive_drivers: List[str]
    dragging_drivers: List[str]
    pillar_recommendations: Dict[str, str]
    simulated_optimized_score: float


class DetailedFinancialSummaryResponse(BaseModel):
    overview: DetailedFinancialOverview
    classification: Dict[str, Any]
    category_breakdown: List[CategoryExpenseItem]
    monthly_trends: List[MonthlyTrendItem]
    discretionary_analysis: DiscretionaryAnalysisSection
    score_diagnostics: ScoreDiagnostics
    recommendations: List[Dict[str, Any]]
    calculated_at: datetime


class ExpenseReductionSimulationRequest(BaseModel):
    category_reductions: Dict[str, float]  # e.g. {"Food and Dining": 30.0, "Shopping": 20.0}


class ExpenseReductionSimulationResponse(BaseModel):
    current: Dict[str, Any]
    optimized: Dict[str, Any]
    category_impacts: List[Dict[str, Any]]
    additional_monthly_savings: Decimal
    additional_annual_savings: Decimal
    calculated_at: datetime
