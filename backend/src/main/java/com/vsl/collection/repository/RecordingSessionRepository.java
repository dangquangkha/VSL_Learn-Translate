package com.vsl.collection.repository;

import com.vsl.collection.entity.RecordingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecordingSessionRepository extends JpaRepository<RecordingSession, Long> {
    Optional<RecordingSession> findBySessionCode(String sessionCode);
    List<RecordingSession> findByParticipantId(Long participantId);
}
