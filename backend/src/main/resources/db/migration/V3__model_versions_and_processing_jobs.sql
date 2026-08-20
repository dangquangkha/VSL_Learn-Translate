-- V3__model_versions_and_processing_jobs.sql
-- Module: modelregistry (P5-1) + quality foundation
-- Owner: Đức (P5)

-- Bảng quản lý phiên bản model ONNX (SRS §7.3)
CREATE TABLE IF NOT EXISTS model_versions (
    id                  UUID PRIMARY KEY,
    semver              VARCHAR(64) NOT NULL UNIQUE,
    r2_key              VARCHAR(512) NOT NULL UNIQUE,
    labels_hash         VARCHAR(64) NOT NULL,
    artifact_sha256     VARCHAR(64) NOT NULL,
    input_signature     JSONB NOT NULL,
    metrics             JSONB NOT NULL,
    release_eligible    BOOLEAN NOT NULL DEFAULT FALSE,
    validation_results  JSONB NOT NULL,
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_model_labels_hash CHECK (labels_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_model_artifact_hash CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_model_input_signature_object CHECK (jsonb_typeof(input_signature) = 'object'),
    CONSTRAINT ck_model_metrics_object CHECK (jsonb_typeof(metrics) = 'object'),
    CONSTRAINT ck_model_validation_object CHECK (jsonb_typeof(validation_results) = 'object'),
    CONSTRAINT ck_active_model_is_release_eligible CHECK (NOT is_active OR release_eligible)
);

-- Partial unique index: đảm bảo tối đa 1 model active tại mọi thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_single_active
    ON model_versions (is_active) WHERE is_active = TRUE;

-- Bảng theo dõi job xử lý bất đồng bộ (SRS §7.3)
CREATE TABLE IF NOT EXISTS processing_jobs (
    id          BIGSERIAL PRIMARY KEY,
    clip_id     BIGINT NOT NULL,
    type        VARCHAR(32) NOT NULL DEFAULT 'QUALITY_CHECK',
    status      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_pending
    ON processing_jobs (status) WHERE status = 'PENDING';
