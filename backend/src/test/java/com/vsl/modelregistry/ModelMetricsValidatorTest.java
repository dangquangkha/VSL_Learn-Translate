package com.vsl.modelregistry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.validation.ModelMetricsValidator;
import com.vsl.participant.ParticipantDirectory;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ModelMetricsValidatorTest {

    private final ParticipantDirectory participants = codes -> MetricsFixture.participants().entrySet().stream()
            .filter(entry -> codes.contains(entry.getKey()))
            .collect(java.util.stream.Collectors.toMap(
                    java.util.Map.Entry::getKey, java.util.Map.Entry::getValue));
    private final ModelMetricsValidator validator = new ModelMetricsValidator(new ObjectMapper(), participants);

    @Test
    void validatesEvidenceAndOverwritesCallerSuppliedModelSize() {
        ModelMetricsValidator.ValidatedMetrics result = validator.validate(MetricsFixture.validMetrics(), 1234);

        assertThat(result.normalized().path("modelSizeBytes").asLong()).isEqualTo(1234);
        assertThat(result.releaseEligible()).isTrue();
        assertThat(result.validationResults().path("goldenContract").asText()).isEqualTo("PASSED");
    }

    @Test
    void validButLowAccuracyRemainsRegistrableAndInactive() {
        String lowAccuracy = MetricsFixture.validMetrics().replace(
                "\"top1AccuracyTestA\": 0.90", "\"top1AccuracyTestA\": 0.84");

        assertThat(validator.validate(lowAccuracy, 1234).releaseEligible()).isFalse();
    }

    @Test
    void goldenContractIsAHardRegistrationGate() {
        String failedGolden = MetricsFixture.validMetrics().replace("0.0005", "0.001");

        assertThatThrownBy(() -> validator.validate(failedGolden, 1234))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("GOLDEN_CONTRACT_FAILED"));
    }

    @Test
    void rejectsSubjectIdentityLeakage() {
        String teamInTest = MetricsFixture.validMetrics()
                .replace("{\"participantCode\": \"TEAM-01\", \"split\": \"TRAIN\"}",
                        "{\"participantCode\": \"TEAM-01\", \"split\": \"TEST_A\"}");

        assertThatThrownBy(() -> validator.validate(teamInTest, 1234))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("EVALUATION_SPLIT_INVALID"));
    }

    @Test
    void rejectsMissingRequiredMetadata() {
        String missingQuantization = MetricsFixture.validMetrics().replace("\"quantization\": \"fp32\",", "");

        assertThatThrownBy(() -> validator.validate(missingQuantization, 1234))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("INVALID_MODEL_METADATA"));
    }
}
