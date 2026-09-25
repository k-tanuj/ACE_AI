"""Fraud, spam keywords, and suspicious content detector."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import structlog

from app.config import settings
from app.utils.link_validator import is_shortened_url, is_valid_url

logger = structlog.get_logger(__name__)


def _to_dt(dt_val: Any) -> Optional[datetime]:
    if not dt_val:
        return None
    if isinstance(dt_val, str):
        try:
            dt_val = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    return None


def detect_fraud(event: Any, organizer: Optional[Any] = None) -> Dict[str, Any]:
    """Detect fraudulent or suspicious patterns in event metadata and organizer profile.

    Flags evaluated:
        - spam_keywords: Contains prohibited promotional or scam keywords.
        - broken_link: Registration URL is missing or malformed.
        - shortened_link: Registration URL uses URL shorteners.
        - past_date: Event date is in the past.
        - invalid_deadline: Registration deadline is after event date.
        - new_unverified_organizer: Low OCS (<30) with zero hosted events.

    Args:
        event: Event instance or dictionary.
        organizer: Optional organizer instance.

    Returns:
        dict: Containing 'flags' (list of str) and 'risk_level' ('high', 'medium', or 'low').
    """
    flags: List[str] = []

    if not event:
        return {"flags": ["missing_event_data"], "risk_level": "high"}

    desc = (getattr(event, "description", "") or "").lower()
    reg_url = getattr(event, "registration_url", "") or ""
    event_date = getattr(event, "event_date", None)
    deadline = getattr(event, "registration_deadline", None)

    # 1. Spam keyword scanning
    if any(keyword.lower() in desc for keyword in settings.SPAM_KEYWORDS):
        flags.append("spam_keywords")

    # 2. Registration URL validation
    if not is_valid_url(reg_url):
        flags.append("broken_link")
    elif is_shortened_url(reg_url):
        flags.append("shortened_link")

    # 3. Date sanity checks
    now = datetime.now(timezone.utc)
    event_dt = _to_dt(event_date)
    deadline_dt = _to_dt(deadline)

    if event_dt and event_dt < now:
        flags.append("past_date")

    if event_dt and deadline_dt and deadline_dt > event_dt:
        flags.append("invalid_deadline")

    # 4. Organizer risk check
    org = organizer or getattr(event, "organizer", None)
    if org:
        ocs = float(getattr(org, "ocs", 0.0) or 0.0)
        events_hosted = int(getattr(org, "events_hosted", 0) or 0)
        if ocs < settings.TIER_NEW_CAUTION_MIN and events_hosted == 0:
            flags.append("new_unverified_organizer")
    else:
        flags.append("new_unverified_organizer")

    # Determine risk level
    if len(flags) >= 3:
        risk_level = "high"
    elif len(flags) >= 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    logger.debug(
        "fraud_detection_evaluated",
        event_id=str(getattr(event, "event_id", "")),
        flags=flags,
        risk_level=risk_level,
    )

    return {
        "flags": flags,
        "risk_level": risk_level,
    }
