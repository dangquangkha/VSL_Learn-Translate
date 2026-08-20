package com.vsl.collection.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

// EARS[FR-C04]: Clip entity — metadata for each recorded clip (video/landmark pair)
@Entity
@Table(name = "clips")
public class Clip {

    public enum QualityStatus { PENDING, ACCEPTED, REJECTED, NEEDS_REVIEW }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "participant_id", nullable = false)
    private Long participantId;

    @Column(name = "sign_id")
    private Long signId;

    @Column(nullable = false, length = 64)
    private String label;

    @Column(name = "r2_video_key", length = 512)
    private String r2VideoKey;

    @Column(name = "r2_landmark_key", length = 512)
    private String r2LandmarkKey;

    @Column(name = "duration_seconds")
    private Double durationSeconds;

    @Column(name = "frame_count")
    private Integer frameCount;

    private Double fps;

    @Enumerated(EnumType.STRING)
    @Column(name = "quality_status", nullable = false, length = 32)
    private QualityStatus qualityStatus = QualityStatus.PENDING;

    @Column(name = "quality_score")
    private Double qualityScore;

    @Column(name = "rejection_reason", length = 512)
    private String rejectionReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public Clip() {}

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public Long getParticipantId() { return participantId; }
    public void setParticipantId(Long participantId) { this.participantId = participantId; }
    public Long getSignId() { return signId; }
    public void setSignId(Long signId) { this.signId = signId; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public String getR2VideoKey() { return r2VideoKey; }
    public void setR2VideoKey(String r2VideoKey) { this.r2VideoKey = r2VideoKey; }
    public String getR2LandmarkKey() { return r2LandmarkKey; }
    public void setR2LandmarkKey(String r2LandmarkKey) { this.r2LandmarkKey = r2LandmarkKey; }
    public Double getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Double durationSeconds) { this.durationSeconds = durationSeconds; }
    public Integer getFrameCount() { return frameCount; }
    public void setFrameCount(Integer frameCount) { this.frameCount = frameCount; }
    public Double getFps() { return fps; }
    public void setFps(Double fps) { this.fps = fps; }
    public QualityStatus getQualityStatus() { return qualityStatus; }
    public void setQualityStatus(QualityStatus qualityStatus) { this.qualityStatus = qualityStatus; }
    public Double getQualityScore() { return qualityScore; }
    public void setQualityScore(Double qualityScore) { this.qualityScore = qualityScore; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
