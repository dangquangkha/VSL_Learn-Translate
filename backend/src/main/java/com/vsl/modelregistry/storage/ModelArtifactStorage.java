package com.vsl.modelregistry.storage;

import java.time.Duration;
import java.time.Instant;

public interface ModelArtifactStorage {

    void put(String key, byte[] content, String contentType);

    void deleteIfExists(String key);

    boolean exists(String key);

    PresignedDownload presignGet(String key, Duration validity);

    record PresignedDownload(String url, Instant expiresAt) {
    }
}
