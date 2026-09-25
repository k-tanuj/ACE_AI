"""Unit tests for anti-gaming safeguards, delta caps, decay, and Sybil detection."""

from datetime import datetime, timedelta, timezone
import uuid
from app.models.organizer import Organizer
from app.services.anti_gaming import (
    apply_decay,
    cap_ocs_delta,
    detect_sybil,
    is_verified_rating,
)


class MockUser:
    """Mock user object to test rating verification gating."""
    def __init__(
        self,
        is_registered: bool = True,
        has_attended: bool = True,
        is_flagged: bool = False,
        account_age_days: int = 15,
    ):
        self._registered = is_registered
        self._attended = has_attended
        self.is_flagged = is_flagged
        self.account_age_days = account_age_days

    def registered_for(self, event):
        return self._registered

    def attended(self, event):
        return self._attended


def test_cap_ocs_delta_clamps_within_bounds():
    """Test that OCS updates are constrained to a maximum change of +/- 5.0 points."""
    # Upward jump of +30 points capped to +5.0
    assert cap_ocs_delta(old_ocs=50.0, new_ocs=80.0, max_delta=5.0) == 55.0

    # Downward drop of -20 points capped to -5.0
    assert cap_ocs_delta(old_ocs=50.0, new_ocs=30.0, max_delta=5.0) == 45.0

    # Small legitimate change (+2.5) allowed in full
    assert cap_ocs_delta(old_ocs=50.0, new_ocs=52.5, max_delta=5.0) == 52.5

    # Boundary caps at 0.0 and 100.0
    assert cap_ocs_delta(old_ocs=98.0, new_ocs=105.0, max_delta=5.0) == 100.0
    assert cap_ocs_delta(old_ocs=2.0, new_ocs=-10.0, max_delta=5.0) == 0.0


def test_inactivity_decay_after_180_days(perfect_organizer: Organizer):
    """Test that inactivity over 180 days triggers a 5% decay on OCS."""
    now = datetime.now(timezone.utc)
    perfect_organizer.ocs = 100.0

    # 1. Active recently (30 days ago) -> No decay
    perfect_organizer.last_event_at = now - timedelta(days=30)
    score = apply_decay(perfect_organizer, as_of_date=now)
    assert score == 100.0

    # 2. Inactive for 190 days -> 5% decay (100 * 0.95 = 95.0)
    perfect_organizer.last_event_at = now - timedelta(days=190)
    score = apply_decay(perfect_organizer, as_of_date=now)
    assert score == 95.0

    # 3. Inactive for 365 days -> 2 periods of 180 days -> (100 * 0.95^2 = 90.25)
    perfect_organizer.ocs = 100.0
    perfect_organizer.last_event_at = now - timedelta(days=365)
    score = apply_decay(perfect_organizer, as_of_date=now)
    assert score == 90.25


def test_verified_rating_rules():
    """Test that only authentic, registered, attended, non-flagged users can rate events."""
    event = object()

    # 1. Valid attendee
    good_user = MockUser(is_registered=True, has_attended=True, is_flagged=False, account_age_days=10)
    assert is_verified_rating(rating=None, user=good_user, event=event) is True

    # 2. Did not attend
    did_not_attend = MockUser(is_registered=True, has_attended=False, is_flagged=False, account_age_days=10)
    assert is_verified_rating(rating=None, user=did_not_attend, event=event) is False

    # 3. Flagged user
    flagged_user = MockUser(is_registered=True, has_attended=True, is_flagged=True, account_age_days=10)
    assert is_verified_rating(rating=None, user=flagged_user, event=event) is False

    # 4. Brand new account (age <= 7 days)
    young_user = MockUser(is_registered=True, has_attended=True, is_flagged=False, account_age_days=3)
    assert is_verified_rating(rating=None, user=young_user, event=event) is False


def test_sybil_detection_govt_id_reuse():
    """Test that reusing a government ID hash across multiple organizer accounts is detected."""
    shared_hash = "hash_govt_983742"
    org_a = Organizer(organizer_id=uuid.uuid4(), email="a@test.com", govt_id_hash=shared_hash)
    org_b = Organizer(organizer_id=uuid.uuid4(), email="b@test.com", govt_id_hash=shared_hash)

    assert detect_sybil(org_a, [org_b]) is True


def test_sybil_detection_private_domain_spam():
    """Test detection of coordinated dummy accounts on the same private domain."""
    domain = "suspiciousmarketingfirm.com"
    org_candidate = Organizer(organizer_id=uuid.uuid4(), email=f"user0@{domain}", email_domain=domain)
    existing_pool = [
        Organizer(organizer_id=uuid.uuid4(), email=f"user1@{domain}", email_domain=domain),
        Organizer(organizer_id=uuid.uuid4(), email=f"user2@{domain}", email_domain=domain),
        Organizer(organizer_id=uuid.uuid4(), email=f"user3@{domain}", email_domain=domain),
    ]
    assert detect_sybil(org_candidate, existing_pool) is True
