"""Unit tests for app/services/auto_decision.py autonomous decision pipeline."""

from datetime import datetime, timedelta, timezone
import pytest
from app.services.auto_decision import make_auto_decision


class DummyOrganizer:
    def __init__(self, ocs=50.0, events_hosted=1, is_blacklisted=False):
        self.ocs = ocs
        self.events_hosted = events_hosted
        self.is_blacklisted = is_blacklisted


class DummyEvent:
    def __init__(self, registration_url="https://valid.edu/register", event_date=None):
        self.registration_url = registration_url
        self.event_date = event_date or (datetime.now(timezone.utc) + timedelta(days=7))


def test_auto_decision_blacklisted_organizer():
    org = DummyOrganizer(is_blacklisted=True)
    event = DummyEvent()
    eqs = {"eqs": 80.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_REJECT"
    assert "blacklisted" in res["reason"].lower()


def test_auto_decision_high_fraud():
    org = DummyOrganizer()
    event = DummyEvent()
    eqs = {"eqs": 80.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "high", "flags": ["spam_keywords", "broken_link"]}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_REJECT"
    assert "fraud risk" in res["reason"].lower()


def test_auto_decision_duplicate():
    org = DummyOrganizer()
    event = DummyEvent()
    eqs = {"eqs": 80.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": True, "similarity": 0.98}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_REJECT"
    assert "duplicate" in res["reason"].lower()


def test_auto_decision_past_date():
    org = DummyOrganizer()
    past_date = datetime.now(timezone.utc) - timedelta(days=2)
    event = DummyEvent(event_date=past_date)
    eqs = {"eqs": 80.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_REJECT"
    assert "past" in res["reason"].lower()


def test_auto_decision_invalid_url():
    org = DummyOrganizer()
    event = DummyEvent(registration_url="invalid_url_string")
    eqs = {"eqs": 80.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_REJECT"
    assert "url" in res["reason"].lower()


def test_auto_decision_quarantine_new_organizer():
    org = DummyOrganizer(ocs=10.0, events_hosted=0)
    event = DummyEvent()
    eqs = {"eqs": 70.0}
    ocs_data = {"ocs": 10.0, "confidence": 0.3}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_QUARANTINE"


def test_auto_decision_flag_low_confidence():
    org = DummyOrganizer(ocs=60.0, events_hosted=1)
    event = DummyEvent()
    eqs = {"eqs": 70.0}
    ocs_data = {"ocs": 60.0, "confidence": 0.3}  # confidence < 0.4
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_FLAG"
    assert "confidence" in res["reason"].lower()


def test_auto_decision_approve_high_trust():
    org = DummyOrganizer(ocs=80.0, events_hosted=5)
    event = DummyEvent()
    eqs = {"eqs": 75.0}
    ocs_data = {"ocs": 80.0, "confidence": 0.9}
    fraud = {"risk_level": "low", "flags": []}
    dup = {"is_duplicate": False, "similarity": 0.0}

    res = make_auto_decision(event, org, eqs, ocs_data, fraud, dup)
    assert res["decision"] == "AUTO_APPROVE"
    assert res["visibility"] == "full"
    assert res["priority_boost"] == 1.2
