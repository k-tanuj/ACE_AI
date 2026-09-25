"""Database configuration and session management using SQLAlchemy 2.0.

Provides session dependencies and declarative base for all ORM models.
Supports PostgreSQL (with pgvector) and SQLite for development/testing.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# Engine setup with appropriate connection arguments
db_url = settings.DATABASE_URL
if db_url.startswith("file:"):
    db_url = "sqlite:///" + db_url[len("file:"):]

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy 2.0 models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session with automatic cleanup.

    Yields:
        Session: Active SQLAlchemy database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
