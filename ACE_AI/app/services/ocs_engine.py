"""Organizer Credibility Score (OCS) engine.

Computes multi-layer credibility metrics from 5 signal layers:
1. Identity Verification (Max 70)
2. Historical Performance (Max 50)
3. Event Content Quality (Max 35)
4. Community Feedback (Range -35 to +30)
5. External Validation (Max 45)

Pure functions for mathematical scoring; database persistence is isolated to `persist_ocs()`.
"""

import statistics
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
import structlog

from app.config import settings
from app.models.organizer import Organizer
from app.models.trust_audit import TrustAudit
from app.services.anti_gaming import cap_ocs_delta
from app.services.trust_tiers import assign_tier
from app.utils.link_validator import is_valid_url
from app.utils.text_quality import analyze_text_quality

logger = structlog.get_logger(__name__)

# Maximum possible raw composite score: 0.25*70 + 0.30*50 + 0.15*35 + 0.15*30 + 0.15*45 = 49.0
MAX_THEORETICAL_RAW = (
    settings.OCS_WEIGHT_IDENTITY * settings.IDENTITY_MAX_SCORE
    + settings.OCS_WEIGHT_HISTORICAL * settings.HISTORICAL_MAX_SCORE
    + settings.OCS_WEIGHT_CONTENT * settings.CONTENT_MAX_SCORE
    + settings.OCS_WEIGHT_COMMUNITY * settings.COMMUNITY_MAX_SCORE
    + settings.OCS_WEIGHT_EXTERNAL * settings.EXTERNAL_MAX_SCORE
)


def identity_score(org: Any) -> float:
    """Compute identity verification score layer (Max 70 points).

    Signals:
        - Educational domain (.edu, .ac.in, .edu.in): +10
        - Phone verified: +5
        - Official email verified: +15
        - Government ID hash present: +20
        - Institution registration verified: +15
        - LinkedIn active: +5

    Args:
        org: Organizer instance or data object.

    Returns:
        float: Computed score capped at 70.0.
    """
    if not org:
        return 0.0

    score = 0.0

    # 1. Email domain check
    domain = (getattr(org, "email_domain", "") or "").lower().strip()
    email = (getattr(org, "email", "") or "").lower().strip()
    if (
        domain.endswith(".edu")
        or domain.endswith(".ac.in")
        or domain.endswith(".edu.in")
        or email.endswith(".edu")
        or email.endswith(".ac.in")
        or email.endswith(".edu.in")
    ):
        score += settings.IDENTITY_EDU_DOMAIN_POINTS

    # 2. Phone verification
    if getattr(org, "phone_verified", False):
        score += settings.IDENTITY_PHONE_VERIFIED_POINTS

    # 3. Official email verification
    if getattr(org, "official_email_verified", False):
        score += settings.IDENTITY_OFFICIAL_EMAIL_POINTS

    # 4. Government ID hash present
    govt_hash = getattr(org, "govt_id_hash", None)
    if govt_hash and str(govt_hash).strip():
        score += settings.IDENTITY_GOVT_ID_POINTS

    # 5. Institution registration verified
    if getattr(org, "institution_reg_verified", False):
        score += settings.IDENTITY_INSTITUTION_REG_POINTS

    # 6. Active LinkedIn profile
    if getattr(org, "linkedin_active", False):
        score += settings.IDENTITY_LINKEDIN_ACTIVE_POINTS

    return round(min(score, settings.IDENTITY_MAX_SCORE), 2)


