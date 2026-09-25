"""Pytest shared fixtures and database mock configuration."""

from datetime import datetime, timedelta, timezone
from typing import Generator
import uuid
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models.event import Event
from app.models.organizer import Organizer
from app.models.rating import Rating
from app.models.trust_audit import TrustAudit

from sqlalchemy.pool import StaticPool

# Use SQLite in-memory database with StaticPool for isolated, shared in-memory test session
TEST_DB_URL = "sqlite:///:memory:"

engine_test = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine_test,
)


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Provide a clean in-memory database session for each test function."""
    Base.metadata.create_all(bind=engine_test)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine_test)


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Provide a TestClient with the database dependency overridden."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def new_organizer() -> Organizer:
    """Fixture representing a brand new organizer with zero history."""
    return Organizer(
        organizer_id=uuid.uuid4(),
        name="Fresh Club",
        email="fresh@randommail.com",
        email_domain="randommail.com",
        phone_verified=False,
        official_email_verified=False,
        govt_id_hash=None,
        institution_reg_verified=False,
        linkedin_active=False,
        college_website_match=False,
        events_hosted=0,
        successful_events=0,
        avg_rating=0.0,
        total_ratings=0,
        complaint_count=0,
        cancellation_count=0,
        repeat_participant_rate=0.0,
        student_reports=0,
        admin_flags=0,
        peer_endorsements=0.0,
        social_proof=False,
        college_affiliation=False,
        cross_platform_presence=False,
        news_mentions=False,
        domain_age_years=0.0,
        ocs=0.0,
        tier="New",
        confidence=0.0,
        is_blacklisted=False,
        has_fraud_history=False,
    )


@pytest.fixture
def perfect_organizer() -> Organizer:
    """Fixture representing a fully verified, prestigious organizer."""
    return Organizer(
        organizer_id=uuid.uuid4(),
        name="IIT Bombay Tech Club",
        email="council@iitb.ac.in",
        email_domain="iitb.ac.in",
        phone_verified=True,
        official_email_verified=True,
        govt_id_hash="sha256_mock_hash_8984920239",
        institution_reg_verified=True,
        linkedin_active=True,
        college_website_match=True,
        events_hosted=10,
        successful_events=10,
        avg_rating=5.0,
        total_ratings=150,
        complaint_count=0,
        cancellation_count=0,
        repeat_participant_rate=1.0,
        student_reports=0,
        admin_flags=0,
        peer_endorsements=1.0,
        social_proof=True,
        college_affiliation=True,
        cross_platform_presence=True,
        news_mentions=True,
        domain_age_years=5.0,
        ocs=100.0,
        tier="Verified Partner",
        confidence=1.0,
        is_blacklisted=False,
        has_fraud_history=False,
        last_event_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_event(perfect_organizer: Organizer) -> Event:
    """Fixture representing a high quality college event."""
    return Event(
        event_id=uuid.uuid4(),
        organizer_id=perfect_organizer.organizer_id,
        title="National AI Hackathon 2026",
        description=(
            "Join the premier student artificial intelligence competition hosted at IIT Bombay. "
            "Build next-generation autonomous models, compete for prizes over 500,000 INR, and network "
            "with top industry researchers and tech leaders from across the globe."
        ),
        category="Hackathon",
        tags=["AI", "MachineLearning", "Hackathon"],
        venue="Main Auditorium",
        location="Mumbai, Maharashtra",
        event_date=datetime.now(timezone.utc) + timedelta(days=30),
        registration_deadline=datetime.now(timezone.utc) + timedelta(days=20),
        registration_url="https://iitb.ac.in/events/ai-hackathon",
        banner_url="https://iitb.ac.in/assets/banner.png",
        is_original_image=True,
        verification_status="pending",
        user_reports_count=0,
        spam_flags=[],
    )
