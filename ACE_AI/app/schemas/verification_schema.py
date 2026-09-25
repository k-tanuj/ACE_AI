"""Pydantic v2 schemas for verification scanning, duplicate checking, and admin actions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, Field

from app.schemas.event_schema import AutoApprovalRecommendation, EventQualityReport


class DuplicateCheckRequest(BaseModel):
    """Payload to test whether a candidate event is a duplicate."""
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    organizer_id: Optional[uuid.UUID] = None
    threshold: Optional[float] = Field(None, ge=0.0, le=1.0)


class DuplicateCheckData(BaseModel):
    """Result of duplicate check analysis."""
    is_duplicate: bool
    duplicate_of: Optional[uuid.UUID] = None
    similarity: float
    fuzzy_title_ratio: float
    matched_reason: Optional[str] = None


class DuplicateCheckResponse(BaseModel):
    """API envelope for duplicate check endpoint."""
    data: DuplicateCheckData
    reasoning: str
    confidence: float


class VerificationScanItem(BaseModel):
    """Individual event result during bulk verification scan."""
    event_id: uuid.UUID
    title: str
    organizer_id: uuid.UUID
    eqs: float
    ocs: float
    is_duplicate: bool
    duplicate_of: Optional[uuid.UUID] = None
    spam_flags: List[str]
    recommendation: AutoApprovalRecommendation
    new_status: str


class VerificationScanSummary(BaseModel):
    """Aggregated stats from a bulk verification scan."""
    total_scanned: int
    auto_approved: int
    spot_check: int
    manual_review: int
    rejected: int
    duplicates_found: int
    spam_detected: int
    details: List[VerificationScanItem]


class VerificationScanApiResponse(BaseModel):
    """API envelope for bulk verification scan."""
    data: VerificationScanSummary
    reasoning: str
    confidence: float


class AdminOverrideRequest(BaseModel):
    """Payload for admin overriding event status."""
    decision: str = Field(..., pattern="^(approved|rejected)$")
    reason: str = Field(..., min_length=3, max_length=500)


class AdminOverrideData(BaseModel):
    """Result of admin override."""
    event_id: uuid.UUID
    previous_status: str
    new_status: str
    organizer_id: uuid.UUID
    ocs_adjusted: bool
    new_ocs: float
    delta: float


class AdminOverrideApiResponse(BaseModel):
    """API envelope for admin override endpoint."""
    data: AdminOverrideData
    reasoning: str
    confidence: float


class ReviewQueueItem(BaseModel):
    """Item in admin manual review queue."""
    event_id: uuid.UUID
    title: str
    organizer_id: uuid.UUID
    organizer_name: str
    organizer_tier: str
    ocs: float
    eqs: float
    spam_flags: List[str]
    is_duplicate: bool
    priority: str
    created_at: datetime
    reason: str


class ReviewQueueApiResponse(BaseModel):
    """API envelope for admin review queue."""
    data: List[ReviewQueueItem]
    reasoning: str
    confidence: float


class TrustDashboardMetrics(BaseModel):
    """Aggregated system-wide trust metrics."""
    total_organizers: int
    tier_distribution: Dict[str, int]
    avg_platform_ocs: float
    total_events: int
    events_by_status: Dict[str, int]
    total_spam_detected: int
    total_duplicates_detected: int
    recent_audits_count: int


class TrustDashboardApiResponse(BaseModel):
    """API envelope for trust metrics dashboard."""
    data: TrustDashboardMetrics
    reasoning: str
    confidence: float