def historical_score(org: Any) -> float:
    """Compute historical performance score layer (Max 50 points).

    Signals:
        - If events_hosted == 0: return 0.0
        - events_hosted contribution: min(events_hosted, 10) * 0.5
        - success_rate contribution: (successful_events / events_hosted) * 15
        - rating contribution: (avg_rating / 5.0) * 20
        - repeat_participant_rate: repeat_participant_rate * 10
        - penalties: complaint_rate * 15, cancellation_rate * 10

    Args:
        org: Organizer instance or data object.

    Returns:
        float: Computed score clamped between 0.0 and 50.0.
    """
    if not org:
        return 0.0

    events_hosted = int(getattr(org, "events_hosted", 0) or 0)
    if events_hosted <= 0:
        return 0.0

    successful_events = int(getattr(org, "successful_events", 0) or 0)
    avg_rating = float(getattr(org, "avg_rating", 0.0) or 0.0)
    repeat_rate = float(getattr(org, "repeat_participant_rate", 0.0) or 0.0)
    complaint_count = int(getattr(org, "complaint_count", 0) or 0)
    cancellation_count = int(getattr(org, "cancellation_count", 0) or 0)

    # 1. Hosted events count contribution
    hosted_contrib = min(events_hosted, settings.HISTORICAL_EVENT_CAP) * settings.HISTORICAL_EVENT_MULTIPLIER

    # 2. Success rate contribution
    success_rate = min(1.0, max(0.0, successful_events / events_hosted))
    success_contrib = success_rate * settings.HISTORICAL_SUCCESS_RATE_WEIGHT

    # 3. Rating contribution
    rating_clamped = min(5.0, max(0.0, avg_rating))
    rating_contrib = (rating_clamped / 5.0) * settings.HISTORICAL_RATING_WEIGHT

    # 4. Repeat participant rate contribution
    repeat_clamped = min(1.0, max(0.0, repeat_rate))
    repeat_contrib = repeat_clamped * settings.HISTORICAL_REPEAT_RATE_WEIGHT

    # 5. Penalties
    complaint_rate = complaint_count / events_hosted
    cancellation_rate = cancellation_count / events_hosted
    penalties = (
        complaint_rate * settings.HISTORICAL_COMPLAINT_RATE_PENALTY
        + cancellation_rate * settings.HISTORICAL_CANCELLATION_RATE_PENALTY
    )

    raw_score = hosted_contrib + success_contrib + rating_contrib + repeat_contrib - penalties
    clamped_score = max(0.0, min(settings.HISTORICAL_MAX_SCORE, raw_score))
    return round(clamped_score, 2)


def content_score(event: Any) -> float:
    """Compute content quality score for an individual event (Max 35 points).

    Signals:
        - complete fields: +10
        - description > 200 chars: +5
        - spam keywords present: -10
        - valid registration link: +10
        - original image (not stock): +5
        - grammar quality > 0.8: +5

    Args:
        event: Event instance or dict.

    Returns:
        float: Computed score clamped between 0.0 and 35.0.
    """
    if not event:
        return 0.0

    score = 0.0
    title = getattr(event, "title", "") or ""
    description = getattr(event, "description", "") or ""
    reg_url = getattr(event, "registration_url", "") or ""
    is_original_image = getattr(event, "is_original_image", True)

    # 1. Complete fields check
    has_title = bool(title.strip())
    has_desc = bool(description.strip())
    has_venue = bool(getattr(event, "venue", None) or getattr(event, "location", None))
    has_date = bool(getattr(event, "event_date", None))
    has_deadline = bool(getattr(event, "registration_deadline", None))
    has_reg_url = bool(reg_url.strip())

    if has_title and has_desc and has_venue and has_date and has_deadline and has_reg_url:
        score += settings.CONTENT_COMPLETE_FIELDS_POINTS

    # 2. Description length
    desc_analysis = analyze_text_quality(description)
    if desc_analysis["length"] > settings.CONTENT_DESC_MIN_CHARS:
        score += settings.CONTENT_DESC_POINTS

    # 3. Spam keywords penalty
    desc_lower = description.lower()
    has_spam = any(keyword.lower() in desc_lower for keyword in settings.SPAM_KEYWORDS)
    if has_spam:
        score -= settings.CONTENT_SPAM_PENALTY

    # 4. Valid registration link
    if is_valid_url(reg_url):
        score += settings.CONTENT_VALID_LINK_POINTS

    # 5. Original image
    if is_original_image:
        score += settings.CONTENT_ORIGINAL_IMAGE_POINTS

    # 6. Grammar quality
    if desc_analysis["grammar_quality"] > settings.CONTENT_GRAMMAR_THRESHOLD:
        score += settings.CONTENT_GRAMMAR_POINTS

    clamped_score = max(0.0, min(settings.CONTENT_MAX_SCORE, score))
    return round(clamped_score, 2)


