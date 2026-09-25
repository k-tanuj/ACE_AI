"""Event and Organizer Verification API endpoints.

Fully automated submission, scoring, duplicate check, external check refresh, and OCS endpoints.
ZERO manual human approval/rejection/override routes exist.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session
import structlog

from app.database import get_db
from app.models.event import Event
from app.models.organizer import Organizer
from app.models.trust_audit import TrustAudit
from app.services.duplicate_detector import detect_duplicate
from app.services.eqs_engine import compute_eqs
from app.services.fraud_detector import detect_fraud
from app.services.ocs_engine import compute_ocs, persist_ocs
from app.services.auto_decision import make_auto_decision
from app.services.external_validator import run_all_external_checks

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/verify", tags=["Verification"])


@router.post("/submit", response_model=Dict[str, Any])
def submit_event_for_verification(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Submit an event for fully autonomous verification and immediate auto-decision.

    Accepts event payload, runs duplicate detector, fraud detector, EQS engine,
    and OCS engine, then calls make_auto_decision().
    Returns decision, visibility, priority_boost, confidence, and reasoning.
    """
    organizer_id_str = payload.get("organizer_id")
    if not organizer_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="organizer_id is required",
        )

    try:
        org_id = uuid.UUID(str(organizer_id_str))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid organizer_id format",
        )

    organizer = db.get(Organizer, org_id)
    if not organizer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organizer with ID {org_id} not found",
        )

    # Fetch existing events for duplicate detection
    existing_events = db.query(Event).all()
    org_events = [e for e in existing_events if e.organizer_id == org_id]

    def parse_dt(val: Any) -> datetime:
        if isinstance(val, datetime):
            return val
        if isinstance(val, str) and val:
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00"))
            except ValueError:
                pass
        return datetime.now(timezone.utc)

    title = payload.get("title", "Untitled Event")
    description = payload.get("description", "")
    registration_url = payload.get("registration_url", "")
    event_date = parse_dt(payload.get("event_date"))
    registration_deadline = parse_dt(payload.get("registration_deadline"))

    candidate_event = Event(
        event_id=uuid.uuid4(),
        organizer_id=org_id,
        title=title,
        description=description,
        registration_url=registration_url,
        venue=payload.get("venue"),
        location=payload.get("location"),
        event_date=event_date,
        registration_deadline=registration_deadline,
        eligibility=payload.get("eligibility"),
        banner_url=payload.get("banner_url"),
    )

    # 1. External & signal checks
    ocs_data = compute_ocs(organizer, org_events)
    eqs = compute_eqs(candidate_event, organizer)
    fraud_report = detect_fraud(candidate_event, organizer)
    dup_report = detect_duplicate(candidate_event, existing_events)

    # 2. Autonomous Decision
    decision = make_auto_decision(candidate_event, organizer, eqs, ocs_data, fraud_report, dup_report)

    status_map = {
        "AUTO_APPROVE": "auto_approved",
        "AUTO_REJECT": "auto_rejected",
        "AUTO_FLAG": "auto_flagged",
        "AUTO_QUARANTINE": "auto_quarantined",
    }
    new_status = status_map.get(decision["decision"], "auto_flagged")

    candidate_event.verification_status = new_status
    candidate_event.decision_reason = decision["reason"]
    candidate_event.decision_confidence = decision["confidence"]
    candidate_event.quality_score = eqs.get("eqs", eqs.get("quality_score", 0.0))
    candidate_event.is_duplicate = dup_report.get("is_duplicate", False)
    if dup_report.get("duplicate_of"):
        candidate_event.duplicate_of = dup_report["duplicate_of"]

    db.add(candidate_event)
    persist_ocs(db, organizer, ocs_data, reason=f"Submit auto-decision: {decision['decision']}", event_id=candidate_event.event_id)

    db.commit()

    return {
        "event_id": str(candidate_event.event_id),
        "organizer_id": str(org_id),
        "status": new_status,
        "decision": decision["decision"],
        "reason": decision["reason"],
        "confidence": decision["confidence"],
        "visibility": decision["visibility"],
        "priority_boost": decision["priority_boost"],
        "next_actions": decision["next_actions"],
        "eqs": eqs.get("eqs", eqs.get("quality_score", 0.0)),
        "ocs": ocs_data["ocs"],
    }


