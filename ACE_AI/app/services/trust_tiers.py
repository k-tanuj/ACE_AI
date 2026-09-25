"""Trust tier assignment and automated event approval recommendation logic."""

from typing import Any, Dict, List, Optional
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


def assign_tier(ocs: float, is_blacklisted: bool = False) -> str:
    """Assign a trust tier category based on the computed Organizer Credibility Score.

    Tier boundaries:
        - Blacklisted: "Banned"
        - 85 - 100: "Verified Partner"
        - 70 - 84.99: "Trusted"
        - 50 - 69.99: "Established"
        - 30 - 49.99: "New/Caution"
        - 0 - 29.99: "High Risk"

    Args:
        ocs: The computed Organizer Credibility Score (0.0 - 100.0).
        is_blacklisted: Whether the organizer has been blacklisted.

    Returns:
        str: Human-readable trust tier classification.
    """
    if is_blacklisted:
        return "Banned"

    score = round(float(ocs), 2)
    if score >= settings.TIER_VERIFIED_PARTNER_MIN:
        return "Verified Partner"
    elif score >= settings.TIER_TRUSTED_MIN:
        return "Trusted"
    elif score >= settings.TIER_ESTABLISHED_MIN:
        return "Established"
    elif score >= settings.TIER_NEW_CAUTION_MIN:
        return "New/Caution"
    else:
        return "High Risk"


def auto_approval_recommendation(
    ocs: float,
    eqs: float,
    confidence: float,
    spam_flags: Optional[List[str]] = None,
    is_duplicate: bool = False,
) -> Dict[str, str]:
    """Determine automated approval recommendations for an event based on multi-signal scoring.

    Rules:
        - Any spam flag OR duplicate -> REJECT (high priority)
        - OCS >= 85 AND EQS >= 75 AND confidence >= 0.8 -> AUTO_APPROVE (low priority)
        - OCS >= 70 AND EQS >= 60 -> AUTO_APPROVE_WITH_SPOT_CHECK (low priority)
        - OCS >= 50 -> MANUAL_REVIEW (medium priority)
        - OCS < 50 -> MANUAL_REVIEW_HIGH_PRIORITY (high priority)

    Args:
        ocs: Organizer Credibility Score.
        eqs: Event Quality Score.
        confidence: Organizer data confidence metric (0.0 to 1.0).
        spam_flags: List of detected spam/fraud indicators.
        is_duplicate: Whether the event has been detected as a duplicate.

    Returns:
        dict: Containing 'decision', 'reason', and 'priority'.
    """
    spam_flags = spam_flags or []

    # Priority 1: Instant rejection on duplicate or spam flags
    if is_duplicate:
        return {
            "decision": "REJECT",
            "reason": "Event detected as duplicate of an existing event.",
            "priority": "high",
        }

    if len(spam_flags) > 0:
        flags_str = ", ".join(spam_flags)
        return {
            "decision": "REJECT",
            "reason": f"Event contains active spam or fraud indicators: {flags_str}.",
            "priority": "high",
        }

    # Priority 2: Full Auto-approval for highly credible organizers with high quality events
    if (
        ocs >= settings.AUTO_APPROVE_OCS_MIN
        and eqs >= settings.AUTO_APPROVE_EQS_MIN
        and confidence >= settings.AUTO_APPROVE_CONFIDENCE_MIN
    ):
        return {
            "decision": "AUTO_APPROVE",
            "reason": (
                f"Eligible for auto-approval: OCS ({ocs:.1f} >= {settings.AUTO_APPROVE_OCS_MIN}), "
                f"EQS ({eqs:.1f} >= {settings.AUTO_APPROVE_EQS_MIN}), "
                f"confidence ({confidence:.2f} >= {settings.AUTO_APPROVE_CONFIDENCE_MIN})."
            ),
            "priority": "low",
        }

    # Priority 3: Spot-check auto-approval for trusted organizers
    if ocs >= settings.SPOT_CHECK_OCS_MIN and eqs >= settings.SPOT_CHECK_EQS_MIN:
        return {
            "decision": "AUTO_APPROVE_WITH_SPOT_CHECK",
            "reason": (
                f"Approved with spot-check sampling: OCS ({ocs:.1f} >= {settings.SPOT_CHECK_OCS_MIN}), "
                f"EQS ({eqs:.1f} >= {settings.SPOT_CHECK_EQS_MIN})."
            ),
            "priority": "low",
        }

    # Priority 4: Autonomous Flagging for moderate trust
    if ocs >= 30.0:
        return {
            "decision": "AUTO_FLAG",
            "reason": (
                f"Auto-flagged with limited visibility: Organizer OCS ({ocs:.1f}) "
                f"or event EQS ({eqs:.1f}) below full approval threshold."
            ),
            "priority": "medium",
        }

    # Priority 5: Autonomous Quarantine for low credibility / high risk
    return {
        "decision": "AUTO_QUARANTINE",
        "reason": f"High risk quarantine: Organizer OCS ({ocs:.1f} < 30.0) indicates unverified status.",
        "priority": "high",
    }
