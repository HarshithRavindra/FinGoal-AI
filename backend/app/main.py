"""FinGoal-AI Backend Main Application Entrypoint."""

import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    # Cleanup actions on shutdown (if any)


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