@router.get("/event/{event_id}", response_model=Dict[str, Any])
def get_event_verification_report(
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve the Event Quality Score (EQS), auto-decision, and reasoning for an event."""
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with ID {event_id} not found",
        )

    org = db.get(Organizer, event.organizer_id)
    eqs_data = compute_eqs(event, org)
    fraud_data = detect_fraud(event, org)

    existing = db.query(Event).filter(Event.event_id != event_id).all()
    dup_data = detect_duplicate(event, existing)
    org_events = [e for e in existing if e.organizer_id == event.organizer_id]
    ocs_data = compute_ocs(org, org_events) if org else {"ocs": 0.0, "confidence": 0.0, "tier": "New", "signals": {}}

    decision = make_auto_decision(event, org, eqs_data, ocs_data, fraud_data, dup_data)

    return {
        "event_id": str(event.event_id),
        "title": event.title,
        "organizer_id": str(event.organizer_id),
        "verification_status": event.verification_status,
        "quality_score": event.quality_score,
        "decision": decision,
        "eqs_breakdown": eqs_data.get("breakdown", {}),
        "fraud_flags": fraud_data.get("flags", []),
        "is_duplicate": event.is_duplicate,
        "duplicate_of": str(event.duplicate_of) if event.duplicate_of else None,
    }


@router.get("/organizer/{organizer_id}", response_model=Dict[str, Any])
def get_organizer_credibility(
    organizer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve an organizer's Organizer Credibility Score (OCS) and 5-signal breakdown."""
    org = db.get(Organizer, organizer_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organizer with ID {organizer_id} not found",
        )

    events = db.query(Event).filter(Event.organizer_id == organizer_id).all()
    ocs_data = compute_ocs(org, events)

    return {
        "organizer_id": str(org.organizer_id),
        "name": org.name,
        "email": org.email,
        "ocs": ocs_data["ocs"],
        "tier": ocs_data["tier"],
        "confidence": ocs_data["confidence"],
        "signals": ocs_data["signals"],
        "is_blacklisted": org.is_blacklisted,
        "has_fraud_history": org.has_fraud_history,
    }


@router.post("/organizer/{organizer_id}/recompute", response_model=Dict[str, Any])
def recompute_organizer_credibility(
    organizer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Recompute and persist the latest OCS for an organizer, applying anti-gaming delta caps."""
    org = db.get(Organizer, organizer_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organizer with ID {organizer_id} not found",
        )

    events = db.query(Event).filter(Event.organizer_id == organizer_id).all()
    ocs_data = compute_ocs(org, events)
    updated_org = persist_ocs(db, org, ocs_data, reason="Auto OCS recompute requested via API")

    return {
        "organizer_id": str(updated_org.organizer_id),
        "ocs": updated_org.ocs,
        "tier": updated_org.tier,
        "confidence": updated_org.confidence,
        "signals": ocs_data["signals"],
        "status": "updated",
    }


@router.post("/duplicate-check", response_model=Dict[str, Any])
def check_event_duplicate(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Check whether a candidate event is a duplicate before publication."""
    existing_events = db.query(Event).order_by(desc(Event.created_at)).limit(1000).all()

    candidate = Event(
        title=payload.get("title", ""),
        description=payload.get("description", ""),
        organizer_id=uuid.UUID(payload["organizer_id"]) if payload.get("organizer_id") else uuid.uuid4(),
    )

    threshold = float(payload.get("threshold", 0.85))
    dupe_result = detect_duplicate(candidate, existing_events, threshold=threshold)

    return {
        "is_duplicate": dupe_result["is_duplicate"],
        "duplicate_of": str(dupe_result["duplicate_of"]) if dupe_result.get("duplicate_of") else None,
        "similarity": dupe_result.get("similarity", 0.0),
        "threshold": threshold,
    }


@router.post("/external-refresh/{organizer_id}", response_model=Dict[str, Any])
async def refresh_external_checks(
    organizer_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Trigger automated external checks (LinkedIn, college website, WHOIS, cross-platform) for an organizer."""
    org = db.get(Organizer, organizer_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organizer with ID {organizer_id} not found",
        )

    ext_signals = await run_all_external_checks(org)

    org.college_website_match = ext_signals.get("college_website_match", False)
    org.linkedin_active = ext_signals.get("linkedin_active", False)
    org.domain_age_days = ext_signals.get("domain_age_days", 0)
    org.domain_age_years = ext_signals.get("domain_age_years", 0.0)
    org.cross_platform_presence = ext_signals.get("cross_platform_presence", False)
    org.news_mentions = bool(ext_signals.get("news_mentions", False))

    events = db.query(Event).filter(Event.organizer_id == organizer_id).all()
    ocs_data = compute_ocs(org, events)
    persist_ocs(db, org, ocs_data, reason="External checks refresh")

    return {
        "organizer_id": str(organizer_id),
        "external_signals": ext_signals,
        "updated_ocs": org.ocs,
        "updated_tier": org.tier,
    }
