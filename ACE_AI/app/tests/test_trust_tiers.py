"""Unit tests for trust tier assignments and exact boundary transitions."""

import pytest
from app.services.trust_tiers import assign_tier, auto_approval_recommendation


@pytest.mark.parametrize(
    "score,expected_tier",
    [
        (0.0, "High Risk"),
        (29.0, "High Risk"),
        (29.99, "High Risk"),
        (30.0, "New/Caution"),
        (49.0, "New/Caution"),
        (49.99, "New/Caution"),
        (50.0, "Established"),
        (69.0, "Established"),
        (69.99, "Established"),
        (70.0, "Trusted"),
        (84.0, "Trusted"),
        (84.99, "Trusted"),
        (85.0, "Verified Partner"),
        (100.0, "Verified Partner"),
    ],
)
def test_exact_tier_boundaries(score: float, expected_tier: str):
    """Test exact threshold cutoffs at 29/30, 49/50, 69/70, 84/85."""
    assert assign_tier(score) == expected_tier


def test_banned_tier_for_blacklisted():
    """Test that blacklisted organizers always receive 'Banned' tier regardless of score."""
    assert assign_tier(95.0, is_blacklisted=True) == "Banned"
    assert assign_tier(0.0, is_blacklisted=True) == "Banned"


def test_auto_approval_recommendation_rules():
    """Test all 5 decision branches in auto_approval_recommendation."""
    # 1. Reject on duplicate
    rec_dupe = auto_approval_recommendation(ocs=95.0, eqs=90.0, confidence=0.9, is_duplicate=True)
    assert rec_dupe["decision"] == "REJECT"
    assert rec_dupe["priority"] == "high"

    # 2. Reject on spam flags
    rec_spam = auto_approval_recommendation(
        ocs=95.0, eqs=90.0, confidence=0.9, spam_flags=["spam_keywords"]
    )
    assert rec_spam["decision"] == "REJECT"

    # 3. Full auto-approval: OCS >= 85, EQS >= 75, confidence >= 0.8
    rec_auto = auto_approval_recommendation(ocs=86.0, eqs=78.0, confidence=0.85)
    assert rec_auto["decision"] == "AUTO_APPROVE"
    assert rec_auto["priority"] == "low"

    # 4. Spot check: OCS >= 70, EQS >= 60
    rec_spot = auto_approval_recommendation(ocs=72.0, eqs=65.0, confidence=0.5)
    assert rec_spot["decision"] == "AUTO_APPROVE_WITH_SPOT_CHECK"
    assert rec_spot["priority"] == "low"

    # 5. Auto flag: OCS >= 30
    rec_flag = auto_approval_recommendation(ocs=55.0, eqs=50.0, confidence=0.5)
    assert rec_flag["decision"] == "AUTO_FLAG"
    assert rec_flag["priority"] == "medium"

    # 6. Auto quarantine: OCS < 30
    rec_quarantine = auto_approval_recommendation(ocs=20.0, eqs=50.0, confidence=0.4)
    assert rec_quarantine["decision"] == "AUTO_QUARANTINE"
    assert rec_quarantine["priority"] == "high"
