-- 001_init_trust_tables.sql
-- PostgreSQL Migration for Module 5: Fully Automated AI Event Verification & Organizer Trust System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Organizers Table
CREATE TABLE IF NOT EXISTS organizers (
    organizer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_domain VARCHAR(255) NOT NULL DEFAULT '',
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    official_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    govt_id_hash VARCHAR(255) NULL,
    institution_reg_verified BOOLEAN NOT NULL DEFAULT FALSE,
    linkedin_url VARCHAR(500) NULL,
    linkedin_active BOOLEAN NOT NULL DEFAULT FALSE,
    college_website_match BOOLEAN NOT NULL DEFAULT FALSE,
    domain_age_days INT NOT NULL DEFAULT 0,
    domain_age_years DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    events_hosted INT NOT NULL DEFAULT 0,
    successful_events INT NOT NULL DEFAULT 0,
    avg_rating DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_ratings INT NOT NULL DEFAULT 0,
    complaint_count INT NOT NULL DEFAULT 0,
    cancellation_count INT NOT NULL DEFAULT 0,
    repeat_participant_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    student_reports INT NOT NULL DEFAULT 0,
    admin_flags INT NOT NULL DEFAULT 0,
    peer_endorsements DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    social_proof BOOLEAN NOT NULL DEFAULT FALSE,
    college_affiliation BOOLEAN NOT NULL DEFAULT FALSE,
    cross_platform_presence BOOLEAN NOT NULL DEFAULT FALSE,
    news_mentions BOOLEAN NOT NULL DEFAULT FALSE,
    ocs DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tier VARCHAR(50) NOT NULL DEFAULT 'New',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    auto_decision_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    has_fraud_history BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_event_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_organizer_ocs ON organizers(ocs);
CREATE INDEX IF NOT EXISTS idx_organizer_tier ON organizers(tier);
CREATE INDEX IF NOT EXISTS idx_organizer_email ON organizers(email);

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES organizers(organizer_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    venue VARCHAR(255) NULL,
    location VARCHAR(255) NULL,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    eligibility VARCHAR(255) NULL,
    registration_url VARCHAR(1000) NULL,
    banner_url VARCHAR(1000) NULL,
    is_original_image BOOLEAN NOT NULL DEFAULT TRUE,
    quality_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'auto_quarantined',
    decision_reason TEXT NULL,
    decision_confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    verified_at TIMESTAMP WITH TIME ZONE NULL,
    user_reports_count INT NOT NULL DEFAULT 0,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of UUID NULL REFERENCES events(event_id) ON DELETE SET NULL,
    spam_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding vector(384) NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_event_status ON events(verification_status);
CREATE INDEX IF NOT EXISTS idx_event_created ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_event_embedding ON events USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    rating_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    review_text TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratings_event ON ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_verified ON ratings(is_verified);

-- 4. Trust Audit Table
CREATE TABLE IF NOT EXISTS trust_audits (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES organizers(organizer_id) ON DELETE CASCADE,
    event_id UUID NULL REFERENCES events(event_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    delta DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    reason VARCHAR(500) NOT NULL,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_audit_org ON trust_audits(organizer_id);
CREATE INDEX IF NOT EXISTS idx_trust_audit_created ON trust_audits(created_at);
