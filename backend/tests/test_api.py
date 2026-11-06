"""Integration tests for auth and statement API endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Use an in-memory SQLite for API tests (no PostgreSQL required in CI)
# NOTE: We switch to SQLite only for integration tests to avoid requiring a running PG server.
TEST_DB_URL = "sqlite:///./test_fingoal.db"
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
        if os.path.exists("test_fingoal.db"):
            os.remove("test_fingoal.db")
    except PermissionError:
        pass  # Windows file lock — file will be removed next run


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


# ---------------------------------------------------------------------------
# Auth endpoint tests
# ---------------------------------------------------------------------------

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "FinGoal-AI"
    assert data["status"] == "operational"


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_register_user(client):
    response = client.post("/api/auth/register", json={
        "email": "demo@fingoal.ai",
        "full_name": "Demo User",
        "password": "demopass123"
    })
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "demo@fingoal.ai"


def test_register_duplicate_email(client):
    client.post("/api/auth/register", json={
        "email": "dup@fingoal.ai",
        "full_name": "Dup User",
        "password": "demopass123"
    })
    response = client.post("/api/auth/register", json={
        "email": "dup@fingoal.ai",
        "full_name": "Dup User 2",
        "password": "demopass456"
    })
    assert response.status_code == 400


def test_login_valid_credentials(client):
    client.post("/api/auth/register", json={
        "email": "login@fingoal.ai",
        "full_name": "Login User",
        "password": "loginpass123"
    })
    response = client.post("/api/auth/login", data={
        "username": "login@fingoal.ai",
        "password": "loginpass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client):
    response = client.post("/api/auth/login", data={
        "username": "login@fingoal.ai",
        "password": "wrongpassword"
    })
    assert response.status_code == 401


def test_get_me_authenticated(client):
    reg = client.post("/api/auth/register", json={
        "email": "me@fingoal.ai",
        "full_name": "Me User",
        "password": "mepass1234"
    })
    token = reg.json()["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@fingoal.ai"


def test_get_me_unauthenticated(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_protected_route_no_token(client):
    response = client.get("/api/goals/")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Statement upload tests
# ---------------------------------------------------------------------------

SAMPLE_CSV = b"""Date,Description,Debit,Credit,Balance
2026-10-01,Salary Credit,,85000,85000
2026-10-02,Apartment Rent,22000,,63000
2026-10-03,Swiggy Food Order,850,,62150
"""

INVALID_FILE = b"This is not a valid bank statement format at all!"


def test_upload_valid_csv(client):
    reg = client.post("/api/auth/register", json={
        "email": "upload@fingoal.ai",
        "full_name": "Upload User",
        "password": "uploadpass123"
    })
    token = reg.json()["access_token"]
    response = client.post(
        "/api/statements/upload",
        files={"file": ("statement.csv", SAMPLE_CSV, "text/csv")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["transactions_count"] == 3
    assert "Successfully extracted" in data["message"]


def test_upload_duplicate_rejected(client):
    reg = client.post("/api/auth/register", json={
        "email": "dup2@fingoal.ai",
        "full_name": "Dup2 User",
        "password": "duppass1234"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/api/statements/upload",
        files={"file": ("statement.csv", SAMPLE_CSV, "text/csv")},
        headers=headers)
    response = client.post("/api/statements/upload",
        files={"file": ("statement.csv", SAMPLE_CSV, "text/csv")},
        headers=headers)
    assert response.status_code == 409


def test_upload_invalid_extension(client):
    reg = client.post("/api/auth/register", json={
        "email": "ext@fingoal.ai",
        "full_name": "Ext User",
        "password": "extpass1234"
    })
    token = reg.json()["access_token"]
    response = client.post(
        "/api/statements/upload",
        files={"file": ("statement.xlsx", INVALID_FILE, "application/vnd.ms-excel")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400


def test_upload_empty_file(client):
    reg = client.post("/api/auth/register", json={
        "email": "empty@fingoal.ai",
        "full_name": "Empty User",
        "password": "emptypass123"
    })
    token = reg.json()["access_token"]
    response = client.post(
        "/api/statements/upload",
        files={"file": ("empty.csv", b"", "text/csv")},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
