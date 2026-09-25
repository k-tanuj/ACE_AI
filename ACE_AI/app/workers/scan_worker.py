"""Autonomous Background Event Scanner Worker.

Scans pending or quarantined events, executes fully automated decision pipeline,
updates database state, and records trust audit entries with zero manual review.
"""

from datetime import datetime, timezone
import asyncio
import structlog
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.event import Event
from app.models.organizer import Organizer
from app.models.trust_audit import TrustAudit
from app.services.ocs_engine import compute_ocs, persist_ocs
from app.services.eqs_engine import compute_eqs
from app.services.duplicate_detector import detect_duplicate
from app.services.fraud_detector import detect_fraud
from app.services.auto_decision import make_auto_decision

logger = structlog.get_logger(__name__)


def process_single_event(db: Session, event: Event) -> dict:
    """Process a single event through the autonomous verification pipeline."""
    organizer = db.query(Organizer).filter(Organizer.organizer_id == event.organizer_id).first()
    if not organizer:
        logger.error("scan_event_missing_organizer", event_id=str(event.event_id))
        return {"status": "skipped", "reason": "missing_organizer"}

    # Fetch existing events for duplicate checking
    existing_events = db.query(Event).filter(Event.event_id != event.event_id).all()
    org_events = [e for e in existing_events if e.organizer_id == organizer.organizer_id]

    ocs_data = compute_ocs(organizer, org_events)
    eqs = compute_eqs(event, organizer)
    fraud_report = detect_fraud(event, organizer)
    dup_report = detect_duplicate(event, existing_events)

    decision = make_auto_decision(event, organizer, eqs, ocs_data, fraud_report, dup_report)

    status_map = {
        "AUTO_APPROVE": "auto_approved",
        "AUTO_REJECT": "auto_rejected",
        "AUTO_FLAG": "auto_flagged",
        "AUTO_QUARANTINE": "auto_quarantined",
    }

    new_status = status_map.get(decision["decision"], "auto_flagged")
    event.verification_status = new_status
    event.decision_reason = decision["reason"]
    event.decision_confidence = decision["confidence"]
    event.quality_score = eqs.get("eqs", eqs.get("quality_score", 0.0))
    event.verified_at = datetime.now(timezone.utc)

    persist_ocs(db, organizer, ocs_data, reason=f"Background scan: {decision['decision']}", event_id=event.event_id)

    db.add(TrustAudit(
        organizer_id=organizer.organizer_id,
        event_id=event.event_id,
        event_type=f"auto_decision_{new_status}",
        delta=0.0,
        reason=decision["reason"],
        confidence=decision["confidence"],
    ))

    db.commit()
    logger.info(
        "scanned_event_auto_decision",
        event_id=str(event.event_id),
        decision=decision["decision"],
        status=new_status,
        confidence=decision["confidence"],
    )
    return decision


async def scan_all_pending_events() -> int:
    """Fetch all pending or quarantined events and execute auto-decision scan."""
    db: Session = SessionLocal()
    try:
        pending_events = (
            db.query(Event)
            .filter(Event.verification_status.in_(["pending", "auto_quarantined"]))
            .all()
        )
        count = 0
        for event in pending_events:
            process_single_event(db, event)
            count += 1
        return count
    finally:
        db.close()


async def run_scan_worker_loop(interval_seconds: int = 900):
    """Continuous background worker loop for periodic event scanning."""
    logger.info("starting_scan_worker_loop", interval=interval_seconds)
    while True:
        try:
            processed = await scan_all_pending_events()
            logger.info("completed_scan_worker_cycle", processed_count=processed)
        except Exception as e:
            logger.error("scan_worker_error", error=str(e))
        await asyncio.sleep(interval_seconds)
