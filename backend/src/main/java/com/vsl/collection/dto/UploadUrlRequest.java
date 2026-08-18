package com.vsl.collection.dto;

public class UploadUrlRequest {
    private Long sessionId;
    private String participantCode;
    private Long signId;
    private String fileType; // video/webm or application/octet-stream
    private String target;   // VIDEO or LANDMARK

    public UploadUrlRequest() {}
    public UploadUrlRequest(Long sessionId, String participantCode, Long signId, String fileType, String target) {
        this.sessionId = sessionId;
        this.participantCode = participantCode;
        this.signId = signId;
        this.fileType = fileType;
        this.target = target;
    }

    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }

    public String getParticipantCode() { return participantCode; }
    public void setParticipantCode(String participantCode) { this.participantCode = participantCode; }

    public Long getSignId() { return signId; }
    public void setSignId(Long signId) { this.signId = signId; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getTarget() { return target; }
    public void setTarget(String target) { this.target = target; }
}
