from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from types import SimpleNamespace
from datetime import datetime

from app.services.duplicate_detector import detect_duplicate
from app.services.eqs_engine import compute_eqs
from app.services.fraud_detector import detect_fraud
from app.services.ocs_engine import compute_ocs
from app.services.auto_decision import make_auto_decision

router = APIRouter(prefix="/stateless", tags=["Stateless Bridge"])

class StatelessPayload(BaseModel):
    candidate_event: dict
    organizer: dict
    organizer_events: List[dict]
    existing_events: List[dict]

def to_obj(d: dict) -> Any:
    if not d:
        return None
    
    # Simple recursive conversion to allow nested dot-notation access if needed,
    # though SimpleNamespace mostly does top-level.
    obj = SimpleNamespace(**d)
    
    # Map Next.js camelCase fields to FastAPI's expected snake_case fields
    if hasattr(obj, "organizerId"): obj.organizer_id = obj.organizerId
    if hasattr(obj, "startAt"): obj.event_date = obj.startAt
    if hasattr(obj, "type"): obj.category = obj.type
    if hasattr(obj, "registrationUrl"): obj.registration_url = obj.registrationUrl
    if hasattr(obj, "bannerUrl"): obj.banner_url = obj.bannerUrl
    if hasattr(obj, "viewCount"): obj.user_reports_count = obj.viewCount # arbitrary map for reports
    if hasattr(obj, "createdAt"): obj.created_at = obj.createdAt
    if hasattr(obj, "id"): obj.event_id = obj.id
    
    # Organizer mappings
    if hasattr(obj, "verificationStatus"): obj.verification_status = obj.verificationStatus
    
    return obj

@router.post("/verify")
def verify_stateless(payload: StatelessPayload):
    """
    Stateless API bridge for Next.js.
    Accepts full JSON payloads from Prisma and runs all AI validation engines
    without needing a direct DB connection.
    """
    candidate = to_obj(payload.candidate_event)
    org = to_obj(payload.organizer)
    org_events = [to_obj(e) for e in payload.organizer_events]
    all_events = [to_obj(e) for e in payload.existing_events]

    # Run the verification pipeline
    ocs_data = compute_ocs(org, org_events)
    eqs = compute_eqs(candidate, org)
    fraud = detect_fraud(candidate, org)
    dup = detect_duplicate(candidate, all_events)
    
    decision = make_auto_decision(candidate, org, eqs, ocs_data, fraud, dup)
    
    status_map = {
        "AUTO_APPROVE": "APPROVED",
        "AUTO_REJECT": "REJECTED",
        "AUTO_FLAG": "FLAGGED",
        "AUTO_QUARANTINE": "PENDING",
    }
    
    return {
        "status": "success",
        "mapped_status": status_map.get(decision["decision"], "PENDING"),
        "decision": decision,
        "eqs": eqs,
        "ocs": ocs_data,
        "fraud": fraud,
        "dup": dup
    }
