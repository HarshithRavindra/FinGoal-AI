"""Tests for statement parser — CSV and PDF extraction."""

import io
import pytest
from decimal import Decimal
from app.services.statement_parser import parse_csv_statement, clean_amount, parse_date_safely


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_CSV = b"""Date,Description,Debit,Credit,Balance
2026-10-01,Salary Credit,,85000,85000
2026-10-02,Apartment Rent,22000,,63000
2026-10-03,Swiggy Food Order,850,,62150
2026-10-04,Zomato Delivery,620,,61530
2026-10-07,Big Bazaar Groceries,3200,,58330
2026-10-08,Netflix Subscription,499,,57831
2026-10-10,Petrol BPCL,2500,,55331
2026-10-12,Apollo Pharmacy,1200,,54131
2026-10-14,Amazon Shopping,4500,,49631
"""

EMPTY_CSV = b"""Date,Description,Debit,Credit,Balance
"""

NO_CREDIT_CSV = b"""Date,Description,Amount,Balance
2026-10-01,Swiggy Food,850,5000
2026-10-02,Uber Ride,350,4650
"""


# ---------------------------------------------------------------------------
# clean_amount tests
# ---------------------------------------------------------------------------

def test_clean_amount_normal():
    assert clean_amount("1000.50") == 1000.50

def test_clean_amount_with_comma():
    assert clean_amount("1,00,000.00") == 100000.0

def test_clean_amount_nan():
    assert clean_amount(float("nan")) == 0.0

def test_clean_amount_none():
    assert clean_amount(None) == 0.0

def test_clean_amount_empty():
    assert clean_amount("") == 0.0

def test_clean_amount_rupee_symbol():
    assert clean_amount("₹5,000") == 5000.0

def test_clean_amount_negative_brackets():
    # accounting brackets (1000.00) → positive
    assert clean_amount("(1000.00)") == 1000.0


# ---------------------------------------------------------------------------
# parse_date_safely tests
# ---------------------------------------------------------------------------

def test_parse_date_dd_mm_yyyy():
    from datetime import date
    result = parse_date_safely("01-10-2026")
    assert result == date(2026, 10, 1)

def test_parse_date_dd_mon_yyyy():
    from datetime import date
    result = parse_date_safely("01 Oct 2026")
    assert result == date(2026, 10, 1)

def test_parse_date_iso():
    from datetime import date
    result = parse_date_safely("2026-10-01")
    assert result == date(2026, 10, 1)


# ---------------------------------------------------------------------------
# parse_csv_statement tests
# ---------------------------------------------------------------------------

def test_csv_basic_parse():
    txns = parse_csv_statement(SAMPLE_CSV)
    assert len(txns) == 9

def test_csv_credits_detected():
    """Salary credits must be detected as credit type, not debit."""
    txns = parse_csv_statement(SAMPLE_CSV)
    credits = [t for t in txns if t["transaction_type"] == "credit"]
    assert len(credits) == 1
    assert float(credits[0]["amount"]) == 85000.0

def test_csv_debits_detected():
    txns = parse_csv_statement(SAMPLE_CSV)
    debits = [t for t in txns if t["transaction_type"] == "debit"]
    assert len(debits) == 8

def test_csv_income_categorised():
    """Salary row must be categorised as Income."""
    txns = parse_csv_statement(SAMPLE_CSV)
    salary_txn = next(t for t in txns if "salary" in t["description"].lower())
    assert salary_txn["category"] == "Income"

def test_csv_rent_categorised():
    txns = parse_csv_statement(SAMPLE_CSV)
    rent_txn = next(t for t in txns if "rent" in t["description"].lower())
    assert rent_txn["category"] == "Rent"

def test_csv_food_categorised():
    txns = parse_csv_statement(SAMPLE_CSV)
    food_txn = next(t for t in txns if "swiggy" in t["description"].lower())
    assert food_txn["category"] == "Food and Dining"

def test_csv_empty_returns_empty_list():
    result = parse_csv_statement(EMPTY_CSV)
    assert result == []

def test_csv_transactions_have_required_fields():
    txns = parse_csv_statement(SAMPLE_CSV)
    for t in txns:
        assert "date" in t
        assert "description" in t
        assert "amount" in t
        assert "transaction_type" in t
        assert "category" in t
        assert "expense_type" in t
        assert t["transaction_type"] in ("debit", "credit")
        assert t["expense_type"] in ("Essential", "Discretionary", "Review", "Income")
        assert float(t["amount"]) > 0

def test_csv_no_credit_column_fallback():
    """CSV with single amount column should still parse without crashing."""
    result = parse_csv_statement(NO_CREDIT_CSV)
    assert isinstance(result, list)

