"""Bank Statement Parser — PDF (PyMuPDF) and CSV (Pandas) with robust column detection."""

import io
import re
import hashlib
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Any, Optional
import pandas as pd
import pymupdf  # PyMuPDF

from app.algorithms.categorizer import categorizer
from app.algorithms.classifier import classify_expense


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def calculate_file_hash(content: bytes) -> str:
    """SHA-256 of raw file bytes — used to prevent duplicate uploads."""
    return hashlib.sha256(content).hexdigest()


def parse_date_safely(date_str: str) -> date:
    """Normalise and parse dates across common Indian bank formats."""
    date_str = str(date_str).strip()
    formats = [
        "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d",
        "%d-%b-%Y", "%d/%b/%Y", "%d-%b-%y", "%d/%b/%y",
        "%d %b %Y", "%d %b %y",
        "%m/%d/%Y", "%Y/%m/%d",
        "%d.%m.%Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    try:
        from dateutil import parser as du_parser
        return du_parser.parse(date_str, dayfirst=True).date()
    except Exception:
        return date.today()


def clean_amount(val: Any) -> float:
    """Extract clean float from currency strings with commas, symbols, or brackets."""
    if val is None:
        return 0.0
    try:
        if pd.isna(val):
            return 0.0
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    if not s or s.lower() in ("nan", "none", "null", "-", ""):
        return 0.0
    s = s.replace(",", "").replace("₹", "").replace("$", "").replace("INR", "").replace(" ", "")
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    try:
        return abs(float(s))
    except (ValueError, TypeError):
        return 0.0


def clean_description(raw: str) -> str:
    """Normalise transaction description — collapse whitespace, truncate."""
    if not raw:
        return "Transaction"
    cleaned = re.sub(r"\s+", " ", str(raw)).strip()
    return cleaned[:500] if cleaned else "Transaction"


def _find_col(columns: List[str], keywords: List[str], exclude: Optional[str] = None) -> Optional[str]:
    """
    Find the first column whose name contains any of the given keywords.
    Uses word-boundary matching to avoid false positives (e.g. 'cr' in 'description').
    `exclude` prevents re-selecting an already-assigned column.
    """
    for col in columns:
        if col == exclude:
            continue
        for kw in keywords:
            # Use word boundary regex so 'cr' doesn't match 'description'
            if re.search(r"\b" + re.escape(kw) + r"\b", col):
                return col
    return None


# ---------------------------------------------------------------------------
# CSV Parser
# ---------------------------------------------------------------------------

def parse_csv_statement(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse transactions from CSV bank statements.
    Dynamically detects: Date, Description, Debit, Credit, Balance columns.
    Handles separate Debit/Credit columns as well as single Amount + Type columns.
    """
    try:
        df = pd.read_csv(io.BytesIO(content), dtype=str, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(io.BytesIO(content), dtype=str, encoding="latin-1")

    # Normalise column names: lowercase + strip
    df.columns = [str(c).strip().lower() for c in df.columns]
    cols = list(df.columns)

    # ---- Column detection (order matters: desc first so 'cr' exclusion works) ----
    desc_col = _find_col(cols, ["description", "narration", "particulars", "remarks", "details", "txn remarks"])
    date_col = _find_col(cols, ["date", "txndate", "txn_date", "trans_date", "value date", "posting date"])
    debit_col = _find_col(cols, ["debit", "withdrawal", "withdraw", "dr amount", "dr"])
    # credit_col must NOT match desc_col — also use exact/boundary match for 'cr'
    credit_col = _find_col(cols, ["credit", "deposit", "cr amount"], exclude=debit_col)
    # 'cr' as a standalone column name
    if credit_col is None:
        credit_col = next((c for c in cols if c.strip() == "cr" and c != debit_col), None)
    # Fallback: 'deposit' column
    if credit_col is None:
        credit_col = next((c for c in cols if "deposit" in c and c != debit_col), None)

    amount_col = _find_col(cols, ["amount"]) if (not debit_col and not credit_col) else None
    type_col = _find_col(cols, ["type", "txn type", "dr/cr", "dr cr"])
    balance_col = _find_col(cols, ["balance", "closing balance", "avail"])

    transactions: List[Dict[str, Any]] = []

    for _, row in df.iterrows():
        # Date
        raw_date = row.get(date_col) if date_col else None
        if raw_date is None or (isinstance(raw_date, float) and pd.isna(raw_date)):
            continue
        raw_date_str = str(raw_date).strip()
        if not raw_date_str or raw_date_str.lower() in ("nan", "none", ""):
            continue
        parsed_date = parse_date_safely(raw_date_str)

        # Description
        raw_desc = row.get(desc_col, "Bank Transaction") if desc_col else "Bank Transaction"
        desc = clean_description(raw_desc)

        # Amounts
        debit_val = clean_amount(row.get(debit_col)) if debit_col else 0.0
        credit_val = clean_amount(row.get(credit_col)) if credit_col else 0.0
        bal_val: Optional[float] = clean_amount(row.get(balance_col)) if balance_col else None

        # Determine transaction type and amount
        if debit_val > 0 and credit_val == 0.0:
            amount = debit_val
            txn_type = "debit"
        elif credit_val > 0 and debit_val == 0.0:
            amount = credit_val
            txn_type = "credit"
        elif debit_val > 0 and credit_val > 0:
            # Both have values — treat larger as primary (unusual format)
            if debit_val >= credit_val:
                amount, txn_type = debit_val, "debit"
            else:
                amount, txn_type = credit_val, "credit"
        elif amount_col:
            amount = clean_amount(row.get(amount_col))
            txn_raw_type = str(row.get(type_col, "")).strip().lower() if type_col else ""
            txn_type = "credit" if txn_raw_type.startswith("cr") else "debit"
        else:
            # Try heuristic from description
            desc_lower = desc.lower()
            if any(w in desc_lower for w in ["salary", "credit", "refund", "dividend", "interest cr"]):
                txn_type = "credit"
            else:
                txn_type = "debit"
            amount = 0.0

        if amount <= 0:
            continue

        # Categorise and classify
        category, confidence = categorizer.predict(desc, txn_type)
        expense_type = classify_expense(category, confidence, txn_type, amount)

        transactions.append({
            "date": parsed_date,
            "description": desc,
            "raw_description": str(raw_desc)[:500],
            "amount": Decimal(str(round(amount, 2))),
            "transaction_type": txn_type,
            "category": category,
            "expense_type": expense_type,
            "confidence_score": confidence,
            "balance": Decimal(str(round(bal_val, 2))) if bal_val is not None and bal_val > 0 else None,
        })

    return transactions


# ---------------------------------------------------------------------------
# PDF Parser
# ---------------------------------------------------------------------------

def parse_pdf_statement(content: bytes) -> List[Dict[str, Any]]:
    """
    Parse transactions from PDF bank statements using PyMuPDF.
    Attempts structured table extraction first, falls back to text-line parsing.
    """
    doc = pymupdf.open(stream=content, filetype="pdf")
    transactions: List[Dict[str, Any]] = []

    # Strategy 1: Table extraction via PyMuPDF's find_tables()
    for page in doc:
        try:
            tables = page.find_tables()
            if tables and tables.tables:
                for table in tables.tables:
                    rows = table.extract()
                    if not rows or len(rows) < 2:
                        continue
                    # Detect header row
                    header = [str(h).strip().lower() if h else "" for h in rows[0]]
                    date_idx = next((i for i, h in enumerate(header) if any(k in h for k in ["date", "txn"])), None)
                    desc_idx = next((i for i, h in enumerate(header) if any(k in h for k in ["description", "narration", "particulars", "remarks"])), None)
                    debit_idx = next((i for i, h in enumerate(header) if "debit" in h or "withdrawal" in h), None)
                    credit_idx = next((i for i, h in enumerate(header) if "credit" in h or "deposit" in h), None)
                    amount_idx = next((i for i, h in enumerate(header) if "amount" in h), None)
                    bal_idx = next((i for i, h in enumerate(header) if "balance" in h), None)

                    if date_idx is None:
                        continue

                    for row in rows[1:]:
                        try:
                            raw_date = str(row[date_idx]).strip() if date_idx < len(row) else ""
                            if not raw_date or raw_date.lower() in ("none", "nan", ""):
                                continue
                            parsed_date = parse_date_safely(raw_date)

                            raw_desc = str(row[desc_idx]).strip() if desc_idx is not None and desc_idx < len(row) else "Bank Transaction"
                            desc = clean_description(raw_desc)

                            debit_val = clean_amount(row[debit_idx]) if debit_idx is not None and debit_idx < len(row) else 0.0
                            credit_val = clean_amount(row[credit_idx]) if credit_idx is not None and credit_idx < len(row) else 0.0
                            bal_val = clean_amount(row[bal_idx]) if bal_idx is not None and bal_idx < len(row) else None

                            if debit_val > 0 and credit_val == 0:
                                amount, txn_type = debit_val, "debit"
                            elif credit_val > 0 and debit_val == 0:
                                amount, txn_type = credit_val, "credit"
                            elif amount_idx is not None and amount_idx < len(row):
                                amount = clean_amount(row[amount_idx])
                                desc_lower = desc.lower()
                                txn_type = "credit" if any(w in desc_lower for w in ["credit", "salary", "refund"]) else "debit"
                            else:
                                continue

                            if amount <= 0:
                                continue

                            category, confidence = categorizer.predict(desc, txn_type)
                            expense_type = classify_expense(category, confidence, txn_type, amount)
                            transactions.append({
                                "date": parsed_date,
                                "description": desc,
                                "raw_description": raw_desc[:500],
                                "amount": Decimal(str(round(amount, 2))),
                                "transaction_type": txn_type,
                                "category": category,
                                "expense_type": expense_type,
                                "confidence_score": confidence,
                                "balance": Decimal(str(round(bal_val, 2))) if bal_val and bal_val > 0 else None,
                            })
                        except Exception:
                            continue
        except Exception:
            pass

    if transactions:
        return transactions

    # Strategy 2: Fallback — text-line parsing
    all_lines: List[str] = []
    for page in doc:
        text = page.get_text("text")
        for line in text.split("\n"):
            stripped = line.strip()
            if stripped:
                all_lines.append(stripped)

    date_re = re.compile(
        r"^(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}"
        r"|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}"
        r"|\d{4}-\d{2}-\d{2})"
    )
    amount_re = re.compile(r"\b(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})?)\b")

    i = 0
    while i < len(all_lines):
        line = all_lines[i]
        m = date_re.match(line)
        if m:
            raw_date = m.group(1)
            parsed_date = parse_date_safely(raw_date)
            remainder = line[m.end():].strip()

            desc_parts = [remainder] if remainder else []
            nums_found: List[str] = []

            j = i + 1
            while j < len(all_lines) and not date_re.match(all_lines[j]) and (j - i) < 6:
                sub = all_lines[j]
                sub_nums = amount_re.findall(sub)
                if sub_nums and len(sub_nums) >= 1:
                    nums_found.extend(sub_nums)
                else:
                    desc_parts.append(sub)
                j += 1

            desc_full = clean_description(" ".join(p for p in desc_parts if p))
            clean_nums = [clean_amount(n) for n in nums_found if clean_amount(n) > 0]

            if clean_nums:
                amount = clean_nums[0]
                desc_lower = desc_full.lower()
                txn_type = "credit" if any(
                    w in desc_lower for w in ["credit", "salary", "dividend", "interest cr", "refund", "neft cr"]
                ) else "debit"

                category, confidence = categorizer.predict(desc_full, txn_type)
                expense_type = classify_expense(category, confidence, txn_type, amount)
                transactions.append({
                    "date": parsed_date,
                    "description": desc_full,
                    "raw_description": desc_full[:500],
                    "amount": Decimal(str(round(amount, 2))),
                    "transaction_type": txn_type,
                    "category": category,
                    "expense_type": expense_type,
                    "confidence_score": confidence,
                    "balance": None,
                })
            i = j
        else:
            i += 1

    return transactions
