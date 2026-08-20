package com.vsl.modelregistry.dto;

import com.vsl.modelregistry.validation.ModelContract.InputSignature;

import java.time.Instant;
import java.util.UUID;

public record ActiveModelDTO(
        UUID id,
        String semver,
        String labelsHash,
        String artifactSha256,
        InputSignature inputSignature,
        String downloadUrl,
        Instant downloadUrlExpiresAt
) {
}
