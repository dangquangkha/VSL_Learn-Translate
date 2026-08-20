package com.vsl.modelregistry.validation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.vsl.common.api.ApiException;
import com.vsl.participant.ParticipantDirectory;
import com.vsl.participant.ParticipantDirectory.ParticipantProfile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public final class ModelMetricsValidator {

    private static final Pattern SHA256 = Pattern.compile("[0-9a-f]{64}");
    private static final Pattern GIT_SHA = Pattern.compile("[0-9a-f]{7,40}");
    private static final Set<String> SPLITS = Set.of("TRAIN", "VAL", "TEST_A", "TEST_B");
    private static final Set<String> METADATA_AXES = Set.of("handedness", "knowsVsl", "ageGroup", "region");

    private final ObjectMapper objectMapper;
    private final ParticipantDirectory participants;

    public ModelMetricsValidator(ObjectMapper objectMapper, ParticipantDirectory participants) {
        this.objectMapper = objectMapper;
        this.participants = participants;
    }

    // EARS[FR-002, FR-005, FR-020]: validate release evidence before any storage mutation.
    public ValidatedMetrics validate(String metricsJson, long actualModelSizeBytes) {
        ObjectNode metrics = parse(metricsJson);

        double top1A = ratio(metrics, "top1AccuracyTestA");
        double top3A = ratio(metrics, "top3AccuracyTestA");
        if (top3A < top1A) {
            throw invalidMetadata("top3AccuracyTestA must be greater than or equal to top1AccuracyTestA");
        }
        optionalRatio(metrics, "top1AccuracyTestB");
        optionalRatio(metrics, "top3AccuracyTestB");
        ratio(metrics, "worstClassRecall");
        nonNegative(metrics, "idleFalsePositivesPer60s");
        double browserLatency = nonNegative(metrics, "browserLatencyMs");
        nonNegative(metrics, "throughputPredictionsPerSecond");
        requiredText(metrics, "quantization");

        int goldenCount = requiredInteger(metrics, "goldenSampleCount", 1);
        double goldenDiff = nonNegative(metrics, "goldenMaxLogitDiff");
        if (goldenCount != ModelContract.GOLDEN_SAMPLE_COUNT
                || goldenDiff >= ModelContract.MAX_GOLDEN_LOGIT_DIFF) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "GOLDEN_CONTRACT_FAILED",
                    "T-02 requires exactly 20 samples and max logit difference below 0.001");
        }

        validateBenchmark(metrics.path("benchmarkEnvironment"));
        requirePattern(metrics, "datasetManifestSha256", SHA256);
        requirePattern(metrics, "splitManifestSha256", SHA256);
        requirePattern(metrics, "trainingCodeCommit", GIT_SHA);
        requireUtc(metrics, "trainedAt");
        validateKnownLimitations(metrics.path("knownLimitations"));

        Map<String, String> assignments = validateAssignments(metrics.path("subjectSplitAssignments"));
        validatePerSubjectAccuracy(metrics.path("perSubjectAccuracy"), assignments, metrics);
        validateAccuracyByMetadata(metrics.path("accuracyByMetadata"));

        metrics.put("modelSizeBytes", actualModelSizeBytes);
        boolean releaseEligible = top1A >= ModelContract.MIN_TOP1_TEST_A
                && browserLatency <= ModelContract.MAX_BROWSER_LATENCY_MS
                && actualModelSizeBytes <= ModelContract.MAX_MODEL_BYTES;

        ObjectNode validation = objectMapper.createObjectNode();
        validation.put("metadataSchema", "PASSED");
        validation.put("goldenContract", "PASSED");
        validation.put("subjectIndependentSplit", "PASSED");
        ObjectNode activation = validation.putObject("activationGates");
        activation.put("top1AccuracyTestA", top1A >= ModelContract.MIN_TOP1_TEST_A ? "PASSED" : "FAILED");
        activation.put("browserLatencyMs", browserLatency <= ModelContract.MAX_BROWSER_LATENCY_MS ? "PASSED" : "FAILED");
        activation.put("modelSizeBytes", actualModelSizeBytes <= ModelContract.MAX_MODEL_BYTES ? "PASSED" : "FAILED");
        return new ValidatedMetrics(metrics, releaseEligible, validation);
    }

    private ObjectNode parse(String metricsJson) {
        if (metricsJson == null || metricsJson.isBlank()) {
            throw invalidMetadata("metrics is required");
        }
        try {
            JsonNode parsed = objectMapper.readTree(metricsJson);
            if (!(parsed instanceof ObjectNode object)) {
                throw invalidMetadata("metrics must be a JSON object");
            }
            return object.deepCopy();
        } catch (JsonProcessingException exception) {
            throw invalidMetadata("metrics is not valid JSON");
        }
    }

    private Map<String, String> validateAssignments(JsonNode node) {
        if (!(node instanceof ArrayNode assignmentsNode) || assignmentsNode.isEmpty()) {
            throw invalidMetadata("subjectSplitAssignments must be a non-empty array");
        }
        Map<String, String> assignments = new LinkedHashMap<>();
        for (JsonNode assignment : assignmentsNode) {
            String code = text(assignment, "participantCode");
            String split = text(assignment, "split");
            if (!SPLITS.contains(split) || assignments.put(code, split) != null) {
                throw splitInvalid("Each participant must occur in exactly one valid split");
            }
        }

        Map<String, ParticipantProfile> profiles;
        try {
            profiles = participants.findByCodes(assignments.keySet());
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PARTICIPANT_DIRECTORY_UNAVAILABLE",
                    "Participant metadata is unavailable for split validation");
        }
        if (!profiles.keySet().containsAll(assignments.keySet())) {
            throw splitInvalid("Every subject split participant must exist");
        }

        boolean hasTestB = assignments.containsValue("TEST_B");
        for (Map.Entry<String, String> entry : assignments.entrySet()) {
            ParticipantProfile profile = profiles.get(entry.getKey());
            String split = entry.getValue();
            if (profile.teamMember() && !"TRAIN".equals(split)) {
                throw splitInvalid("Team members may only occur in TRAIN");
            }
            if (!"TRAIN".equals(split) && profile.teamMember()) {
                throw splitInvalid("VAL and TEST splits must contain external participants");
            }
            if ("TEST_A".equals(split) && profile.knowsVsl()) {
                throw splitInvalid("Participants who know VSL may not occur in TEST_A");
            }
            if ("TEST_B".equals(split) && !profile.knowsVsl()) {
                throw splitInvalid("TEST_B is reserved for participants who know VSL");
            }
            if (hasTestB && profile.knowsVsl() && !"TEST_B".equals(split)) {
                throw splitInvalid("When TEST_B exists, VSL signers must occur only in TEST_B");
            }
        }
        return Map.copyOf(assignments);
    }

    private void validatePerSubjectAccuracy(JsonNode node, Map<String, String> assignments, JsonNode metrics) {
        if (!(node instanceof ArrayNode entries)) {
            throw invalidMetadata("perSubjectAccuracy must be an array");
        }
        Set<String> seen = new HashSet<>();
        Set<String> measuredSubjects = new HashSet<>();
        for (JsonNode entry : entries) {
            String code = text(entry, "participantCode");
            String split = text(entry, "split");
            if (!Set.of("TEST_A", "TEST_B").contains(split)
                    || !split.equals(assignments.get(code)) || !seen.add(code + "\u0000" + split)) {
                throw splitInvalid("perSubjectAccuracy must uniquely match TEST_A/TEST_B assignments");
            }
            double top1 = ratio(entry, "top1Accuracy");
            double top3 = ratio(entry, "top3Accuracy");
            if (top3 < top1 || requiredInteger(entry, "sampleCount", 1) < 1) {
                throw invalidMetadata("Per-subject accuracy values are inconsistent");
            }
            measuredSubjects.add(code);
        }
        for (Map.Entry<String, String> assignment : assignments.entrySet()) {
            if (Set.of("TEST_A", "TEST_B").contains(assignment.getValue())
                    && !measuredSubjects.contains(assignment.getKey())) {
                throw splitInvalid("Every test subject must have per-subject accuracy evidence");
            }
        }

        boolean hasTestB = assignments.containsValue("TEST_B");
        boolean hasTop1B = present(metrics, "top1AccuracyTestB");
        boolean hasTop3B = present(metrics, "top3AccuracyTestB");
        if (hasTestB != (hasTop1B && hasTop3B)) {
            throw invalidMetadata("TEST_B aggregate metrics must be present exactly when TEST_B exists");
        }
        if (hasTestB && ratio(metrics, "top3AccuracyTestB")
                < ratio(metrics, "top1AccuracyTestB")) {
            throw invalidMetadata("top3AccuracyTestB must be greater than or equal to top1AccuracyTestB");
        }
    }

    private void validateAccuracyByMetadata(JsonNode node) {
        if (!node.isObject() || !toFieldSet(node).equals(METADATA_AXES)) {
            throw invalidMetadata("accuracyByMetadata must contain handedness, knowsVsl, ageGroup, and region");
        }
        for (String axis : METADATA_AXES) {
            JsonNode values = node.path(axis);
            if (!values.isArray()) {
                throw invalidMetadata("Every accuracyByMetadata axis must be an array");
            }
            Set<String> keys = new HashSet<>();
            for (JsonNode value : values) {
                String key = text(value, "key");
                if (!keys.add(key)) {
                    throw invalidMetadata("Metadata accuracy keys must be unique per axis");
                }
                ratio(value, "accuracy");
                requiredInteger(value, "sampleCount", 1);
            }
        }
    }

    private static Set<String> toFieldSet(JsonNode node) {
        Set<String> fields = new HashSet<>();
        node.fieldNames().forEachRemaining(fields::add);
        return fields;
    }

    private static void validateBenchmark(JsonNode node) {
        if (!node.isObject()) {
            throw invalidMetadata("benchmarkEnvironment must be an object");
        }
        for (String field : Set.of("browser", "browserVersion", "os", "cpu")) {
            requiredText(node, field);
        }
        requiredInteger(node, "wasmThreads", 1);
        requireUtc(node, "measuredAt");
    }

    private static void validateKnownLimitations(JsonNode node) {
        if (!node.isArray() || node.isEmpty()) {
            throw invalidMetadata("knownLimitations must be a non-empty string array");
        }
        for (JsonNode limitation : node) {
            if (!limitation.isTextual() || limitation.asText().isBlank()) {
                throw invalidMetadata("knownLimitations must contain only non-empty strings");
            }
        }
    }

    private static double ratio(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isNumber() || !Double.isFinite(value.asDouble())
                || value.asDouble() < 0d || value.asDouble() > 1d) {
            throw invalidMetadata(field + " must be a number in [0,1]");
        }
        return value.asDouble();
    }

    private static void optionalRatio(JsonNode node, String field) {
        if (present(node, field)) {
            ratio(node, field);
        }
    }

    private static double nonNegative(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isNumber() || !Double.isFinite(value.asDouble()) || value.asDouble() < 0d) {
            throw invalidMetadata(field + " must be a non-negative number");
        }
        return value.asDouble();
    }

    private static int requiredInteger(JsonNode node, String field, int minimum) {
        JsonNode value = node.get(field);
        if (value == null || !value.isIntegralNumber() || !value.canConvertToInt() || value.asInt() < minimum) {
            throw invalidMetadata(field + " must be an integer >= " + minimum);
        }
        return value.asInt();
    }

    private static String requiredText(JsonNode node, String field) {
        String value = text(node, field);
        if (value.isBlank()) {
            throw invalidMetadata(field + " must be a non-empty string");
        }
        return value;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) {
            throw invalidMetadata(field + " must be a string");
        }
        return value.asText();
    }

    private static void requirePattern(JsonNode node, String field, Pattern pattern) {
        if (!pattern.matcher(requiredText(node, field)).matches()) {
            throw invalidMetadata(field + " has an invalid format");
        }
    }

    private static void requireUtc(JsonNode node, String field) {
        try {
            OffsetDateTime parsed = OffsetDateTime.parse(requiredText(node, field));
            if (!ZoneOffset.UTC.equals(parsed.getOffset())) {
                throw invalidMetadata(field + " must use UTC");
            }
        } catch (DateTimeParseException exception) {
            throw invalidMetadata(field + " must be an ISO-8601 UTC timestamp");
        }
    }

    private static boolean present(JsonNode node, String field) {
        return node != null && node.has(field) && !node.get(field).isNull();
    }

    private static ApiException invalidMetadata(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_METADATA", message);
    }

    private static ApiException splitInvalid(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "EVALUATION_SPLIT_INVALID", message);
    }

    public record ValidatedMetrics(ObjectNode normalized, boolean releaseEligible, ObjectNode validationResults) {
    }
}
