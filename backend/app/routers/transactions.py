"""Transaction Management Router — list, patch, delete."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Transaction, User
from app.schemas.transaction import TransactionResponse, TransactionUpdate
from app.utils.security import get_current_user

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    statement_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    expense_type: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    limit: int = Query(500, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List transactions for the authenticated user with optional filters."""
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if statement_id is not None:
        q = q.filter(Transaction.statement_id == statement_id)
    if category:
        q = q.filter(Transaction.category == category)
    if expense_type:
        q = q.filter(Transaction.expense_type == expense_type)
    if transaction_type:
        q = q.filter(Transaction.transaction_type == transaction_type)
    q = q.order_by(Transaction.date.desc())
    return q.offset(offset).limit(limit).all()


@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Partially update a transaction (category, expense_type, notes, etc.)."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(txn, field, value)

    if update_data:
        txn.is_user_modified = True

    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a transaction record."""
    txn = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found.")
    db.delete(txn)
    db.commit()

