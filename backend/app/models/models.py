"""SQLAlchemy Database Models for FinGoal-AI."""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Numeric,
    Boolean,
    Date,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    """User account entity with cryptographic authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    statements = relationship("BankStatement", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    financial_reports = relationship("FinancialReport", back_populates="user", cascade="all, delete-orphan")
    savings_goals = relationship("SavingsGoal", back_populates="user", cascade="all, delete-orphan")
    savings_plans = relationship("SavingsPlan", back_populates="user", cascade="all, delete-orphan")
    plan_adjustments = relationship("PlanAdjustment", back_populates="user", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")


class BankStatement(Base):
    """Bank statement ingestion record (PDF / CSV)."""
    __tablename__ = "bank_statements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # pdf, csv
    file_hash = Column(String(64), index=True, nullable=False)  # SHA-256 duplicate check
    file_size_bytes = Column(Integer, nullable=False)
    status = Column(String(20), default="processed")  # processing, processed, failed
    total_transactions = Column(Integer, default=0)
    total_debit = Column(Numeric(14, 2), default=0.0)
    total_credit = Column(Numeric(14, 2), default=0.0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    error_message = Column(Text, nullable=True)
    upload_date = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="statements")
    transactions = relationship("Transaction", back_populates="statement", cascade="all, delete-orphan")


class Transaction(Base):
    """Individual financial ledger item extracted or manually recorded."""
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    statement_id = Column(Integer, ForeignKey("bank_statements.id", ondelete="CASCADE"), index=True, nullable=True)
    date = Column(Date, index=True, nullable=False)
    description = Column(String(500), nullable=False)
    raw_description = Column(Text, nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    transaction_type = Column(String(10), nullable=False)  # debit, credit
    category = Column(String(50), index=True, nullable=False)  # Food, Groceries, Rent...
    expense_type = Column(String(20), index=True, nullable=False)  # Essential, Discretionary, Review
    confidence_score = Column(Float, default=1.0)
    is_user_modified = Column(Boolean, default=False)
    balance = Column(Numeric(14, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="transactions")
    statement = relationship("BankStatement", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_user_cat", "user_id", "category"),
    )


class ExpenseCategory(Base):
    """Categorization taxonomy metadata."""
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    default_expense_type = Column(String(20), nullable=False)  # Essential, Discretionary, Review
    description = Column(Text, nullable=True)
    is_system = Column(Boolean, default=True)


class FinancialReport(Base):
    """Periodic multi-factor financial health score calculation."""
    __tablename__ = "financial_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    overall_score = Column(Float, nullable=False)
    savings_rate_score = Column(Float, nullable=False)
    expense_to_income_score = Column(Float, nullable=False)
    essential_coverage_score = Column(Float, nullable=False)
    income_stability_score = Column(Float, nullable=False)
    monthly_income = Column(Numeric(14, 2), default=0.0)
    monthly_expenses = Column(Numeric(14, 2), default=0.0)
    monthly_savings = Column(Numeric(14, 2), default=0.0)
    savings_rate = Column(Float, default=0.0)
    expense_to_income_ratio = Column(Float, default=0.0)
    essential_expense_ratio = Column(Float, default=0.0)
    essential_expenses = Column(Numeric(14, 2), default=0.0)
    discretionary_expenses = Column(Numeric(14, 2), default=0.0)
    emergency_fund_months = Column(Float, default=0.0)
    status_badge = Column(String(30), nullable=False)
    summary_explanation = Column(Text, nullable=False)
    component_explanations = Column(JSON, nullable=True)
    calculated_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="financial_reports")


class SavingsGoal(Base):
    """Savings goal registered by user."""
    __tablename__ = "savings_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    target_amount = Column(Numeric(14, 2), nullable=False)
    current_savings = Column(Numeric(14, 2), default=0.0)
    target_date = Column(Date, nullable=False)
    category = Column(String(50), default="General")
    priority = Column(String(20), default="medium")  # high, medium, low
    status = Column(String(20), default="active")  # active, completed, archived
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    user = relationship("User", back_populates="savings_goals")
    plans = relationship("SavingsPlan", back_populates="goal", cascade="all, delete-orphan")
    adjustments = relationship("PlanAdjustment", back_populates="goal", cascade="all, delete-orphan")


class SavingsPlan(Base):
    """Versioned savings roadmap for a goal."""
    __tablename__ = "savings_plans"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("savings_goals.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    plan_version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    target_amount = Column(Numeric(14, 2), nullable=False)
    required_monthly_savings = Column(Numeric(14, 2), nullable=False)
    available_capacity = Column(Numeric(14, 2), nullable=False)
    target_date = Column(Date, nullable=False)
    feasibility_status = Column(String(50), nullable=False)
    roadmap_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    goal = relationship("SavingsGoal", back_populates="plans")
    user = relationship("User", back_populates="savings_plans")


class PlanAdjustment(Base):
    """Audit trail of dynamic goal plan alterations following unexpected expenses."""
    __tablename__ = "plan_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("savings_goals.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    unexpected_expense_amount = Column(Numeric(14, 2), nullable=False)
    description = Column(String(500), nullable=False)
    funding_source = Column(String(50), nullable=False)  # emergency_fund, current_income, goal_savings, other
    original_deadline = Column(Date, nullable=False)
    revised_deadline = Column(Date, nullable=False)
    original_monthly_savings = Column(Numeric(14, 2), nullable=False)
    revised_monthly_savings = Column(Numeric(14, 2), nullable=False)
    delay_months = Column(Integer, default=0)
    reason = Column(Text, nullable=False)
    discretionary_reduction_recommended = Column(Numeric(14, 2), default=0.0)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    goal = relationship("SavingsGoal", back_populates="adjustments")
    user = relationship("User", back_populates="plan_adjustments")


class Recommendation(Base):
    """Personalized financial recommendation."""
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    category = Column(String(50), nullable=False)  # savings, expenses, emergency_fund...
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    impact_level = Column(String(20), default="medium")  # high, medium, low
    suggested_action = Column(Text, nullable=False)
    potential_monthly_savings = Column(Numeric(14, 2), default=0.0)
    source = Column(String(20), default="rule_engine")  # ai_model, rule_engine
    is_dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    # Relationships
    user = relationship("User", back_populates="recommendations")

