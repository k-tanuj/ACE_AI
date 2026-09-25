"""Unit tests for spam, fraud, and broken metadata detector."""

from datetime import datetime, timedelta, timezone
from app.models.event import Event
from app.models.organizer import Organizer
from app.services.fraud_detector import detect_fraud


def test_clean_event_low_risk(perfect_organizer: Organizer, sample_event: Event):
    """Test that a valid, well-formed event from a verified organizer triggers zero fraud flags."""
    res = detect_fraud(sample_event, organizer=perfect_organizer)
    assert res["flags"] == []
    assert res["risk_level"] == "low"


def test_spam_keyword_detection(perfect_organizer: Organizer, sample_event: Event):
    """Test detection of spam keywords like 'guaranteed job' and '100% placement'."""
    sample_event.description = "Enroll now! We offer guaranteed job with 100% placement and free money."
    res = detect_fraud(sample_event, organizer=perfect_organizer)
    assert "spam_keywords" in res["flags"]
    assert res["risk_level"] == "medium"


def test_suspicious_url_and_broken_links(perfect_organizer: Organizer, sample_event: Event):
    """Test detection of shortened links and broken URLs."""
    # Test shortened link
    sample_event.registration_url = "https://bit.ly/my-suspicious-event"
    res_short = detect_fraud(sample_event, organizer=perfect_organizer)
    assert "shortened_link" in res_short["flags"]

    # Test broken/malformed URL
    sample_event.registration_url = "not_a_valid_url"
    res_broken = detect_fraud(sample_event, organizer=perfect_organizer)
    assert "broken_link" in res_broken["flags"]


def test_invalid_dates_detection(perfect_organizer: Organizer, sample_event: Event):
    """Test detection of past event dates and deadlines that exceed event date."""
    now = datetime.now(timezone.utc)

    # 1. Past event date
    sample_event.event_date = now - timedelta(days=5)
    sample_event.registration_deadline = now - timedelta(days=10)
    res_past = detect_fraud(sample_event, organizer=perfect_organizer)
    assert "past_date" in res_past["flags"]

    # 2. Registration deadline after event date
    sample_event.event_date = now + timedelta(days=5)
    sample_event.registration_deadline = now + timedelta(days=10)  # Deadline AFTER event
    res_deadline = detect_fraud(sample_event, organizer=perfect_organizer)
    assert "invalid_deadline" in res_deadline["flags"]


def test_unverified_new_organizer_flag(new_organizer: Organizer, sample_event: Event):
    """Test that an unverified organizer with 0 events hosted triggers a risk flag."""
    new_organizer.ocs = 10.0
    new_organizer.events_hosted = 0
    res = detect_fraud(sample_event, organizer=new_organizer)
    assert "new_unverified_organizer" in res["flags"]


def test_high_risk_level_accumulation(new_organizer: Organizer, sample_event: Event):
    """Test that accumulating 3 or more flags sets risk_level to 'high'."""
    now = datetime.now(timezone.utc)
    new_organizer.ocs = 5.0
    new_organizer.events_hosted = 0

    sample_event.description = "Click here for guaranteed job!"
    sample_event.registration_url = "https://tinyurl.com/fake-hackathon"
    sample_event.event_date = now - timedelta(days=2)  # Past date

    res = detect_fraud(sample_event, organizer=new_organizer)
    assert len(res["flags"]) >= 3
    assert res["risk_level"] == "high"
