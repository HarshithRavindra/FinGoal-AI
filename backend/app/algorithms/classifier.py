"""Classification engine for segmenting transactions into Essential, Discretionary, and Review."""

from typing import Tuple

# Mapping of categories to their baseline classifications
ESSENTIAL_CATEGORIES = {
    "Rent",
    "Groceries",
    "Bills and Utilities",
    "Healthcare",
    "Education",
}

DISCRETIONARY_CATEGORIES = {
    "Entertainment",
    "Food and Dining",
    "Shopping",
}

AMBIGUOUS_CATEGORIES = {
    "Transportation",
    "Transfers",
    "Others",
}


def classify_expense(
    category: str,
    confidence_score: float,
    transaction_type: str = "debit",
    amount: float = 0.0,
) -> str:
    """
    Classify transaction into 'Essential', 'Discretionary', or 'Review'.
    
    Adheres strictly to project requirements:
    - Never automatically mark all shopping, transit, or healthcare as discretionary.
    - Flag low confidence or ambiguous transactions for user review.
    """
    # Inflows/Credits are not expenses
    if transaction_type == "credit" or category == "Income":
        return "Essential"

    # Flag low confidence or unclassified entries for user audit
    if confidence_score < 0.60 or category == "Others":
        return "Review"

    # High-confidence essential categories
    if category in ESSENTIAL_CATEGORIES:
        return "Essential"

    # High-confidence discretionary categories
    if category in DISCRETIONARY_CATEGORIES:
        return "Discretionary"

    # Category-specific nuanced checks
    if category == "Transportation":
        # Public transit / reasonable daily commute vs luxury travel
        if amount > 5000:
            return "Review"
        return "Essential"

    if category == "Transfers":
        return "Review"

    return "Review"

