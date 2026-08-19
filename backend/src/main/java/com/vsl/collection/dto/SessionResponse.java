package com.vsl.collection.dto;

import com.vsl.collection.entity.RecordingSession;
import java.time.OffsetDateTime;

public class SessionResponse {
    private Long id;
    private String sessionCode;
    private Long participantId;
    private int totalClipsRecorded;
    private RecordingSession.Status status;
    private OffsetDateTime startedAt;
    private OffsetDateTime endedAt;

    public SessionResponse() {}

    public static SessionResponse fromEntity(RecordingSession s) {
        SessionResponse r = new SessionResponse();
        r.id = s.getId();
        r.sessionCode = s.getSessionCode();
        r.participantId = s.getParticipantId();
        r.totalClipsRecorded = s.getTotalClipsRecorded();
        r.status = s.getStatus();
        r.startedAt = s.getStartedAt();
        r.endedAt = s.getEndedAt();
        return r;
    }

    public Long getId() { return id; }
    public String getSessionCode() { return sessionCode; }
    public Long getParticipantId() { return participantId; }
    public int getTotalClipsRecorded() { return totalClipsRecorded; }
    public RecordingSession.Status getStatus() { return status; }
    public OffsetDateTime getStartedAt() { return startedAt; }
    public OffsetDateTime getEndedAt() { return endedAt; }
}
