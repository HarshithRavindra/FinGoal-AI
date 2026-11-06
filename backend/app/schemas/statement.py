"""Pydantic schemas for bank statements."""

from datetime import date, datetime
from decimal import Decimal
from pydantic import ConfigDict, BaseModel


class BankStatementResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_type: str
    file_size_bytes: int
    status: str
    total_transactions: int
    total_debit: Decimal
    total_credit: Decimal
    start_date: date | None = None
    end_date: date | None = None
    error_message: str | None = None
    upload_date: datetime

    model_config = ConfigDict(from_attributes=True)


class StatementUploadResponse(BaseModel):
    statement: BankStatementResponse
    transactions_count: int
    message: str

