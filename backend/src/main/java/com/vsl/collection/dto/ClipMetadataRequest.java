package com.vsl.collection.dto;

public class ClipMetadataRequest {
    private String sessionCode;
    private String participantCode;
    private Long signId;
    private String label;
    private String r2VideoKey;
    private String r2LandmarkKey;
    private Double durationSeconds;
    private Integer frameCount;
    private Double fps;

    public ClipMetadataRequest() {}

    public String getSessionCode() { return sessionCode; }
    public void setSessionCode(String sessionCode) { this.sessionCode = sessionCode; }
    public String getParticipantCode() { return participantCode; }
    public void setParticipantCode(String participantCode) { this.participantCode = participantCode; }
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
}
