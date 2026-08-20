package com.vsl.modelregistry.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "model_versions")
public class ModelVersion {

    @Id
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String semver;

    @Column(name = "r2_key", nullable = false, unique = true, length = 512)
    private String r2Key;

    @Column(name = "labels_hash", nullable = false, length = 64)
    private String labelsHash;

    @Column(name = "artifact_sha256", nullable = false, length = 64)
    private String artifactSha256;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "input_signature", nullable = false, columnDefinition = "jsonb")
    private JsonNode inputSignature;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private JsonNode metrics;

    @Column(name = "release_eligible", nullable = false)
    private boolean releaseEligible;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_results", nullable = false, columnDefinition = "jsonb")
    private JsonNode validationResults;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ModelVersion() {
    }

    private ModelVersion(UUID id, String semver, String r2Key, String labelsHash,
                         String artifactSha256, JsonNode inputSignature, JsonNode metrics,
                         boolean releaseEligible, JsonNode validationResults, Instant createdAt) {
        this.id = id;
        this.semver = semver;
        this.r2Key = r2Key;
        this.labelsHash = labelsHash;
        this.artifactSha256 = artifactSha256;
        this.inputSignature = inputSignature;
        this.metrics = metrics;
        this.releaseEligible = releaseEligible;
        this.validationResults = validationResults;
        this.active = false;
        this.createdAt = createdAt;
    }

    public static ModelVersion create(UUID id, String semver, String r2Key, String labelsHash,
                                      String artifactSha256, JsonNode inputSignature, JsonNode metrics,
                                      boolean releaseEligible, JsonNode validationResults, Instant createdAt) {
        return new ModelVersion(id, semver, r2Key, labelsHash, artifactSha256, inputSignature,
                metrics, releaseEligible, validationResults, createdAt);
    }

    @PrePersist
    void initialize() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void activate() {
        if (!releaseEligible) {
            throw new IllegalStateException("A release-ineligible model cannot become active");
        }
        active = true;
    }

    public void deactivate() {
        active = false;
    }

    public UUID getId() { return id; }
    public String getSemver() { return semver; }
    public String getR2Key() { return r2Key; }
    public String getLabelsHash() { return labelsHash; }
    public String getArtifactSha256() { return artifactSha256; }
    public JsonNode getInputSignature() { return inputSignature; }
    public JsonNode getMetrics() { return metrics; }
    public boolean isReleaseEligible() { return releaseEligible; }
    public JsonNode getValidationResults() { return validationResults; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }
}
