"""Unit tests for Event Quality Score (EQS) engine."""

from datetime import datetime, timedelta, timezone
from app.models.event import Event
from app.models.organizer import Organizer
from app.services.eqs_engine import compute_eqs


def test_empty_event_eqs():
    """Test that an empty event returns 0 EQS and zeroes across the breakdown."""
    res = compute_eqs(None)
    assert res["eqs"] == 0.0
    assert res["breakdown"]["completeness"] == 0.0
    assert res["breakdown"]["organizer_credibility"] == 0.0


def test_perfect_event_high_eqs(perfect_organizer: Organizer, sample_event: Event):
    """Test that a complete event with a verified partner organizer scores high EQS."""
    sample_event.verification_status = "approved"
    sample_event.organizer = perfect_organizer

    result = compute_eqs(sample_event, organizer=perfect_organizer)
    assert result["eqs"] >= 80.0
    assert result["breakdown"]["completeness"] == 100.0
    assert result["breakdown"]["organizer_credibility"] == 100.0
    assert result["breakdown"]["verification_status"] == 100.0
    assert result["breakdown"]["user_reports_score"] == 100.0


def test_verification_status_weights(perfect_organizer: Organizer, sample_event: Event):
    """Test that verification status impacts EQS appropriately (approved=100, pending=50, rejected=0)."""
    sample_event.verification_status = "approved"
    res_approved = compute_eqs(sample_event, perfect_organizer)

    sample_event.verification_status = "pending"
    res_pending = compute_eqs(sample_event, perfect_organizer)

    sample_event.verification_status = "rejected"
    res_rejected = compute_eqs(sample_event, perfect_organizer)

    assert res_approved["eqs"] > res_pending["eqs"] > res_rejected["eqs"]
    assert res_approved["breakdown"]["verification_status"] == 100.0
    assert res_pending["breakdown"]["verification_status"] == 50.0
    assert res_rejected["breakdown"]["verification_status"] == 0.0


def test_user_reports_penalty(perfect_organizer: Organizer, sample_event: Event):
    """Test that user reports systematically reduce the user reports score."""
    sample_event.user_reports_count = 0
    res_clean = compute_eqs(sample_event, perfect_organizer)

    sample_event.user_reports_count = 2  # 100 - (2 * 20) = 60
    res_flagged = compute_eqs(sample_event, perfect_organizer)

    sample_event.user_reports_count = 5  # 100 - (5 * 20) = 0
    res_severe = compute_eqs(sample_event, perfect_organizer)

    assert res_clean["breakdown"]["user_reports_score"] == 100.0
    assert res_flagged["breakdown"]["user_reports_score"] == 60.0
    assert res_severe["breakdown"]["user_reports_score"] == 0.0
    assert res_clean["eqs"] > res_flagged["eqs"] > res_severe["eqs"]
