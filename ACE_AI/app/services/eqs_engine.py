"""Event Quality Score (EQS) engine.

Evaluates an event across five dimensions:
1. Field Completeness (30%)
2. Organizer Credibility (25%)
3. Description Quality & Readability (20%)
4. Verification Status (15%)
5. User Safety & Report History (10%)
"""

from typing import Any, Dict, Optional
import structlog

from app.config import settings
from app.utils.text_quality import analyze_text_quality

logger = structlog.get_logger(__name__)


def compute_eqs(event: Any, organizer: Optional[Any] = None) -> Dict[str, Any]:
    """Compute the Event Quality Score (EQS) and return a granular breakdown.

    Formula:
        eqs = (
            0.30 * completeness
            + 0.25 * organizer_credibility
            + 0.20 * description_quality
            + 0.15 * verification_status
            + 0.10 * user_reports_score
        )

    Args:
        event: Event instance or dictionary.
        organizer: Optional organizer instance. If omitted, attempts to read from event.organizer.

    Returns:
        dict: Containing 'eqs' (float) and 'breakdown' (dict).
    """
    if not event:
        return {
            "eqs": 0.0,
            "breakdown": {
                "completeness": 0.0,
                "organizer_credibility": 0.0,
                "description_quality": 0.0,
                "verification_status": 0.0,
                "user_reports_score": 0.0,
            },
        }

    # 1. Field Completeness (0 - 100)
    required_checks = [
        bool(getattr(event, "title", None) and str(getattr(event, "title", "")).strip()),
        bool(getattr(event, "description", None) and str(getattr(event, "description", "")).strip()),
        bool(getattr(event, "category", None)),
        bool(getattr(event, "event_date", None)),
        bool(getattr(event, "registration_deadline", None)),
        bool(getattr(event, "venue", None) or getattr(event, "location", None)),
        bool(getattr(event, "registration_url", None) and str(getattr(event, "registration_url", "")).strip()),
        bool(getattr(event, "banner_url", None) or getattr(event, "tags", None)),
    ]
    completeness = round((sum(1 for c in required_checks if c) / len(required_checks)) * 100.0, 2)

    # 2. Organizer Credibility (0 - 100)
    org = organizer or getattr(event, "organizer", None)
    if org:
        organizer_credibility = round(float(getattr(org, "ocs", 0.0) or 0.0), 2)
    else:
        organizer_credibility = 0.0

    # 3. Description Quality & Readability (0 - 100)
    desc = getattr(event, "description", "") or ""
    text_analysis = analyze_text_quality(desc)
    desc_quality = round(float(text_analysis.get("readability_score", 0.0)), 2)

    # 4. Verification Status (0, 50, 100)
    status = (getattr(event, "verification_status", "pending") or "pending").lower()
    if status in ("approved", "verified"):
        verif_score = 100.0
    elif status == "pending":
        verif_score = 50.0
    else:  # rejected, unverified, etc.
        verif_score = 0.0

    # 5. User Reports Score (0 - 100)
    reports = int(getattr(event, "user_reports_count", 0) or 0)
    user_reports_score = round(max(0.0, min(100.0, 100.0 - (reports * settings.EQS_USER_REPORT_PENALTY))), 2)

    # Weighted Composite EQS
    raw_eqs = (
        settings.EQS_WEIGHT_COMPLETENESS * completeness
        + settings.EQS_WEIGHT_ORGANIZER_OCS * organizer_credibility
        + settings.EQS_WEIGHT_DESC_QUALITY * desc_quality
        + settings.EQS_WEIGHT_VERIFICATION_STATUS * verif_score
        + settings.EQS_WEIGHT_USER_REPORTS * user_reports_score
    )
    eqs = round(max(0.0, min(100.0, raw_eqs)), 2)

    return {
        "eqs": eqs,
        "breakdown": {
            "completeness": completeness,
            "organizer_credibility": organizer_credibility,
            "description_quality": desc_quality,
            "verification_status": verif_score,
            "user_reports_score": user_reports_score,
        },
    }
