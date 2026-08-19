package com.vsl.collection.dto;

import com.vsl.collection.entity.Clip;
import java.time.OffsetDateTime;

public class ClipResponse {
    private Long id;
    private Long sessionId;
    private Long participantId;
    private Long signId;
    private String label;
    private String r2VideoKey;
    private String r2LandmarkKey;
    private Double durationSeconds;
    private Integer frameCount;
    private Double fps;
    private Clip.QualityStatus qualityStatus;
    private OffsetDateTime createdAt;

    public ClipResponse() {}

    public static ClipResponse fromEntity(Clip c) {
        ClipResponse r = new ClipResponse();
        r.id = c.getId();
        r.sessionId = c.getSessionId();
        r.participantId = c.getParticipantId();
        r.signId = c.getSignId();
        r.label = c.getLabel();
        r.r2VideoKey = c.getR2VideoKey();
        r.r2LandmarkKey = c.getR2LandmarkKey();
        r.durationSeconds = c.getDurationSeconds();
        r.frameCount = c.getFrameCount();
        r.fps = c.getFps();
        r.qualityStatus = c.getQualityStatus();
        r.createdAt = c.getCreatedAt();
        return r;
    }

    public Long getId() { return id; }
    public Long getSessionId() { return sessionId; }
    public Long getParticipantId() { return participantId; }
    public Long getSignId() { return signId; }
    public String getLabel() { return label; }
    public String getR2VideoKey() { return r2VideoKey; }
    public String getR2LandmarkKey() { return r2LandmarkKey; }
    public Double getDurationSeconds() { return durationSeconds; }
    public Integer getFrameCount() { return frameCount; }
    public Double getFps() { return fps; }
    public Clip.QualityStatus getQualityStatus() { return qualityStatus; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
