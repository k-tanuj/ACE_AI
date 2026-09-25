"""FastAPI entry point for ACE_AI Event Verification & Organizer Trust Engine."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.api.observability_routes import router as observability_router
from app.api.verification_routes import router as verification_router
from app.config import settings
from app.database import Base, engine

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger("ace_ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize DB tables and background resources."""
    logger.info("application_startup", environment=settings.APP_ENV)
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("application_shutdown")


app = FastAPI(
    title="ACE_AI Autonomous Event Verification & Organizer Trust Engine",
    description="Fully automated AI verification, duplicate detection, and trust scoring system for AllCollegeEvent.com",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS for Next.js frontend and external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Centralized exception handling with structured JSON response."""
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": request.url.path,
        },
    )


from app.api.stateless_bridge import router as stateless_router

# Mount routers under /api
app.include_router(verification_router, prefix="/api")
app.include_router(observability_router, prefix="/api")
app.include_router(stateless_router, prefix="/api")


@app.get("/health", tags=["System"])
def health_check():
    """Health check endpoint verifying system responsiveness."""
    return {
        "status": "healthy",
        "service": "ACE_AI Verification & Quality Scanner",
        "version": "1.0.0",
    }


@app.get("/", tags=["System"])
def root():
    """Root info endpoint."""
    return {
        "message": "ACE_AI Event Verification & Organizer Credibility Engine",
        "docs_url": "/docs",
        "health": "/health",
    }
