"""Pydantic v2 schemas for Organizer operations and trust breakdowns."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrganizerBase(BaseModel):
    """Base fields for organizer."""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    email_domain: Optional[str] = None
    phone_verified: bool = False
    official_email_verified: bool = False
    institution_reg_verified: bool = False
    linkedin_url: Optional[str] = None
    linkedin_active: bool = False
    college_website_match: bool = False


class OrganizerCreate(OrganizerBase):
    """Payload to create a new organizer."""
    govt_id_raw: Optional[str] = Field(
        None,
        description="Raw government ID string, hashed before persistence",
    )


class OrganizerUpdate(BaseModel):
    """Payload to update organizer verification attributes."""
    phone_verified: Optional[bool] = None
    official_email_verified: Optional[bool] = None
    institution_reg_verified: Optional[bool] = None
    linkedin_url: Optional[str] = None
    linkedin_active: Optional[bool] = None
    college_website_match: Optional[bool] = None
    social_proof: Optional[bool] = None
    college_affiliation: Optional[bool] = None
    cross_platform_presence: Optional[bool] = None
    news_mentions: Optional[bool] = None
    domain_age_years: Optional[float] = None
    is_blacklisted: Optional[bool] = None
    has_fraud_history: Optional[bool] = None


class SignalBreakdown(BaseModel):
    """Detailed score points for each of the 5 signal layers."""
    identity: float = Field(..., ge=0.0, le=70.0)
    historical: float = Field(..., ge=0.0, le=50.0)
    content: float = Field(..., ge=0.0, le=35.0)
    community: float = Field(..., ge=-35.0, le=30.0)
    external: float = Field(..., ge=0.0, le=45.0)


class OrganizerTrustScore(BaseModel):
    """Organizer Credibility Score evaluation result."""
    ocs: float = Field(..., ge=0.0, le=100.0)
    tier: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    signals: SignalBreakdown


class OrganizerResponse(OrganizerBase):
    """Full organizer profile response."""
    model_config = ConfigDict(from_attributes=True)

    organizer_id: uuid.UUID
    events_hosted: int
    successful_events: int
    avg_rating: float
    total_ratings: int
    complaint_count: int
    cancellation_count: int
    repeat_participant_rate: float
    ocs: float
    tier: str
    confidence: float
    is_blacklisted: bool
    has_fraud_history: bool
    created_at: datetime
    last_event_at: Optional[datetime] = None


class OrganizerTrustResponse(BaseModel):
    """API response envelope for organizer credibility."""
    data: OrganizerTrustScore
    reasoning: str
    confidence: float
