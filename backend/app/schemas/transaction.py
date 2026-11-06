"""Pydantic schemas for transactions."""

from datetime import date as date_type, datetime
from decimal import Decimal
from typing import Optional
from pydantic import ConfigDict, BaseModel, Field


class TransactionBase(BaseModel):
    date: date_type
    description: str = Field(..., max_length=500)
    raw_description: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    transaction_type: str = Field(..., pattern="^(debit|credit)$")
    category: str
    expense_type: str = Field(..., pattern="^(Essential|Discretionary|Review)$")
    confidence_score: float = 1.0
    balance: Optional[Decimal] = None
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    statement_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    expense_type: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    date: Optional[date_type] = None
    notes: Optional[str] = None


class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    statement_id: Optional[int] = None
    is_user_modified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

