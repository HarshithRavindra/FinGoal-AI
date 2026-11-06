"""Pydantic Request and Response Schemas."""

from app.schemas.auth import (
    UserBase,
    UserCreate,
    UserResponse,
    Token,
    TokenData,
)
from app.schemas.statement import (
    BankStatementResponse,
    StatementUploadResponse,
)
from app.schemas.transaction import (
    TransactionBase,
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
)
from app.schemas.health_score import (
    HealthMetricsSchema,
    FinancialHealthScoreResponse,
)
from app.schemas.goal import (
    GoalBase,
    GoalCreate,
    GoalUpdate,
    GoalResponse,
)
from app.schemas.rescheduling import (
    UnexpectedExpenseInputSchema,
    MonthlyRoadmapItemSchema,
    AdaptiveRescheduleResponseSchema,
)
from app.schemas.prediction import (
    MonthlyCashFlowPointSchema,
    CashFlowPredictionResponseSchema,
)
from app.schemas.recommendation import (
    RecommendationSchema,
    RecommendationResponseSchema,
)

__all__ = [
    "UserBase",
    "UserCreate",
    "UserResponse",
    "Token",
    "TokenData",
    "BankStatementResponse",
    "StatementUploadResponse",
    "TransactionBase",
    "TransactionCreate",
    "TransactionUpdate",
    "TransactionResponse",
    "HealthMetricsSchema",
    "FinancialHealthScoreResponse",
    "GoalBase",
    "GoalCreate",
    "GoalUpdate",
    "GoalResponse",
    "UnexpectedExpenseInputSchema",
    "MonthlyRoadmapItemSchema",
    "AdaptiveRescheduleResponseSchema",
    "MonthlyCashFlowPointSchema",
    "CashFlowPredictionResponseSchema",
    "RecommendationSchema",
    "RecommendationResponseSchema",
]
