"""Unit tests for embedding and fuzzy title duplicate detection."""

import uuid
from app.models.event import Event
from app.services.duplicate_detector import detect_duplicate
from app.utils.embeddings import generate_embedding


def test_identical_description_duplicate(sample_event: Event):
    """Test that an event with identical description is flagged as duplicate via embedding."""
    existing_event = Event(
        event_id=uuid.uuid4(),
        organizer_id=uuid.uuid4(),
        title="National AI Hackathon 2026",
        description=sample_event.description,
        embedding=generate_embedding(f"{sample_event.title}. {sample_event.description}"),
    )

    candidate = Event(
        event_id=uuid.uuid4(),
        organizer_id=uuid.uuid4(),
        title="National AI Hackathon 2026 - Mumbai",
        description=sample_event.description,
    )

    result = detect_duplicate(candidate, [existing_event], threshold=0.85)
    assert result["is_duplicate"] is True
    assert result["duplicate_of"] == existing_event.event_id
    assert result["similarity"] >= 0.85


def test_fuzzy_title_same_organizer_duplicate(perfect_organizer):
    """Test duplicate detection on near-identical titles by the same organizer."""
    org_id = perfect_organizer.organizer_id

    existing_event = Event(
        event_id=uuid.uuid4(),
        organizer_id=org_id,
        title="Annual Robotics Championship 2026",
        description="A major gathering of robotics designers building quadcopters and rovers.",
    )

    candidate = Event(
        event_id=uuid.uuid4(),
        organizer_id=org_id,
        title="Annual Robotics Championship 2026!",
        description="A completely rewritten overview of autonomous rovers and drones.",
    )

    result = detect_duplicate(candidate, [existing_event])
    assert result["is_duplicate"] is True
    assert result["duplicate_of"] == existing_event.event_id
    assert result["fuzzy_title_ratio"] >= 90.0


def test_fuzzy_title_different_organizer_not_duplicate():
    """Test that high title similarity from a DIFFERENT organizer is not flagged if embeddings differ."""
    org1 = uuid.uuid4()
    org2 = uuid.uuid4()

    existing_event = Event(
        event_id=uuid.uuid4(),
        organizer_id=org1,
        title="Inter-College Coding Meet",
        description="Focus on Competitive Programming, dynamic programming algorithms, and graphs.",
        embedding=[0.1] * 384,
    )

    candidate = Event(
        event_id=uuid.uuid4(),
        organizer_id=org2,
        title="Inter-College Coding Meet",
        description="Focus on Web Development, React, GraphQL, and modern cloud deployment architectures.",
        embedding=[-0.1] * 384,
    )

    result = detect_duplicate(candidate, [existing_event], threshold=0.85)
    assert result["is_duplicate"] is False


def test_empty_existing_events_pool(sample_event: Event):
    """Test duplicate detection handles empty pool gracefully."""
    result = detect_duplicate(sample_event, [])
    assert result["is_duplicate"] is False
    assert result["duplicate_of"] is None
    assert result["similarity"] == 0.0