def community_score(org: Any) -> float:
    """Compute community reputation and feedback score layer (Range -35.0 to +30.0).

    Signals:
        - student_reports: -20
        - admin_flags: -15
        - peer_endorsements: +10
        - social_proof: +5
        - college_affiliation: +15

    Args:
        org: Organizer instance or data object.

    Returns:
        float: Computed score clamped between -35.0 and +30.0.
    """
    if not org:
        return 0.0

    student_reports = int(getattr(org, "student_reports", 0) or 0)
    admin_flags = int(getattr(org, "admin_flags", 0) or 0)
    peer_endorsements = float(getattr(org, "peer_endorsements", 0.0) or 0.0)
    social_proof = bool(getattr(org, "social_proof", False))
    college_affiliation = bool(getattr(org, "college_affiliation", False))

    penalties = (
        student_reports * settings.COMMUNITY_STUDENT_REPORT_PENALTY
        + admin_flags * settings.COMMUNITY_ADMIN_FLAG_PENALTY
    )

    positives = (
        min(peer_endorsements, 1.0) * settings.COMMUNITY_PEER_ENDORSEMENT_POINTS
        + (settings.COMMUNITY_SOCIAL_PROOF_POINTS if social_proof else 0.0)
        + (settings.COMMUNITY_COLLEGE_AFFILIATION_POINTS if college_affiliation else 0.0)
    )

    raw_score = positives - penalties
    clamped_score = max(settings.COMMUNITY_MIN_SCORE, min(settings.COMMUNITY_MAX_SCORE, raw_score))
    return round(clamped_score, 2)


def external_score(org: Any) -> float:
    """Compute external validation and internet footprint score (Max 45 points).

    Signals:
        - college_website_match: +15
        - linkedin active: +10
        - cross-platform presence (Eventbrite/Meetup): +10
        - news mentions: +5
        - domain age > 2 years: +5

    Args:
        org: Organizer instance or data object.

    Returns:
        float: Computed score capped at 45.0.
    """
    if not org:
        return 0.0

    score = 0.0

    if getattr(org, "college_website_match", False):
        score += settings.EXTERNAL_COLLEGE_WEBSITE_MATCH_POINTS

    if getattr(org, "linkedin_active", False):
        score += settings.EXTERNAL_LINKEDIN_ACTIVE_POINTS

    if getattr(org, "cross_platform_presence", False):
        score += settings.EXTERNAL_CROSS_PLATFORM_POINTS

    if getattr(org, "news_mentions", False):
        score += settings.EXTERNAL_NEWS_MENTIONS_POINTS

    domain_age = float(getattr(org, "domain_age_years", 0.0) or 0.0)
    if domain_age > settings.EXTERNAL_DOMAIN_AGE_THRESHOLD_YEARS:
        score += settings.EXTERNAL_DOMAIN_AGE_POINTS

    return round(min(score, settings.EXTERNAL_MAX_SCORE), 2)


def compute_confidence(org: Any) -> float:
    """Compute confidence level (0.0 to 1.0) based on data completeness.

    Args:
        org: Organizer instance.

    Returns:
        float: Confidence metric between 0.0 and 1.0.
    """
    if not org:
        return 0.0

    points = 0.0
    if getattr(org, "phone_verified", False):
        points += 0.20
    if getattr(org, "official_email_verified", False):
        points += 0.20
    if getattr(org, "govt_id_hash", None):
        points += 0.25

    events_hosted = int(getattr(org, "events_hosted", 0) or 0)
    if events_hosted > 0:
        points += min(events_hosted / 5.0, 1.0) * 0.20

    if getattr(org, "college_website_match", False) or getattr(org, "linkedin_active", False):
        points += 0.15

    return round(max(0.0, min(1.0, points)), 2)


