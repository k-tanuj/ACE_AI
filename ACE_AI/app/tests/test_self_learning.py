"""Unit and integration tests for app/services/self_learning.py."""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.event import Event
from app.models.organizer import Organizer
from app.services.self_learning import compute_reward, collect_feedback_signals, update_decision_thresholds, retrain_classifier


def test_compute_reward(sample_event: Event):
    reward = compute_reward(sample_event)
    assert isinstance(reward, float)


def test_collect_feedback_signals(db_session: Session, perfect_organizer: Organizer, sample_event: Event):
    db_session.add(perfect_organizer)
    db_session.commit()

    sample_event.organizer_id = perfect_organizer.organizer_id
    db_session.add(sample_event)
    db_session.commit()

    records = collect_feedback_signals(db_session)
    assert isinstance(records, list)
    assert len(records) >= 1
    assert "features" in records[0]
    assert "reward" in records[0]


def test_update_decision_thresholds(db_session: Session):
    thresholds = update_decision_thresholds(db_session)
    assert "auto_approve_ocs_min" in thresholds
    assert "auto_approve_eqs_min" in thresholds


def test_retrain_classifier(db_session: Session, perfect_organizer: Organizer, sample_event: Event):
    db_session.add(perfect_organizer)
    db_session.commit()

    sample_event.organizer_id = perfect_organizer.organizer_id
    db_session.add(sample_event)
    db_session.commit()

    stats = retrain_classifier(db_session)
    assert "model_version" in stats
    assert "auc" in stats
    assert "swapped_live" in stats
