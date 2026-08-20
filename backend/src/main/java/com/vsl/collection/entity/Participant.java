package com.vsl.collection.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

// EARS[FR-C01]: Participant entity — stores anonymous contributor metadata
@Entity
@Table(name = "participants")
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "participant_code", nullable = false, unique = true)
    private String participantCode;

    @Column(name = "user_id")
    private Long userId;

    private Integer age;

    @Column(length = 32)
    private String gender;

    @Column(name = "deaf_status", length = 64)
    private String deafStatus;

    @Column(name = "dominant_hand", length = 16)
    private String dominantHand;

    @Column(length = 128)
    private String location;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public Participant() {}

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getParticipantCode() { return participantCode; }
    public void setParticipantCode(String participantCode) { this.participantCode = participantCode; }
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
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
