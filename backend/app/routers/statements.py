"""Bank Statement Management and Processing Router."""

from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import BankStatement, Transaction, User
from app.schemas.statement import BankStatementResponse, StatementUploadResponse
from app.services.statement_parser import calculate_file_hash, parse_csv_statement, parse_pdf_statement
from app.utils.security import get_current_user

router = APIRouter(prefix="/statements", tags=["Bank Statements"])


@router.post("/upload", response_model=StatementUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_statement(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and parse bank statement (PDF or CSV).
    Extracts, categorizes, and classifies all transactions with duplicate detection.
    """
    filename = file.filename or "statement"
    ext = filename.split(".")[-1].lower()

    if ext not in ["pdf", "csv"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported statement format. Please upload a PDF or CSV document.",
        )

    content = await file.read()
    file_size = len(content)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    if file_size > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Statement file size exceeds 15MB limit.",
        )

    file_hash = calculate_file_hash(content)

    # Prevent duplicate statement ingestion
    existing_statement = (
        db.query(BankStatement)
        .filter(BankStatement.user_id == current_user.id, BankStatement.file_hash == file_hash)
        .first()
    )
    if existing_statement:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exact statement file has already been uploaded and processed.",
        )

    # Parse transactions based on format
    try:
        if ext == "csv":
            raw_txns = parse_csv_statement(content)
        else:
            raw_txns = parse_pdf_statement(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Statement extraction failed: {str(e)}",
        )

    if not raw_txns:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not extract any valid financial transactions from the uploaded file.",
        )

    total_debit = sum(t["amount"] for t in raw_txns if t["transaction_type"] == "debit")
    total_credit = sum(t["amount"] for t in raw_txns if t["transaction_type"] == "credit")
    dates = [t["date"] for t in raw_txns]
    start_date = min(dates) if dates else None
    end_date = max(dates) if dates else None

    # Persist BankStatement record
    statement = BankStatement(
        user_id=current_user.id,
        filename=filename,
        file_type=ext,
        file_hash=file_hash,
        file_size_bytes=file_size,
        status="processed",
        total_transactions=len(raw_txns),
        total_debit=Decimal(str(round(total_debit, 2))),
        total_credit=Decimal(str(round(total_credit, 2))),
        start_date=start_date,
        end_date=end_date,
    )
    db.add(statement)
    db.flush()  # get statement.id

    # Persist Transaction records
    for t_data in raw_txns:
        txn = Transaction(
            user_id=current_user.id,
            statement_id=statement.id,
            date=t_data["date"],
            description=t_data["description"],
            raw_description=t_data.get("raw_description"),
            amount=t_data["amount"],
            transaction_type=t_data["transaction_type"],
            category=t_data["category"],
            expense_type=t_data["expense_type"],
            confidence_score=t_data["confidence_score"],
            balance=t_data.get("balance"),
        )
        db.add(txn)

    db.commit()
    db.refresh(statement)

    return {
        "statement": statement,
        "transactions_count": len(raw_txns),
        "message": f"Successfully extracted and categorized {len(raw_txns)} transactions.",
    }


@router.get("/", response_model=List[BankStatementResponse])
def get_user_statements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all ingested statement records for the authenticated user."""
    return (
        db.query(BankStatement)
        .filter(BankStatement.user_id == current_user.id)
        .order_by(BankStatement.upload_date.desc())
        .all()
    )


@router.delete("/{statement_id}")
def delete_statement(
    statement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a bank statement and its associated transactions."""
    statement = (
        db.query(BankStatement)
        .filter(BankStatement.id == statement_id, BankStatement.user_id == current_user.id)
        .first()
    )
    if not statement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Statement not found.",
        )
    db.delete(statement)
    db.commit()
    return {"message": "Statement and associated transactions deleted."}

