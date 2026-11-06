# FinGoal-AI

**AI-Powered Personal Financial Health Monitoring and Adaptive Goal Planning System**

FinGoal-AI is a full-stack financial health platform designed to help individual users understand their financial standing, process bank statements, categorize expenses, track savings goals, and dynamically adapt roadmaps when unexpected financial events occur.

---

## Key Modules & Capabilities

1. **Authentication & Data Privacy**: Secure JWT authentication, password hashing with bcrypt, strict user-level data segregation.
2. **Bank Statement Ingestion**: Ingest PDF and CSV statements, extract transaction records (date, description, debit, credit, balance).
3. **Transaction Cleaning & Normalization**: Duplicate detection, missing-value handling, text sanitization.
4. **Expense Categorization**: Hybrid categorization engine combining rule-based heuristics with TF-IDF and Logistic Regression ML models.
5. **Essential vs. Discretionary Classification**: Segment transactions into Essential, Discretionary, and Review with manual override capabilities.
6. **Financial Health Score (FHS)**: Weighted scoring algorithm:
   $$\text{FHS} = 0.30S + 0.25E + 0.25C + 0.20I$$
   Evaluating Savings Rate ($S$), Expense-to-Income ($E$), Essential Expense Coverage ($C$), and Income Stability ($I$).
7. **Personalized Financial Recommendations**: Grounded data-driven recommendations with LLM integration and rule-based fallback.
8. **Savings Goal Management**: Goal creation, target amounts, timelines, and monthly savings requirements.
9. **Goal Feasibility Assessment**: Evaluation of available savings capacity against required contributions.
10. **Adaptive Goal Rescheduling Engine**: Dynamic recalculation, reallocation, and revision of timelines upon unexpected expenses.
11. **Cash Flow & Expense Forecasting**: Predictive baseline models (Moving Average and Linear Regression) for future cash flow and savings trajectory.
12. **Fintech Dashboard**: Interactive analytics and visualizations built with React and Recharts.

---

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Recharts, React Router, Axios
- **Backend**: Python, FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic
- **Database**: PostgreSQL
- **Data & ML**: Pandas, NumPy, Scikit-learn (TF-IDF, Logistic Regression, Linear Regression)
- **Document Processing**: PyMuPDF (`fitz`), Pandas

---

## Directory Architecture

```text
FinGoal-AI/
├── backend/
│   ├── app/
│   │   ├── algorithms/     # FHS, Feasibility, Rescheduling, ML Models
│   │   ├── models/         # SQLAlchemy Database Models
│   │   ├── routers/        # FastAPI API Endpoints
│   │   ├── schemas/        # Pydantic Schemas
│   │   ├── services/       # Statement Extraction, Financial Services
│   │   ├── utils/          # Helpers and Sanitizers
│   │   ├── config.py       # Application Configuration
│   │   ├── database.py     # Database Session & Engine
│   │   └── main.py         # App Entrypoint & Middleware
│   ├── alembic/            # Database Migrations
│   ├── .env.example        # Environment Template
│   └── requirements.txt    # Python Dependencies
├── frontend/               # React + TypeScript Client
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   └── package.json
└── README.md
```

---

## Getting Started

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/HarshithRavindra/FinGoal-AI.git
   cd FinGoal-AI/backend
   ```

2. **Configure Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials and JWT secret
   ```

5. **Run the Development Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Interactive API documentation will be available at:
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

---

## Security Best Practices

- Secret keys, database passwords, and API credentials must always be stored in `.env`.
- Uploaded statements are strictly segregated per user and excluded from version control.
- Never commit actual financial records or `.env` files to git.

