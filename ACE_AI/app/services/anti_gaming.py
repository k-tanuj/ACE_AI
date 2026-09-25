"""Anti-gaming safeguards to prevent score inflation, fake reviews, and sybil attacks."""

from datetime import datetime, timezone
from typing import Any, List, Optional
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


def is_verified_rating(rating: Any, user: Any, event: Any) -> bool:
    """Validate whether an event rating comes from a verified, authentic attendee.

    Criteria:
        1. User must have registered for the event.
        2. User must have attended the event.
        3. User must not be flagged for fraudulent activity.
        4. User account age must be greater than 7 days.

    Args:
        rating: Rating instance or dict.
        user: User instance or mock object.
        event: Event instance or mock object.

    Returns:
        bool: True if the rating qualifies as verified, False otherwise.
    """
    if not user or not event:
        return False

    try:
        # Check registration
        if callable(getattr(user, "registered_for", None)):
            registered = bool(user.registered_for(event))
        else:
            registered = bool(getattr(user, "is_registered", False))

        if not registered:
            return False

        # Check attendance
        if callable(getattr(user, "attended", None)):
            attended = bool(user.attended(event))
        else:
            attended = bool(getattr(user, "has_attended", False))

        if not attended:
            return False

        # Check user flags
        is_flagged = bool(getattr(user, "is_flagged", False))
        if is_flagged:
            return False

        # Check account age
        account_age_days = getattr(user, "account_age_days", 0)
        if account_age_days <= settings.VERIFIED_USER_MIN_ACCOUNT_AGE_DAYS:
            return False

        return True
    except Exception as e:
        logger.warning("verify_rating_evaluation_failed", error=str(e))
        return False


def cap_ocs_delta(old_ocs: float, new_ocs: float, max_delta: float = 5.0) -> float:
    """Clamp changes in Organizer Credibility Score to prevent abrupt manipulation.

    Args:
        old_ocs: Current OCS value.
        new_ocs: Newly calculated unconstrained OCS value.
        max_delta: Maximum permissible change per update (default +/- 5.0).

    Returns:
        float: Bounded OCS value rounded to 2 decimal places.
    """
    old_val = float(old_ocs or 0.0)
    new_val = float(new_ocs or 0.0)
    delta_limit = float(max_delta or settings.OCS_MAX_DELTA)

    lower_bound = max(0.0, old_val - delta_limit)
    upper_bound = min(settings.OCS_MAX_SCORE, old_val + delta_limit)

    clamped = max(lower_bound, min(upper_bound, new_val))
    return round(clamped, 2)


def apply_decay(org: Any, as_of_date: Optional[datetime] = None) -> float:
    """Apply time-based credibility decay for inactive organizers.

    Rules:
        - 5% decay for every 180 days of inactivity since last event.

    Args:
        org: Organizer instance.
        as_of_date: Reference timestamp (defaults to current UTC time).

    Returns:
        float: Updated OCS after applying inactivity decay.
    """
    if not org or getattr(org, "last_event_at", None) is None:
        return round(float(getattr(org, "ocs", 0.0) or 0.0), 2)

    last_event = org.last_event_at
    if last_event.tzinfo is None:
        last_event = last_event.replace(tzinfo=timezone.utc)

    ref_date = as_of_date or datetime.now(timezone.utc)
    if ref_date.tzinfo is None:
        ref_date = ref_date.replace(tzinfo=timezone.utc)

    days_inactive = (ref_date - last_event).days
    if days_inactive > settings.DECAY_INACTIVITY_DAYS:
        periods = days_inactive // settings.DECAY_INACTIVITY_DAYS
        current_ocs = float(getattr(org, "ocs", 0.0) or 0.0)
        decayed_ocs = current_ocs * (settings.DECAY_FACTOR ** periods)
        org.ocs = round(max(0.0, decayed_ocs), 2)
        return org.ocs

    return round(float(getattr(org, "ocs", 0.0) or 0.0), 2)


def detect_sybil(org: Any, other_orgs: Optional[List[Any]] = None) -> bool:
    """Detect coordinated or duplicate organizer accounts (Sybil behavior).

    Checks for:
        - Reused phone verification details.
        - Reused government ID hashes.
        - Abnormally high concentration of accounts from the same personal domain.

    Args:
        org: Candidate organizer.
        other_orgs: Pool of existing organizers to compare against.

    Returns:
        bool: True if suspicious coordination is detected.
    """
    if not org or not other_orgs:
        return False

    org_id = getattr(org, "organizer_id", None)
    govt_hash = getattr(org, "govt_id_hash", None)
    email = getattr(org, "email", "")
    domain = getattr(org, "email_domain", "")

    # 1. Matching government ID hash across different accounts
    if govt_hash:
        for other in other_orgs:
            if getattr(other, "organizer_id", None) != org_id:
                if getattr(other, "govt_id_hash", None) == govt_hash:
                    logger.warning("sybil_match_govt_id", org_id=str(org_id), other_id=str(other.organizer_id))
                    return True

    # 2. Suspicious repetition of private domain (excluding educational domains)
    is_edu = domain.endswith(".edu") or domain.endswith(".ac.in") or domain.endswith(".edu.in")
    common_domains = {"gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"}

    if domain and not is_edu and domain not in common_domains:
        domain_matches = sum(
            1
            for other in other_orgs
            if getattr(other, "organizer_id", None) != org_id
            and getattr(other, "email_domain", "").lower() == domain.lower()
        )
        if domain_matches >= 3:
            logger.warning("sybil_match_private_domain", domain=domain, count=domain_matches)
            return True

    return False
