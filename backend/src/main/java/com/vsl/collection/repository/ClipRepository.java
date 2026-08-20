package com.vsl.collection.repository;

import com.vsl.collection.entity.Clip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClipRepository extends JpaRepository<Clip, Long> {
    List<Clip> findBySessionId(Long sessionId);
    List<Clip> findByParticipantId(Long participantId);
    List<Clip> findByLabel(String label);
    List<Clip> findByQualityStatus(Clip.QualityStatus qualityStatus);
    long countByParticipantIdAndLabel(Long participantId, String label);
}
