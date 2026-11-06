"""Hybrid Transaction Categorization Engine using Heuristics and ML (TF-IDF + Logistic Regression)."""

import re
from typing import Dict, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Category taxonomy
CATEGORIES = [
    "Food and Dining",
    "Groceries",
    "Transportation",
    "Shopping",
    "Bills and Utilities",
    "Healthcare",
    "Education",
    "Entertainment",
    "Rent",
    "Income",
    "Transfers",
    "Others",
]

# Rule-based regex patterns for fast, robust heuristics
KEYWORD_RULES: Dict[str, List[str]] = {
    "Income": [
        r"\bsalary\b", r"\bpayroll\b", r"\bdividend\b", r"\binterest credit\b",
        r"\bneft credit\b", r"\bach credit\b", r"\bupi credit\b", r"\bfreelance\b",
        r"\bstipend\b", r"\breimbursement\b", r"\bbonus\b"
    ],
    "Rent": [
        r"\brent\b", r"\bhousing\b", r"\blandlord\b", r"\blease\b", r"\btenant\b",
        r"\bmaintenance charges\b", r"\bapartment\b"
    ],
    "Groceries": [
        r"\bgrocery\b", r"\bsupermarket\b", r"\bblinkit\b", r"\bzepto\b", r"\binstamart\b",
        r"\bbigbasket\b", r"\bdmart\b", r"\bspencer\b", r"\bmilk\b", r"\bvegetables\b",
        r"\bfruits\b", r"\bprovisions\b", r"\bbakery\b"
    ],
    "Food and Dining": [
        r"\bswiggy\b", r"\bzomato\b", r"\brestaurant\b", r"\bcafe\b", r"\bcoffee\b",
        r"\bstarbucks\b", r"\bmcdonald\b", r"\bkfc\b", r"\bpizza\b", r"\bburger\b",
        r"\bdhaba\b", r"\bfood\b", r"\bbistro\b", r"\bbar\b", r"\bdine\b"
    ],
    "Transportation": [
        r"\buber\b", r"\bola\b", r"\brapido\b", r"\bmetro\b", r"\bfuel\b", r"\bpetrol\b",
        r"\bdiesel\b", r"\biocl\b", r"\bhpcl\b", r"\bbpcl\b", r"\btoll\b", r"\bfastag\b",
        r"\birctc\b", r"\btrain\b", r"\bflight\b", r"\bindigo\b", r"\bair india\b", r"\bbus\b"
    ],
    "Bills and Utilities": [
        r"\belectricity\b", r"\bwater bill\b", r"\bgas bill\b", r"\bbescom\b", r"\btneb\b",
        r"\bmseb\b", r"\bbroadband\b", r"\bwifi\b", r"\bjio\b", r"\bairtel\b", r"\bvi bill\b",
        r"\bmobile recharge\b", r"\bdth\b", r"\btata sky\b", r"\belectric\b"
    ],
    "Healthcare": [
        r"\bhospital\b", r"\bclinic\b", r"\bpharmacy\b", r"\bmedplus\b", r"\bapollo\b",
        r"\b1mg\b", r"\bpharmeasy\b", r"\bdoctor\b", r"\bdental\b", r"\bdiagnostics\b",
        r"\blab\b", r"\bmedicine\b", r"\bhealth\b"
    ],
    "Education": [
        r"\btuition\b", r"\bschool\b", r"\bcollege\b", r"\buniversity\b", r"\bcourse\b",
        r"\budemy\b", r"\bcoursera\b", r"\bexam fee\b", r"\bbooks\b", r"\bedtech\b"
    ],
    "Entertainment": [
        r"\bnetflix\b", r"\bprime video\b", r"\bspotify\b", r"\bhotstar\b", r"\byoutube\b",
        r"\bcinema\b", r"\bpvr\b", r"\binox\b", r"\bbookmyshow\b", r"\bgaming\b", r"\bsteam\b"
    ],
    "Shopping": [
        r"\bamazon\b", r"\bflipkart\b", r"\bmyntra\b", r"\bajio\b", r"\bclothing\b",
        r"\bzara\b", r"\bh&m\b", r"\belectronics\b", r"\bretail\b", r"\bmall\b", r"\bfootwear\b"
    ],
    "Transfers": [
        r"\btransfer\b", r"\bimps\b", r"\bneft\b", r"\brtgs\b", r"\bself transfer\b",
        r"\bupi\b", r"\bto account\b", r"\bwallet\b", r"\bpaytm\b"
    ],
}

