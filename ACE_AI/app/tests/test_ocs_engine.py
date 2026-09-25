"""Unit tests for the Organizer Credibility Score (OCS) engine."""

import uuid
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.organizer import Organizer
from app.models.trust_audit import TrustAudit
from app.services.ocs_engine import (
    community_score,
    compute_confidence,
    compute_ocs,
    content_score,
    external_score,
    historical_score,
    identity_score,
    persist_ocs,
)


def test_zero_state_organizer_ocs(new_organizer: Organizer):
    """Test that a new organizer with no verifications or history gets OCS = 0."""
    result = compute_ocs(new_organizer, events=[])
    assert result["ocs"] == 0.0
    assert result["tier"] == "High Risk"  # 0-29 is High Risk
    assert result["confidence"] == 0.0
    assert result["signals"]["identity"] == 0.0
    assert result["signals"]["historical"] == 0.0
    assert result["signals"]["content"] == 0.0
    assert result["signals"]["community"] == 0.0
    assert result["signals"]["external"] == 0.0


def test_perfect_organizer_ocs(perfect_organizer: Organizer, sample_event: Event):
    """Test that an organizer with full verifications and 10 successful events achieves OCS ≈ 100."""
    events = [sample_event] * 10
    result = compute_ocs(perfect_organizer, events=events)
    assert result["ocs"] >= 99.0
    assert result["ocs"] <= 100.0
    assert result["tier"] == "Verified Partner"
    assert result["confidence"] >= 0.90
    assert result["signals"]["identity"] == 70.0
    assert result["signals"]["historical"] == 50.0
    assert result["signals"]["content"] == 35.0
    assert result["signals"]["community"] == 30.0
    assert result["signals"]["external"] == 45.0


def test_fraud_history_discount(perfect_organizer: Organizer, sample_event: Event):
    """Test that having fraud history applies a 70% reduction (OCS *= 0.3)."""
    events = [sample_event] * 10
    base_result = compute_ocs(perfect_organizer, events=events)

    perfect_organizer.has_fraud_history = True
    fraud_result = compute_ocs(perfect_organizer, events=events)

    expected = round(base_result["ocs"] * 0.30, 2)
    assert abs(fraud_result["ocs"] - expected) <= 0.05
    assert fraud_result["tier"] in ("New/Caution", "High Risk")


def test_blacklisted_organizer_ocs(perfect_organizer: Organizer, sample_event: Event):
    """Test that blacklisted organizers strictly receive OCS = 0 and tier = Banned."""
    perfect_organizer.is_blacklisted = True
    result = compute_ocs(perfect_organizer, events=[sample_event])
    assert result["ocs"] == 0.0
    assert result["tier"] == "Banned"


def test_identity_score_breakdown():
    """Test individual signal additions in identity scoring."""
    org = Organizer(
        email="test@stanford.edu",
        email_domain="stanford.edu",
        phone_verified=True,
        official_email_verified=True,
        govt_id_hash="hash123",
        institution_reg_verified=True,
        linkedin_active=True,
    )
    score = identity_score(org)
    # 10 (edu) + 5 (phone) + 15 (official) + 20 (id) + 15 (reg) + 5 (linkedin) = 70.0
    assert score == 70.0


def test_historical_score_division_by_zero_safety():
    """Test historical scoring handles 0 hosted events safely."""
    org = Organizer(events_hosted=0, successful_events=0, avg_rating=0.0)
    score = historical_score(org)
    assert score == 0.0


def test_historical_score_penalties():
    """Test that complaints and cancellations reduce historical score."""
    good_org = Organizer(
        events_hosted=10,
        successful_events=10,
        avg_rating=5.0,
        repeat_participant_rate=1.0,
        complaint_count=0,
        cancellation_count=0,
    )
    bad_org = Organizer(
        events_hosted=10,
        successful_events=8,
        avg_rating=3.0,
        repeat_participant_rate=0.2,
        complaint_count=5,  # 50% complaint rate
        cancellation_count=2,  # 20% cancellation rate
    )
    assert historical_score(good_org) == 50.0
    assert historical_score(bad_org) < historical_score(good_org)


def test_community_score_negative_range():
    """Test that community score can plunge into negative points under reports and flags."""
    reported_org = Organizer(
        student_reports=3,  # 3 * -20 = -60
        admin_flags=2,  # 2 * -15 = -30
        peer_endorsements=0.0,
        social_proof=False,
        college_affiliation=False,
    )
    score = community_score(reported_org)
    assert score == -35.0  # Capped at minimum -35.0


def test_persist_ocs_records_audit(db_session: Session, new_organizer: Organizer):
    """Test that persist_ocs writes changes, caps delta, and creates a TrustAudit log."""
    db_session.add(new_organizer)
    db_session.commit()
    db_session.refresh(new_organizer)

    initial_ocs = new_organizer.ocs
    new_data = {
        "ocs": 80.0,  # Jump of 80 points
        "tier": "Trusted",
        "confidence": 0.85,
    }

    updated_org = persist_ocs(db_session, new_organizer, new_data, reason="Test bulk verification")

    # Anti-gaming delta cap allows max +5.0 per update
    assert updated_org.ocs == initial_ocs + 5.0

    # Audit record check
    audit = db_session.query(TrustAudit).filter_by(organizer_id=new_organizer.organizer_id).first()
    assert audit is not None
    assert audit.delta == 5.0
    assert audit.reason == "Test bulk verification"
    assert audit.event_type == "ocs_update"
