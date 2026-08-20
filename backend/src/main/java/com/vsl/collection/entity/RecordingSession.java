package com.vsl.collection.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

// EARS[FR-C03]: RecordingSession entity — tracks a single recording session per participant
@Entity
@Table(name = "recording_sessions")
public class RecordingSession {

    public enum Status { ACTIVE, COMPLETED, ABANDONED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_code", nullable = false, unique = true)
    private String sessionCode;

    @Column(name = "participant_id", nullable = false)
    private Long participantId;

    @Column(name = "total_clips_recorded", nullable = false)
    private int totalClipsRecorded = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Status status = Status.ACTIVE;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public RecordingSession() {}

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        if (startedAt == null) startedAt = createdAt;
    }

    public Long getId() { return id; }
    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }
    public Long getParticipantId() { return participantId; }
    public void setParticipantId(Long participantId) { this.participantId = participantId; }
    public int getTotalClipsRecorded() { return totalClipsRecorded; }
    public void setTotalClipsRecorded(int totalClipsRecorded) { this.totalClipsRecorded = totalClipsRecorded; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(OffsetDateTime startedAt) { this.startedAt = startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
    public void setEndedAt(OffsetDateTime endedAt) { this.endedAt = endedAt; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