# Training corpus representing realistic Indian bank narration vocabulary
TRAINING_CORPUS = [
    ("SALARY CREDIT FOR MONTH OF OCT", "Income"),
    ("MONTHLY ACH PAYROLL TCS LTD", "Income"),
    ("INFOSYS SALARY DISBURSEMENT", "Income"),
    ("DIVIDEND RECEIVED RELIANCE IND", "Income"),
    ("SAVINGS INTEREST CREDITED", "Income"),
    ("RENT PAYMENT FOR FLAT 402", "Rent"),
    ("HOUSE RENT TO LANDLORD", "Rent"),
    ("MONTHLY APARTMENT MAINTENANCE FEE", "Rent"),
    ("BLINKIT COMMERCE PVT LTD", "Groceries"),
    ("ZEPTO INSTANT GROCERY", "Groceries"),
    ("SWIGGY INSTAMART PURCHASE", "Groceries"),
    ("BIGBASKET SUPERMARKET ORDER", "Groceries"),
    ("DMART SUPERMARKET STORE", "Groceries"),
    ("MOTHER DAIRY MILK AND EGGS", "Groceries"),
    ("SWIGGY ORDER BANGALORE", "Food and Dining"),
    ("ZOMATO RESTAURANT ORDER", "Food and Dining"),
    ("STARBUCKS COFFEE KORAMANGALA", "Food and Dining"),
    ("MCDONALDS BURGER MEAL", "Food and Dining"),
    ("DOMINOS PIZZA OUTLET", "Food and Dining"),
    ("UBER RIDE INDIA PVT LTD", "Transportation"),
    ("OLA CABS TRIP PAYMENT", "Transportation"),
    ("RAPIDO BIKE TAXI", "Transportation"),
    ("HPCL PETROL BUNK INDIRANAGAR", "Transportation"),
    ("IOCL FUEL STATION", "Transportation"),
    ("FASTAG TOLL DEBIT NH44", "Transportation"),
    ("IRCTC RAILWAY TICKET BOOKING", "Transportation"),
    ("AIRTEL POSTPAID MOBILE BILL", "Bills and Utilities"),
    ("JIO FIBER BROADBAND BILL", "Bills and Utilities"),
    ("BESCOM ELECTRICITY BILL", "Bills and Utilities"),
    ("WATER SUPPLY BILL BOARD", "Bills and Utilities"),
    ("APOLLO PHARMACY DRUGS", "Healthcare"),
    ("MEDPLUS CHEMIST MEDICINE", "Healthcare"),
    ("TATA 1MG ORDER HEALTHCARE", "Healthcare"),
    ("FORTIS HOSPITAL CONSULTATION", "Healthcare"),
    ("DR LAL PATHLABS TEST", "Healthcare"),
    ("AMAZON INDIA MARKETPLACE ORDER", "Shopping"),
    ("FLIPKART INTERNET PVT LTD", "Shopping"),
    ("MYNTRA FASHION APPAREL", "Shopping"),
    ("ZARA RETAIL CLOTHING STORE", "Shopping"),
    ("UDEMY COURSE ON MACHINE LEARNING", "Education"),
    ("COURSERA ANNUAL SUBSCRIPTION", "Education"),
    ("COLLEGE SEMESTER TUITION FEE", "Education"),
    ("NETFLIX MONTHLY SUBSCRIPTION", "Entertainment"),
    ("SPOTIFY PREMIUM MUSIC", "Entertainment"),
    ("BOOKMYSHOW PVR CINEMAS", "Entertainment"),
    ("HOTSTAR VIP ANNUAL PASS", "Entertainment"),
    ("UPI TRANSFER TO FRIEND", "Transfers"),
    ("IMPS FUND TRANSFER TO AC 9876", "Transfers"),
    ("NEFT OUTWARD SETTLEMENT", "Transfers"),
]


class TransactionCategorizer:
    """Hybrid Classifier combining heuristic rules with TF-IDF + Logistic Regression."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, lowercase=True)
        self.model = LogisticRegression(max_iter=300, C=1.0)
        self._train_model()

    def _train_model(self):
        """Train baseline ML classifier on structured bank statement corpus."""
        texts = [item[0] for item in TRAINING_CORPUS]
        labels = [item[1] for item in TRAINING_CORPUS]
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)

    def _clean_text(self, text: str) -> str:
        """Sanitize bank narration text for classification."""
        cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned).strip().lower()
        return cleaned

    def predict(
        self, description: str, transaction_type: str = "debit"
    ) -> Tuple[str, float]:
        """
        Predict transaction category and confidence.
        Returns (category, confidence_score).
        """
        if not description:
            return "Others", 0.0

        cleaned = self._clean_text(description)

        # 1. Check for salary / credit heuristics first
        if transaction_type == "credit":
            for pattern in KEYWORD_RULES["Income"]:
                if re.search(pattern, cleaned):
                    return "Income", 0.95

        # 2. Heuristic keyword matches across categories
        for cat, patterns in KEYWORD_RULES.items():
            if cat == "Income" and transaction_type != "credit":
                continue
            for pattern in patterns:
                if re.search(pattern, cleaned):
                    return cat, 0.90

        # 3. Machine Learning (TF-IDF + Logistic Regression)
        try:
            X_vec = self.vectorizer.transform([cleaned])
            probs = self.model.predict_proba(X_vec)[0]
            max_idx = probs.argmax()
            predicted_cat = self.model.classes_[max_idx]
            confidence = float(probs[max_idx])

            # If confidence is solid, return ML prediction
            if confidence >= 0.35:
                return predicted_cat, round(confidence, 2)
        except Exception:
            pass

        return "Others", 0.30


# Singleton categorizer instance
categorizer = TransactionCategorizer()

