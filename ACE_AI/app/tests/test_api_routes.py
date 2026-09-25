"""Integration tests for verification and observability API routes."""

from datetime import datetime, timedelta, timezone
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.organizer import Organizer


def test_submit_event_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
):
    """Test POST /api/verify/submit executes auto-decision and saves event."""
    db_session.add(perfect_organizer)
    db_session.commit()

    payload = {
        "organizer_id": str(perfect_organizer.organizer_id),
        "title": "National Hackathon 2026",
        "description": "Comprehensive 48-hour coding hackathon focusing on AI and cloud computing.",
        "registration_url": "https://hackathon.edu/register",
        "venue": "Campus Auditorium",
        "location": "Boston, MA",
        "event_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "registration_deadline": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
    }

    resp = client.post("/api/verify/submit", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] in ("auto_approved", "auto_flagged", "auto_quarantined")
    assert "decision" in data
    assert "reason" in data
    assert "confidence" in data
    assert "visibility" in data


def test_get_organizer_credibility_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
):
    """Test GET /api/verify/organizer/{organizer_id} returns OCS and full signal breakdown."""
    db_session.add(perfect_organizer)
    db_session.commit()

    resp = client.get(f"/api/verify/organizer/{perfect_organizer.organizer_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["organizer_id"] == str(perfect_organizer.organizer_id)
    assert data["ocs"] >= 85.0
    assert data["tier"] == "Verified Partner"
    assert "signals" in data
    assert data["signals"]["identity"] == 70.0


def test_recompute_organizer_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
):
    """Test POST /api/verify/organizer/{organizer_id}/recompute recalibrates and persists OCS."""
    db_session.add(perfect_organizer)
    db_session.commit()

    resp = client.post(f"/api/verify/organizer/{perfect_organizer.organizer_id}/recompute")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ocs"] >= 85.0
    assert data["status"] == "updated"


def test_get_event_verification_report_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
    sample_event: Event,
):
    """Test GET /api/verify/event/{event_id} returns EQS, auto-decision, and breakdown."""
    db_session.add(perfect_organizer)
    db_session.commit()

    sample_event.organizer_id = perfect_organizer.organizer_id
    db_session.add(sample_event)
    db_session.commit()

    resp = client.get(f"/api/verify/event/{sample_event.event_id}")
    assert resp.status_code == 200
    data = resp.json()

    assert data["event_id"] == str(sample_event.event_id)
    assert "quality_score" in data
    assert "decision" in data
    assert data["decision"]["decision"] in ("AUTO_APPROVE", "AUTO_FLAG", "AUTO_QUARANTINE", "AUTO_REJECT")


def test_duplicate_check_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
    sample_event: Event,
):
    """Test POST /api/verify/duplicate-check identifies duplicates correctly."""
    db_session.add(perfect_organizer)
    db_session.commit()

    sample_event.organizer_id = perfect_organizer.organizer_id
    db_session.add(sample_event)
    db_session.commit()

    payload = {
        "title": sample_event.title,
        "description": sample_event.description,
        "organizer_id": str(perfect_organizer.organizer_id),
    }

    resp = client.post("/api/verify/duplicate-check", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_duplicate"] is True
    assert data["duplicate_of"] == str(sample_event.event_id)


def test_external_refresh_endpoint(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
):
    """Test POST /api/verify/external-refresh/{organizer_id} runs automated external checks."""
    db_session.add(perfect_organizer)
    db_session.commit()

    resp = client.post(f"/api/verify/external-refresh/{perfect_organizer.organizer_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["organizer_id"] == str(perfect_organizer.organizer_id)
    assert "external_signals" in data


def test_observability_endpoints(
    client: TestClient,
    db_session: Session,
    perfect_organizer: Organizer,
    sample_event: Event,
):
    """Test read-only observability dashboard endpoints (/api/obs/*)."""
    db_session.add(perfect_organizer)
    db_session.commit()

    sample_event.organizer_id = perfect_organizer.organizer_id
    db_session.add(sample_event)
    db_session.commit()

    # 1. Stats
    resp = client.get("/api/obs/decisions/stats")
    assert resp.status_code == 200
    assert "total_events" in resp.json()

    # 2. Trust distribution
    resp = client.get("/api/obs/trust-distribution")
    assert resp.status_code == 200
    assert "score_histogram" in resp.json()

    # 3. Model health
    resp = client.get("/api/obs/model/health")
    assert resp.status_code == 200
    assert resp.json()["human_review_required"] is False

    # 4. Recent decisions
    resp = client.get("/api/obs/decisions/recent")
    assert resp.status_code == 200

    # 5. Flagged events
    resp = client.get("/api/obs/flagged-events")
    assert resp.status_code == 200
