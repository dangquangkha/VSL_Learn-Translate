package com.vsl.collection.dto;

public class SessionStartRequest {
    private String participantCode;
    private String notes;

    public SessionStartRequest() {}

    public String getParticipantCode() { return participantCode; }
    public void setParticipantCode(String participantCode) { this.participantCode = participantCode; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
