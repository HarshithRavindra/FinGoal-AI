"""Tests for Financial Health & Goals Enhancement Endpoints."""

import pytest
from datetime import date
from dateutil.relativedelta import relativedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite:///./test_enhanced.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    import gc
    gc.collect()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import os, time
    time.sleep(0.5)
    try:
        if os.path.exists("test_enhanced.db"):
            os.remove("test_enhanced.db")
    except PermissionError:
        pass


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
2026-11-01,Salary Credit,,85000,134631
2026-11-02,Apartment Rent,22000,,112631
2026-11-05,Big Bazaar Groceries,3500,,109131
2026-11-06,Swiggy Food Order,950,,108181
2026-11-10,Apollo Pharmacy,1100,,107081
2026-11-12,Amazon Shopping,3000,,104081
"""


import uuid

@pytest.fixture()
def auth_headers(client):
    email = f"user_{uuid.uuid4().hex[:8]}@fingoal.ai"
    reg = client.post("/api/auth/register", json={
        "email": email,
        "full_name": "Enhanced User",
        "password": "securepass1234"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Upload statement so user has rich transaction history
    client.post(
        "/api/statements/upload",
        files={"file": ("statement.csv", SAMPLE_CSV, "text/csv")},
        headers=headers,
    )
    return headers


def test_detailed_financial_summary(client, auth_headers):
    response = client.get("/api/financial-health/detailed-summary", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "overview" in data
    assert "classification" in data
    assert "category_breakdown" in data
    assert "monthly_trends" in data
    assert "discretionary_analysis" in data
    assert "score_diagnostics" in data

    # Overview assertions
    ov = data["overview"]
    assert float(ov["monthly_income"]) > 0
    assert float(ov["monthly_expenses"]) > 0
    assert float(ov["actual_accumulated_savings"]) > 0
    assert float(ov["optimized_monthly_savings"]) >= float(ov["current_monthly_savings"])
    assert ov["optimized_savings_rate"] >= ov["current_savings_rate"]

    # Discretionary analysis
    disc = data["discretionary_analysis"]
    assert disc["total_discretionary_amount"] is not None
    assert isinstance(disc["top_categories"], list)
    assert isinstance(disc["top_transactions"], list)


def test_simulate_expense_calculator(client, auth_headers):
    payload = {
        "category_reductions": {
            "Food and Dining": 30.0,
            "Shopping": 20.0,
            "Entertainment": 50.0,
        }
    }
    response = client.post("/api/financial-health/simulate-calculator", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "optimized" in data
    assert "category_impacts" in data
    assert float(data["additional_monthly_savings"]) >= 0
    assert float(data["additional_annual_savings"]) == pytest.approx(float(data["additional_monthly_savings"]) * 12, abs=1)


def test_goals_overview_and_scenarios(client, auth_headers):
    # Create two goals
    g1 = client.post("/api/goals/", json={
        "name": "Emergency Fund Buffer",
        "target_amount": 100000.0,
        "current_savings": 20000.0,
        "target_date": (date.today() + relativedelta(months=12)).isoformat(),
        "category": "Emergency Fund",
        "priority": "high",
    }, headers=auth_headers).json()

    assert g1["current_plan"] is not None
    assert g1["optimized_plan"] is not None
    assert "monthly_contribution" in g1["current_plan"]
    assert "optimized_monthly_contribution" in g1["optimized_plan"]

    # Check overview
    overview_res = client.get("/api/goals/overview", headers=auth_headers)
    assert overview_res.status_code == 200
    ov = overview_res.json()
    assert ov["total_active_goals"] >= 1
    assert float(ov["total_target_amount"]) >= 100000.0
    assert float(ov["actual_accumulated_savings"]) > 0


def test_automatic_savings_allocation_workflow(client, auth_headers):
    # Preview
    preview_res = client.get("/api/goals/allocation-preview", headers=auth_headers)
    assert preview_res.status_code == 200
    pdata = preview_res.json()
    assert "actual_accumulated_savings" in pdata
    assert "unallocated_savings_available" in pdata

    # If unallocated savings are available, test allocating
    if pdata["is_balance_available"] and pdata["allocations"]:
        first_alloc = pdata["allocations"][0]
        goal_id = first_alloc["goal_id"]
        alloc_amt = float(first_alloc["recommended_allocation"])

        if alloc_amt > 0:
            alloc_req = {
                "allocations": [{"goal_id": goal_id, "amount": alloc_amt, "notes": "Test auto allocate"}]
            }
            apply_res = client.post("/api/goals/allocate-savings", json=alloc_req, headers=auth_headers)
            assert apply_res.status_code == 200

            # Verify history
            hist_res = client.get("/api/goals/allocation-history", headers=auth_headers)
            assert hist_res.status_code == 200
            assert len(hist_res.json()) >= 1
            assert hist_res.json()[0]["goal_id"] == goal_id
