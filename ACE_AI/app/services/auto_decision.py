"""Fully autonomous AI Decision Engine.

Replaces manual admin review with zero human-in-the-loop requirement.
Decides: AUTO_APPROVE, AUTO_REJECT, AUTO_FLAG, or AUTO_QUARANTINE.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import structlog

from app.utils.link_validator import is_valid_url

logger = structlog.get_logger(__name__)


def _now() -> datetime:
    """Return current UTC timestamp with timezone."""
    return datetime.now(timezone.utc)


def approve(visibility: str = "full", boost: float = 1.0, reason: str = "Meets automated trust and quality thresholds") -> Dict[str, Any]:
    """Helper to structure AUTO_APPROVE response dict."""
    return {
        "decision": "AUTO_APPROVE",
        "visibility": visibility,
        "priority_boost": boost,
        "confidence": 0.90,
        "reason": reason,
        "next_actions": ["monitor_engagement"],
    }


def reject(reason: str, confidence: float = 0.95) -> Dict[str, Any]:
    """Helper to structure AUTO_REJECT response dict."""
    return {
        "decision": "AUTO_REJECT",
        "visibility": "hidden",
        "priority_boost": 0.0,
        "confidence": confidence,
        "reason": reason,
        "next_actions": ["notify_organizer"],
    }


def flag(reason: str, visibility: str = "limited", confidence: float = 0.70) -> Dict[str, Any]:
    """Helper to structure AUTO_FLAG response dict."""
    return {
        "decision": "AUTO_FLAG",
        "visibility": visibility,
        "priority_boost": 0.5,
        "confidence": confidence,
        "reason": reason,
        "next_actions": ["recompute_ocs_after_7_days"],
    }


def quarantine(reason: str, confidence: float = 0.80) -> Dict[str, Any]:
    """Helper to structure AUTO_QUARANTINE response dict."""
    return {
        "decision": "AUTO_QUARANTINE",
        "visibility": "hidden",
        "priority_boost": 0.0,
        "confidence": confidence,
        "reason": reason,
        "next_actions": ["request_additional_signals"],
    }


def make_auto_decision(
    event: Any,
    organizer: Any,
    eqs: Dict[str, Any],
    ocs_data: Dict[str, Any],
    fraud_report: Dict[str, Any],
    dup_report: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute fully autonomous decision pipeline for an event.

    Args:
        event: Event model or dict with attributes.
        organizer: Organizer model or dict with attributes.
        eqs: Result dict from EQS engine with key 'eqs'.
        ocs_data: Result dict from OCS engine with key 'ocs' and 'confidence'.
        fraud_report: Result dict from fraud detector with 'risk_level' and 'flags'.
        dup_report: Result dict from duplicate detector with 'is_duplicate' and 'similarity'.

    Returns:
        dict: Decision dictionary containing decision, reason, confidence, visibility, priority_boost, next_actions.
    """
    # Extract helper fields safely whether dict or object
    def get_val(obj: Any, key: str, default: Any = None) -> Any:
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    is_blacklisted = bool(get_val(organizer, "is_blacklisted", False))
    events_hosted = int(get_val(organizer, "events_hosted", 0))
    registration_url = get_val(event, "registration_url", "")
    event_date = get_val(event, "event_date", None)

    ocs_score = float(ocs_data.get("ocs", 0.0))
    ocs_confidence = float(ocs_data.get("confidence", 0.0))
    eqs_score = float(eqs.get("eqs", eqs.get("quality_score", 0.0)))

    fraud_risk = fraud_report.get("risk_level", "low")
    fraud_flags = fraud_report.get("flags", [])

    is_dup = bool(dup_report.get("is_duplicate", False))
    dup_sim = float(dup_report.get("similarity", 0.0))

    # 1. HARD REJECTS (Non-negotiable)
    if is_blacklisted:
        return reject("Organizer is blacklisted")

    if fraud_risk == "high":
        flags_str = ", ".join(fraud_flags) if fraud_flags else "multiple risk signals"
        return reject(f"High fraud risk: {flags_str}")

    if is_dup and dup_sim > 0.95:
        return reject(f"Duplicate of existing event (similarity {round(dup_sim * 100, 1)}%)")

    if event_date:
        if isinstance(event_date, str):
            try:
                event_date = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
            except ValueError:
                pass
        if isinstance(event_date, datetime):
            # Ensure timezone comparison
            cur_now = _now()
            if event_date.tzinfo is None:
                event_date = event_date.replace(tzinfo=timezone.utc)
            if event_date < cur_now:
                return reject("Event date is in the past")

    if not registration_url or not is_valid_url(str(registration_url)):
        return reject("Invalid or missing registration URL")

    # 2. AUTO QUARANTINE (hidden until organizer improves trust)
    if ocs_score < 20.0 and events_hosted == 0:
        if eqs_score < 50.0:
            return quarantine("New unverified organizer with low event quality — needs identity or trust signals")

    # 3. AUTO FLAG (visible with limited reach, self-corrects over time)
    if eqs_score < 40.0:
        return flag(f"Low content quality score ({round(eqs_score, 1)}%)", visibility="limited")

    if fraud_risk == "medium":
        if fraud_flags == ["new_unverified_organizer"] and eqs_score >= 50.0:
            pass # Trust good quality events from new organizers
        else:
            flags_str = ", ".join(fraud_flags) if fraud_flags else "minor risk signals"
            return flag(f"Minor fraud indicators: {flags_str}", visibility="limited")

    if ocs_confidence < 0.40 and eqs_score < 50.0:
        return flag("Low confidence in organizer verification signals and borderline event quality", visibility="limited")

    # 4. AUTO APPROVE
    if ocs_score >= 70.0 and eqs_score >= 60.0:
        return approve(visibility="full", boost=1.2, reason="High organizer trust and strong event quality")

    if ocs_score >= 50.0 and eqs_score >= 50.0:
        return approve(visibility="full", boost=1.0, reason="Solid organizer trust and good event quality")

    if ocs_score >= 30.0:
        return approve(visibility="limited", boost=0.7, reason="Moderate organizer trust — approved with standard visibility")
        
    if eqs_score >= 50.0:
        return approve(visibility="limited", boost=0.5, reason="New or low-trust organizer with good event quality — approved with limited visibility")

    # 5. FALLBACK
    return flag("Insufficient trust signals and event quality to grant full approval", visibility="limited")
