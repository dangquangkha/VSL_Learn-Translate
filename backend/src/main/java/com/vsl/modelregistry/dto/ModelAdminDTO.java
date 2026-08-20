package com.vsl.modelregistry.dto;

import com.fasterxml.jackson.databind.JsonNode;
import com.vsl.modelregistry.validation.ModelContract.InputSignature;

import java.time.Instant;
import java.util.UUID;

public record ModelAdminDTO(
        UUID id,
        String semver,
        String labelsHash,
        String artifactSha256,
        InputSignature inputSignature,
        JsonNode metrics,
        boolean releaseEligible,
        JsonNode validationResults,
        boolean active,
        Instant createdAt
) {
}
