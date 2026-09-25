"""Event ORM model with verification, duplicate detection, and quality attributes."""

import uuid
from datetime import datetime
from typing import Any, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON, TypeDecorator

from app.database import Base

# Safe vector type supporting PostgreSQL pgvector and SQLite JSON fallback
try:
    from pgvector.sqlalchemy import Vector
    EmbeddingColumnType = Vector(384)
except ImportError:
    class EmbeddingColumnType(TypeDecorator):  # type: ignore
        impl = JSON
        cache_ok = True


class Event(Base):
    """SQLAlchemy model representing an event and its automated verification metadata."""

    __tablename__ = "events"

    event_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("organizers.organizer_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    venue: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    registration_deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    eligibility: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registration_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    banner_url: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    is_original_image: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Verification and Quality scoring
    quality_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verification_status: Mapped[str] = mapped_column(
        String(50),
        default="auto_quarantined",
        nullable=False,
        index=True,
    )  # auto_approved / auto_rejected / auto_flagged / auto_quarantined
    decision_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    decision_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    user_reports_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Duplicate detection
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("events.event_id", ondelete="SET NULL"),
        nullable=True,
    )

    # Fraud & content flags
    spam_flags: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)

    # Vector embedding (384-dimensional for all-MiniLM-L6-v2)
    embedding: Mapped[Optional[Any]] = mapped_column(EmbeddingColumnType, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    organizer: Mapped["Organizer"] = relationship("Organizer", back_populates="events")
    ratings: Mapped[List["Rating"]] = relationship(
        "Rating",
        back_populates="event",
        cascade="all, delete-orphan",
    )
