package com.vsl.modelregistry.repository;

import com.vsl.modelregistry.entity.ModelVersion;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, UUID> {

    Optional<ModelVersion> findByActiveTrue();

    Page<ModelVersion> findAllByOrderByCreatedAtDesc(Pageable pageable);

    List<ModelVersion> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM ModelVersion m ORDER BY m.id")
    List<ModelVersion> lockAll();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE ModelVersion m SET m.active = false WHERE m.active = true")
    void deactivateAll();

    boolean existsBySemver(String semver);
}
