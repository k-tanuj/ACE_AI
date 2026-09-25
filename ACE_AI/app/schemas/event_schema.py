"""Pydantic v2 schemas for Event operations, quality scoring, and auto-approval."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    """Base event payload fields."""
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    venue: Optional[str] = None
    location: Optional[str] = None
    event_date: datetime
    registration_deadline: datetime
    eligibility: Optional[str] = None
    registration_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_original_image: bool = True


class EventCreate(EventBase):
    """Payload to create an event for verification."""
    organizer_id: uuid.UUID


class EventUpdate(BaseModel):
    """Payload to update an event."""
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    venue: Optional[str] = None
    location: Optional[str] = None
    event_date: Optional[datetime] = None
    registration_deadline: Optional[datetime] = None
    eligibility: Optional[str] = None
    registration_url: Optional[str] = None
    banner_url: Optional[str] = None
    is_original_image: Optional[bool] = None


class EventQualityBreakdown(BaseModel):
    """Breakdown of factors contributing to Event Quality Score."""
    completeness: float = Field(..., ge=0.0, le=100.0)
    organizer_credibility: float = Field(..., ge=0.0, le=100.0)
    description_quality: float = Field(..., ge=0.0, le=100.0)
    verification_status: float = Field(..., ge=0.0, le=100.0)
    user_reports_score: float = Field(..., ge=0.0, le=100.0)


class AutoApprovalRecommendation(BaseModel):
    """Decision output recommending action on the event."""
    decision: str  # AUTO_APPROVE, AUTO_APPROVE_WITH_SPOT_CHECK, MANUAL_REVIEW, MANUAL_REVIEW_HIGH_PRIORITY, REJECT
    reason: str
    priority: str  # high, medium, low


class EventQualityReport(BaseModel):
    """Consolidated quality, duplicate, and moderation report for an event."""
    event_id: uuid.UUID
    eqs: float = Field(..., ge=0.0, le=100.0)
    verification_status: str
    is_duplicate: bool
    duplicate_of: Optional[uuid.UUID] = None
    spam_flags: List[str]
    breakdown: EventQualityBreakdown
    recommendation: AutoApprovalRecommendation


class EventResponse(EventBase):
    """Full event response model."""
    model_config = ConfigDict(from_attributes=True)

    event_id: uuid.UUID
    organizer_id: uuid.UUID
    quality_score: float
    verification_status: str
    user_reports_count: int
    is_duplicate: bool
    duplicate_of: Optional[uuid.UUID] = None
    spam_flags: List[str]
    created_at: datetime


class EventQualityApiResponse(BaseModel):
    """API envelope for event verification and quality endpoint."""
    data: EventQualityReport
    reasoning: str
    confidence: float
