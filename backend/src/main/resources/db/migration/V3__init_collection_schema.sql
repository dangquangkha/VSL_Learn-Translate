-- V3__init_collection_schema.sql (FR-C: Collection module schema)

CREATE TABLE IF NOT EXISTS participants (
    id BIGSERIAL PRIMARY KEY,
    participant_code VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    age INT,
    gender VARCHAR(32),
    deaf_status VARCHAR(64),
    dominant_hand VARCHAR(16),
    location VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participants_code ON participants(participant_code);

CREATE TABLE IF NOT EXISTS consents (
    id BIGSERIAL PRIMARY KEY,
    participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    consent_given BOOLEAN NOT NULL DEFAULT TRUE,
    consent_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
    consent_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS recording_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_code VARCHAR(64) NOT NULL UNIQUE,
    participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    total_clips_recorded INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, ABANDONED
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recording_sessions_code ON recording_sessions(session_code);

CREATE TABLE IF NOT EXISTS clips (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT REFERENCES recording_sessions(id) ON DELETE SET NULL,
    participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    sign_id BIGINT,
    label VARCHAR(64) NOT NULL,
    r2_video_key VARCHAR(512),
    r2_landmark_key VARCHAR(512),
    duration_seconds DOUBLE PRECISION,
    frame_count INT,
    fps DOUBLE PRECISION,
    quality_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED, NEEDS_REVIEW
    quality_score DOUBLE PRECISION,
    rejection_reason VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clips_participant ON clips(participant_id);
CREATE INDEX IF NOT EXISTS idx_clips_session ON clips(session_id);
CREATE INDEX IF NOT EXISTS idx_clips_label ON clips(label);
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(quality_status);