def compute_ocs(org: Any, events: Optional[List[Any]] = None) -> Dict[str, Any]:
    """Compute the multi-layered Organizer Credibility Score (0.0 - 100.0).

    Weighted composite formula:
        raw = 0.25*identity + 0.30*historical + 0.15*content + 0.15*community + 0.15*external
        normalized_ocs = (raw / MAX_THEORETICAL_RAW) * 100.0

    Discounts:
        - If has_fraud_history: OCS *= 0.30
        - If is_blacklisted: OCS = 0.0

    Args:
        org: Organizer instance.
        events: Optional list of events hosted by the organizer.

    Returns:
        dict: OCS evaluation containing ocs, tier, confidence, and signal breakdown.
    """
    events = events or []

    identity = identity_score(org)
    historical = historical_score(org)
    content = statistics.mean([content_score(e) for e in events]) if events else 0.0
    community = community_score(org)
    external = external_score(org)

    raw = (
        settings.OCS_WEIGHT_IDENTITY * identity
        + settings.OCS_WEIGHT_HISTORICAL * historical
        + settings.OCS_WEIGHT_CONTENT * content
        + settings.OCS_WEIGHT_COMMUNITY * community
        + settings.OCS_WEIGHT_EXTERNAL * external
    )

    # Scale relative to max theoretical raw (49.0) so perfect signals reach ~100.0
    scaled = (raw / MAX_THEORETICAL_RAW) * settings.OCS_MAX_SCORE if MAX_THEORETICAL_RAW > 0 else 0.0

    if getattr(org, "has_fraud_history", False):
        scaled *= settings.FRAUD_HISTORY_MULTIPLIER

    is_blacklisted = bool(getattr(org, "is_blacklisted", False))
    if is_blacklisted:
        scaled = settings.BLACKLIST_SCORE

    ocs = round(max(0.0, min(settings.OCS_MAX_SCORE, scaled)), 2)
    tier = assign_tier(ocs, is_blacklisted=is_blacklisted)
    confidence = compute_confidence(org)

    return {
        "ocs": ocs,
        "tier": tier,
        "confidence": confidence,
        "signals": {
            "identity": round(identity, 2),
            "historical": round(historical, 2),
            "content": round(content, 2),
            "community": round(community, 2),
            "external": round(external, 2),
        },
    }


def persist_ocs(db: Session, org: Organizer, new_ocs_data: Dict[str, Any], reason: str, event_id: Optional[Any] = None) -> Organizer:
    """Persist updated OCS to the database, enforcing the delta cap and logging an audit record.

    Args:
        db: SQLAlchemy database session.
        org: Organizer ORM instance.
        new_ocs_data: Result dictionary from `compute_ocs()`.
        reason: Justification string for the audit log.
        event_id: Optional UUID of the event prompting the update.

    Returns:
        Organizer: Updated and refreshed organizer instance.
    """
    old_ocs = float(org.ocs or 0.0)
    target_ocs = float(new_ocs_data.get("ocs", 0.0))

    # Apply anti-gaming delta cap (+/- 5.0 points)
    capped_ocs = cap_ocs_delta(old_ocs, target_ocs, max_delta=settings.OCS_MAX_DELTA)
    delta = round(capped_ocs - old_ocs, 2)

    org.ocs = capped_ocs
    org.tier = assign_tier(capped_ocs, is_blacklisted=org.is_blacklisted)
    org.confidence = float(new_ocs_data.get("confidence", org.confidence))

    # Create audit record
    audit_entry = TrustAudit(
        organizer_id=org.organizer_id,
        event_id=event_id,
        event_type="ocs_update",
        delta=delta,
        reason=reason,
        confidence=org.confidence,
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(org)

    logger.info(
        "ocs_persisted",
        organizer_id=str(org.organizer_id),
        old_ocs=old_ocs,
        new_ocs=capped_ocs,
        delta=delta,
        reason=reason,
    )
    return org
