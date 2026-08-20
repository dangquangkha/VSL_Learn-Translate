package com.vsl.collection.service;

import com.vsl.collection.dto.*;
import com.vsl.collection.entity.*;
import com.vsl.collection.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

// EARS[FR-C01, FR-C02, FR-C03, FR-C04]: Collection management service logic
@Service
public class CollectionService {

    private final ParticipantRepository participantRepository;
    private final ConsentRepository consentRepository;
    private final RecordingSessionRepository sessionRepository;
    private final ClipRepository clipRepository;

    public CollectionService(ParticipantRepository participantRepository,
                             ConsentRepository consentRepository,
                             RecordingSessionRepository sessionRepository,
                             ClipRepository clipRepository) {
        this.participantRepository = participantRepository;
        this.consentRepository = consentRepository;
        this.sessionRepository = sessionRepository;
        this.clipRepository = clipRepository;
    }

    @Transactional
    public ParticipantResponse registerParticipant(ParticipantCreateRequest request) {
        String code = "P" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Participant p = new Participant();
        p.setParticipantCode(code);
        p.setUserId(request.getUserId());
        p.setAge(request.getAge());
        p.setGender(request.getGender());
        p.setDeafStatus(request.getDeafStatus());
        p.setDominantHand(request.getDominantHand());
        p.setLocation(request.getLocation());
        p.setNotes(request.getNotes());
        Participant saved = participantRepository.save(p);

        Consent consent = new Consent();
        consent.setParticipantId(saved.getId());
        consent.setConsentGiven(true);
        consent.setConsentVersion(request.getConsentVersion() != null ? request.getConsentVersion() : "v1.0");
        consent.setIpAddress(request.getIpAddress());
        consentRepository.save(consent);

        return ParticipantResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public ParticipantResponse getParticipantByCode(String code) {
        Participant p = participantRepository.findByParticipantCode(code)
                .orElseThrow(() -> new IllegalArgumentException("PARTICIPANT_NOT_FOUND"));
        return ParticipantResponse.fromEntity(p);
    }

    @Transactional
    public SessionResponse startSession(SessionStartRequest request) {
        Participant p = participantRepository.findByParticipantCode(request.getParticipantCode())
                .orElseThrow(() -> new IllegalArgumentException("PARTICIPANT_NOT_FOUND"));

        String sessionCode = "SES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        RecordingSession s = new RecordingSession();
        s.setSessionCode(sessionCode);
        s.setParticipantId(p.getId());
        s.setStatus(RecordingSession.Status.ACTIVE);
        s.setNotes(request.getNotes());
        s.setStartedAt(OffsetDateTime.now());

        RecordingSession saved = sessionRepository.save(s);
        return SessionResponse.fromEntity(saved);
    }

    @Transactional
    public SessionResponse completeSession(String sessionCode) {
        RecordingSession s = sessionRepository.findBySessionCode(sessionCode)
                .orElseThrow(() -> new IllegalArgumentException("SESSION_NOT_FOUND"));

        s.setStatus(RecordingSession.Status.COMPLETED);
        s.setEndedAt(OffsetDateTime.now());
        RecordingSession saved = sessionRepository.save(s);
        return SessionResponse.fromEntity(saved);
    }

    @Transactional
    public ClipResponse recordClipMetadata(ClipMetadataRequest request) {
        Participant p = participantRepository.findByParticipantCode(request.getParticipantCode())
                .orElseThrow(() -> new IllegalArgumentException("PARTICIPANT_NOT_FOUND"));

        RecordingSession s = null;
        if (request.getSessionCode() != null && !request.getSessionCode().isBlank()) {
            s = sessionRepository.findBySessionCode(request.getSessionCode()).orElse(null);
        }

        Clip clip = new Clip();
        clip.setParticipantId(p.getId());
        clip.setSessionId(s != null ? s.getId() : null);
        clip.setSignId(request.getSignId());
        clip.setLabel(request.getLabel());
        clip.setR2VideoKey(request.getR2VideoKey());
        clip.setR2LandmarkKey(request.getR2LandmarkKey());
        clip.setDurationSeconds(request.getDurationSeconds());
        clip.setFrameCount(request.getFrameCount());
        clip.setFps(request.getFps());
        clip.setQualityStatus(Clip.QualityStatus.PENDING);

        Clip saved = clipRepository.save(clip);

        if (s != null) {
            s.setTotalClipsRecorded(s.getTotalClipsRecorded() + 1);
            sessionRepository.save(s);
        }

        return ClipResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<ClipResponse> getClipsByParticipant(String participantCode) {
        Participant p = participantRepository.findByParticipantCode(participantCode)
                .orElseThrow(() -> new IllegalArgumentException("PARTICIPANT_NOT_FOUND"));
        return clipRepository.findByParticipantId(p.getId())
                .stream().map(ClipResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClipResponse> getClipsBySession(String sessionCode) {
        RecordingSession s = sessionRepository.findBySessionCode(sessionCode)
                .orElseThrow(() -> new IllegalArgumentException("SESSION_NOT_FOUND"));
        return clipRepository.findBySessionId(s.getId())
                .stream().map(ClipResponse::fromEntity).collect(Collectors.toList());
    }
}
