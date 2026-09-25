"""API router registration."""

from app.api.observability_routes import router as observability_router
from app.api.verification_routes import router as verification_router

__all__ = ["verification_router", "observability_router"]
