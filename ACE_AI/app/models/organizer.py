"""Organizer ORM model with credibility signals and trust status."""

import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Float, Integer, String, JSON, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Organizer(Base):
    """SQLAlchemy model representing an event organizer and their credibility metrics."""

    __tablename__ = "organizers"

    organizer_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email_domain: Mapped[str] = mapped_column(String(255), nullable=False, default="")

    # Verification / Identity signals
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    official_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    govt_id_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Never raw ID
    institution_reg_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    linkedin_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    college_website_match: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Historical metrics
    events_hosted: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_events: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    complaint_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancellation_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    repeat_participant_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Community signals
    student_reports: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    admin_flags: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    peer_endorsements: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    social_proof: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    college_affiliation: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # External presence signals
    cross_platform_presence: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    news_mentions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    domain_age_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    domain_age_years: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Computed Trust & Moderation fields
    ocs: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    tier: Mapped[str] = mapped_column(String(50), default="New", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    auto_decision_history: Mapped[List[dict]] = mapped_column(JSON, default=list, nullable=False)
    is_blacklisted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    has_fraud_history: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    last_event_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    events: Mapped[List["Event"]] = relationship(
        "Event",
        back_populates="organizer",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[List["TrustAudit"]] = relationship(
        "TrustAudit",
        back_populates="organizer",
        cascade="all, delete-orphan",
    )
