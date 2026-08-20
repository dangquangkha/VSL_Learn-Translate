package com.vsl.collection.dto;

public class ParticipantCreateRequest {
    private Long userId;
    private Integer age;
    private String gender;
    private String deafStatus;
    private String dominantHand;
    private String location;
    private String notes;
    private String consentVersion = "v1.0";
    private String ipAddress;

    public ParticipantCreateRequest() {}

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public String getDeafStatus() { return deafStatus; }
    public void setDeafStatus(String deafStatus) { this.deafStatus = deafStatus; }
    public String getDominantHand() { return dominantHand; }
    public void setDominantHand(String dominantHand) { this.dominantHand = dominantHand; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getConsentVersion() { return consentVersion; }
    public void setConsentVersion(String consentVersion) { this.consentVersion = consentVersion; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
