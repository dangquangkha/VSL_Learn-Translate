package com.vsl.collection.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

// EARS[FR-C02]: Consent entity — records participant's explicit consent
@Entity
@Table(name = "consents")
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "participant_id", nullable = false)
    private Long participantId;

    @Column(name = "consent_given", nullable = false)
    private Boolean consentGiven = true;

    @Column(name = "consent_version", nullable = false, length = 32)
    private String consentVersion = "v1.0";

    @Column(name = "consent_timestamp", nullable = false)
    private OffsetDateTime consentTimestamp;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    public Consent() {}

    @PrePersist
    protected void onCreate() {
        if (consentTimestamp == null) consentTimestamp = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public Long getParticipantId() { return participantId; }
    public void setParticipantId(Long participantId) { this.participantId = participantId; }
    public Boolean getConsentGiven() { return consentGiven; }
    public void setConsentGiven(Boolean consentGiven) { this.consentGiven = consentGiven; }
    public String getConsentVersion() { return consentVersion; }
    public void setConsentVersion(String consentVersion) { this.consentVersion = consentVersion; }
    public OffsetDateTime getConsentTimestamp() { return consentTimestamp; }
    public void setConsentTimestamp(OffsetDateTime consentTimestamp) { this.consentTimestamp = consentTimestamp; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}
