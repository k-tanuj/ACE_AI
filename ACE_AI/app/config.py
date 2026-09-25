"""Application configuration and constants.

All scoring thresholds, weights, anti-gaming boundaries, and environment variables
are centrally declared here to eliminate magic numbers and ensure testability.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core Environment
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = "ace_ai_secret_key_change_in_production"
    API_V1_STR: str = "/api"

    # Database & Cache
    DATABASE_URL: str = "sqlite:///./ace_ai_trust.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI & Embedding models
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None

    # OCS Global Signal Weights (Total = 1.00)
    OCS_WEIGHT_IDENTITY: float = 0.25
    OCS_WEIGHT_HISTORICAL: float = 0.30
    OCS_WEIGHT_CONTENT: float = 0.15
    OCS_WEIGHT_COMMUNITY: float = 0.15
    OCS_WEIGHT_EXTERNAL: float = 0.15

    # 1. Identity Score Constants (Max = 70.0)
    IDENTITY_MAX_SCORE: float = 70.0
    IDENTITY_EDU_DOMAIN_POINTS: float = 10.0
    IDENTITY_PHONE_VERIFIED_POINTS: float = 5.0
    IDENTITY_OFFICIAL_EMAIL_POINTS: float = 15.0
    IDENTITY_GOVT_ID_POINTS: float = 20.0
    IDENTITY_INSTITUTION_REG_POINTS: float = 15.0
    IDENTITY_LINKEDIN_ACTIVE_POINTS: float = 5.0

    # 2. Historical Score Constants (Max = 50.0)
    HISTORICAL_MAX_SCORE: float = 50.0
    HISTORICAL_EVENT_CAP: int = 10
    HISTORICAL_EVENT_MULTIPLIER: float = 0.5
    HISTORICAL_SUCCESS_RATE_WEIGHT: float = 15.0
    HISTORICAL_RATING_WEIGHT: float = 20.0
    HISTORICAL_REPEAT_RATE_WEIGHT: float = 10.0
    HISTORICAL_COMPLAINT_RATE_PENALTY: float = 15.0
    HISTORICAL_CANCELLATION_RATE_PENALTY: float = 10.0

    # 3. Content Score Constants (Max = 35.0)
    CONTENT_MAX_SCORE: float = 35.0
    CONTENT_COMPLETE_FIELDS_POINTS: float = 10.0
    CONTENT_DESC_MIN_CHARS: int = 200
    CONTENT_DESC_POINTS: float = 5.0
    CONTENT_SPAM_PENALTY: float = 10.0
    CONTENT_VALID_LINK_POINTS: float = 10.0
    CONTENT_ORIGINAL_IMAGE_POINTS: float = 5.0
    CONTENT_GRAMMAR_THRESHOLD: float = 0.80
    CONTENT_GRAMMAR_POINTS: float = 5.0

    # 4. Community Score Constants (Range -35.0 to +30.0)
    COMMUNITY_MIN_SCORE: float = -35.0
    COMMUNITY_MAX_SCORE: float = 30.0
    COMMUNITY_STUDENT_REPORT_PENALTY: float = 20.0
    COMMUNITY_ADMIN_FLAG_PENALTY: float = 15.0
    COMMUNITY_PEER_ENDORSEMENT_POINTS: float = 10.0
    COMMUNITY_SOCIAL_PROOF_POINTS: float = 5.0
    COMMUNITY_COLLEGE_AFFILIATION_POINTS: float = 15.0

    # 5. External Score Constants (Max = 45.0)
    EXTERNAL_MAX_SCORE: float = 45.0
    EXTERNAL_COLLEGE_WEBSITE_MATCH_POINTS: float = 15.0
    EXTERNAL_LINKEDIN_ACTIVE_POINTS: float = 10.0
    EXTERNAL_CROSS_PLATFORM_POINTS: float = 10.0
    EXTERNAL_NEWS_MENTIONS_POINTS: float = 5.0
    EXTERNAL_DOMAIN_AGE_THRESHOLD_YEARS: float = 2.0
    EXTERNAL_DOMAIN_AGE_POINTS: float = 5.0

    # OCS Fraud & Blacklist Factors
    FRAUD_HISTORY_MULTIPLIER: float = 0.30
    BLACKLIST_SCORE: float = 0.0
    OCS_MAX_SCORE: float = 100.0

    # Trust Tier Boundaries
    TIER_VERIFIED_PARTNER_MIN: float = 85.0
    TIER_TRUSTED_MIN: float = 70.0
    TIER_ESTABLISHED_MIN: float = 50.0
    TIER_NEW_CAUTION_MIN: float = 30.0

    # Auto-Approval Thresholds
    AUTO_APPROVE_OCS_MIN: float = 85.0
    AUTO_APPROVE_EQS_MIN: float = 75.0
    AUTO_APPROVE_CONFIDENCE_MIN: float = 0.80

    SPOT_CHECK_OCS_MIN: float = 70.0
    SPOT_CHECK_EQS_MIN: float = 60.0

    MANUAL_REVIEW_OCS_MIN: float = 50.0

    # Event Quality Score (EQS) Weights (Total = 1.00)
    EQS_WEIGHT_COMPLETENESS: float = 0.30
    EQS_WEIGHT_ORGANIZER_OCS: float = 0.25
    EQS_WEIGHT_DESC_QUALITY: float = 0.20
    EQS_WEIGHT_VERIFICATION_STATUS: float = 0.15
    EQS_WEIGHT_USER_REPORTS: float = 0.10
    EQS_USER_REPORT_PENALTY: float = 20.0

    # Duplicate Detection
    DUPLICATE_EMBEDDING_THRESHOLD: float = 0.85
    DUPLICATE_FUZZY_TITLE_THRESHOLD: float = 90.0
    DUPLICATE_HISTORY_LIMIT: int = 1000

    # Fraud Detection & Spam Keywords
    SPAM_KEYWORDS: List[str] = [
        "guaranteed job",
        "free money",
        "click here",
        "earn ₹",
        "100% placement",
        "no experience needed",
        "limited time",
        "act now",
        "risk free",
    ]
    SUSPICIOUS_URL_PATTERNS: List[str] = [
        "bit.ly",
        "tinyurl",
        "t.co",
        "rb.gy",
    ]

    # Anti-Gaming Safeguards
    OCS_MAX_DELTA: float = 5.0
    DECAY_INACTIVITY_DAYS: int = 180
    DECAY_FACTOR: float = 0.95
    VERIFIED_USER_MIN_ACCOUNT_AGE_DAYS: int = 7


# Global singleton settings instance
settings = Settings()
