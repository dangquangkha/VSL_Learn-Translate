package com.vsl.collection.dto;

import com.vsl.collection.entity.Participant;
import java.time.OffsetDateTime;

public class ParticipantResponse {
    private Long id;
    private String participantCode;
    private Long userId;
    private Integer age;
    private String gender;
    private String deafStatus;
    private String dominantHand;
    private String location;
    private OffsetDateTime createdAt;

    public ParticipantResponse() {}

    public static ParticipantResponse fromEntity(Participant p) {
        ParticipantResponse r = new ParticipantResponse();
        r.id = p.getId();
        r.participantCode = p.getParticipantCode();
        r.userId = p.getUserId();
        r.age = p.getAge();
        r.gender = p.getGender();
        r.deafStatus = p.getDeafStatus();
        r.dominantHand = p.getDominantHand();
        r.location = p.getLocation();
        r.createdAt = p.getCreatedAt();
        return r;
    }

    public Long getId() { return id; }
    public String getParticipantCode() { return participantCode; }
    public Long getUserId() { return userId; }
    public Integer getAge() { return age; }
    public String getGender() { return gender; }
    public String getDeafStatus() { return deafStatus; }
    public String getDominantHand() { return dominantHand; }
    public String getLocation() { return location; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
