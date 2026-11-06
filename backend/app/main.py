"""FinGoal-AI Backend Main Application Entrypoint."""

import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import engine, Base

# Import all models so SQLAlchemy discovers them before create_all
import app.models.models  # noqa: F401

# Import routers
from app.routers import auth, statements, transactions, financial_health, goals, rescheduling, predictions, recommendations


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Auto-create all database tables (safe: creates only if not exists)
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "FinGoal-AI: AI-Powered Personal Financial Health Monitoring "
        "and Adaptive Goal Planning System"
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all API routers
API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(statements.router, prefix=API_PREFIX)
app.include_router(transactions.router, prefix=API_PREFIX)
app.include_router(financial_health.router, prefix=API_PREFIX)
app.include_router(goals.router, prefix=API_PREFIX)
app.include_router(rescheduling.router, prefix=API_PREFIX)
app.include_router(predictions.router, prefix=API_PREFIX)
app.include_router(recommendations.router, prefix=API_PREFIX)


@app.get("/", tags=["General"])
async def root():
    """Root endpoint returning API metadata and status."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "description": "AI-Powered Personal Financial Health Monitoring and Adaptive Goal Planning System",
        "documentation": "/docs",
        "health": "/api/health",
        "endpoints": {
            "auth": "/api/auth",
            "statements": "/api/statements",
            "transactions": "/api/transactions",
            "financial_health": "/api/financial-health",
            "goals": "/api/goals",
            "rescheduling": "/api/rescheduling",
            "predictions": "/api/predictions",
            "recommendations": "/api/recommendations",
        },
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health check endpoint."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
