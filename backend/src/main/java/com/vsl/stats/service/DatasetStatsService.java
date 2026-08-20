package com.vsl.stats.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.entity.ModelVersion;
import com.vsl.modelregistry.repository.ModelVersionRepository;
import com.vsl.modelregistry.validation.LabelCatalog;
import com.vsl.participant.ParticipantDirectory;
import com.vsl.participant.ParticipantDirectory.ParticipantProfile;
import com.vsl.stats.dto.AdminStatsDTO;
import com.vsl.stats.dto.PublicStatsDTO;
import com.vsl.stats.repository.DatasetStatsRepository;
import com.vsl.stats.repository.DatasetStatsRepository.DatasetSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

@Service
public class DatasetStatsService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DatasetStatsService.class);
    private static final List<String> METADATA_AXES = List.of("region", "handedness", "knowsVsl", "ageGroup");

    private final DatasetStatsRepository statsRepository;
    private final LabelCatalog labels;
    private final ModelVersionRepository modelRepository;
    private final ParticipantDirectory participants;
    @SuppressWarnings("unused")
    private final ObjectMapper objectMapper;

    public DatasetStatsService(DatasetStatsRepository statsRepository, LabelCatalog labels,
                               ModelVersionRepository modelRepository, ParticipantDirectory participants,
                               ObjectMapper objectMapper) {
        this.statsRepository = statsRepository;
        this.labels = labels;
        this.modelRepository = modelRepository;
        this.participants = participants;
        this.objectMapper = objectMapper;
    }

    // EARS[FR-013, FR-014, FR-026]: public aggregates fail closed and use publish consent only.
    @Transactional(readOnly = true)
    public PublicStatsDTO getPublicStats() {
        try {
            DatasetSnapshot snapshot = checkedSnapshot(DatasetStatsRepository.Scope.PUBLIC_CONSENTED);
            BaseStats base = baseStats(snapshot);
            ModelEvaluation evaluation = modelRepository.findByActiveTrue()
                    .map(this::publicEvaluation)
                    .orElseGet(ModelEvaluation::noActiveModel);
            return new PublicStatsDTO(
                    "PUBLIC_CONSENTED", Instant.now(),
                    base.total(), base.accepted(), base.rejected(), base.needsReview(), base.pending(),
                    base.contributors(), labels.labels().size(), base.averagePerContributor(),
                    base.rejectionRate(), base.clipsPerClass(), base.metadataDistribution(),
                    evaluation.status(), evaluation.publishedCount(), evaluation.withheldCount(), evaluation.body());
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw unavailable(exception);
        }
    }

    // EARS[FR-013, FR-015, FR-026]: admin aggregates use latest use_in_project consent.
    @Transactional(readOnly = true)
    public AdminStatsDTO getAdminStats() {
        try {
            DatasetSnapshot snapshot = checkedSnapshot(DatasetStatsRepository.Scope.ADMIN_INTERNAL);
            BaseStats base = baseStats(snapshot);
            Map<Integer, String> codes = labelCodes();
            List<AdminStatsDTO.ContributorProgress> progress = snapshot.contributorProgress().stream()
                    .map(value -> new AdminStatsDTO.ContributorProgress(
                            value.participantCode(), value.acceptedCount(), value.targetCount(),
                            value.targetCount() == 0 ? 0d
                                    : Math.min(100d, value.acceptedCount() * 100d / value.targetCount())))
                    .toList();
            List<AdminStatsDTO.RejectionRateBySign> rejectionBySign = snapshot.rejectionRateBySign().stream()
                    .map(value -> new AdminStatsDTO.RejectionRateBySign(
                            value.labelId(), codes.getOrDefault(value.labelId(), "unknown"),
                            value.acceptedCount(), value.rejectedCount(),
                            rejectionRate(value.acceptedCount(), value.rejectedCount())))
                    .toList();
            List<AdminStatsDTO.ModelMetricsHistory> modelHistory = modelRepository
                    .findAllByOrderByCreatedAtDesc().stream()
                    .map(model -> new AdminStatsDTO.ModelMetricsHistory(
                            model.getId(), model.getSemver(), model.isActive(), model.isReleaseEligible(),
                            model.getMetrics(), model.getCreatedAt()))
                    .toList();
            return new AdminStatsDTO(
                    "ADMIN_INTERNAL", Instant.now(),
                    base.total(), base.accepted(), base.rejected(), base.needsReview(), base.pending(),
                    base.contributors(), labels.labels().size(), base.averagePerContributor(),
                    base.rejectionRate(), base.clipsPerClass(), base.metadataDistribution(),
                    progress, rejectionBySign, modelHistory);
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw unavailable(exception);
        }
    }

    private DatasetSnapshot checkedSnapshot(DatasetStatsRepository.Scope scope) {
        DatasetSnapshot snapshot = statsRepository.load(scope);
        if (snapshot == null || snapshot.counts() == null || snapshot.consentViolationCount() != 0) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STATS_UNAVAILABLE",
                    "Dataset statistics could not be produced safely");
        }
        return snapshot;
    }

    private BaseStats baseStats(DatasetSnapshot snapshot) {
        DatasetStatsRepository.Counts counts = snapshot.counts();
        List<PublicStatsDTO.ClassCount> perClass = labels.labels().stream()
                .map(label -> new PublicStatsDTO.ClassCount(
                        label.id(), label.code(), snapshot.acceptedByLabel().getOrDefault(label.id(), 0L)))
                .toList();
        Map<String, List<PublicStatsDTO.DistributionCount>> distribution = new LinkedHashMap<>();
        for (String axis : METADATA_AXES) {
            distribution.put(axis, snapshot.metadataDistribution().getOrDefault(axis, List.of()).stream()
                    .map(value -> new PublicStatsDTO.DistributionCount(value.key(), value.count()))
                    .toList());
        }
        double average = counts.contributors() == 0 ? 0d : (double) counts.accepted() / counts.contributors();
        return new BaseStats(counts.total(), counts.accepted(), counts.rejected(), counts.needsReview(),
                counts.pending(), counts.contributors(), average,
                rejectionRate(counts.accepted(), counts.rejected()), perClass, Map.copyOf(distribution));
    }

    private ModelEvaluation publicEvaluation(ModelVersion model) {
        JsonNode metrics = model.getMetrics();
        List<InternalSubjectAccuracy> allEntries = new ArrayList<>();
        Set<String> codes = new HashSet<>();
        JsonNode perSubject = metrics.path("perSubjectAccuracy");
        if (!perSubject.isArray()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STATS_UNAVAILABLE",
                    "Active model evaluation metadata is invalid");
        }
        for (JsonNode entry : perSubject) {
            InternalSubjectAccuracy parsed = new InternalSubjectAccuracy(
                    entry.path("participantCode").asText(), entry.path("split").asText(),
                    entry.path("top1Accuracy").asDouble(), entry.path("top3Accuracy").asDouble(),
                    entry.path("sampleCount").asInt());
            if (parsed.code().isBlank() || !Set.of("TEST_A", "TEST_B").contains(parsed.split())
                    || parsed.sampleCount() <= 0) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STATS_UNAVAILABLE",
                        "Active model evaluation metadata is invalid");
            }
            allEntries.add(parsed);
            codes.add(parsed.code());
        }

        Map<String, ParticipantProfile> profiles = participants.findByCodes(codes);
        if (!profiles.keySet().containsAll(codes)) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STATS_UNAVAILABLE",
                    "Test-subject consent metadata is incomplete");
        }

        Set<String> publishedSubjects = new HashSet<>();
        Set<String> withheldSubjects = new HashSet<>();
        List<InternalSubjectAccuracy> publishedEntries = new ArrayList<>();
        for (InternalSubjectAccuracy entry : allEntries) {
            if (profiles.get(entry.code()).publishDataset()) {
                publishedEntries.add(entry);
                publishedSubjects.add(entry.code());
            } else {
                withheldSubjects.add(entry.code());
            }
        }
        publishedEntries.sort(Comparator
                .comparingInt((InternalSubjectAccuracy value) -> splitOrder(value.split()))
                .thenComparing(InternalSubjectAccuracy::code));

        Map<String, Integer> aliasCounters = new LinkedHashMap<>();
        List<PublicStatsDTO.SubjectAccuracy> publicEntries = publishedEntries.stream()
                .map(entry -> {
                    int next = aliasCounters.merge(entry.split(), 1, Integer::sum);
                    String prefix = "TEST_A".equals(entry.split()) ? "TEST-A-" : "TEST-B-";
                    return new PublicStatsDTO.SubjectAccuracy(prefix + "%02d".formatted(next), entry.split(),
                            entry.top1(), entry.top3(), entry.sampleCount());
                })
                .toList();

        AccuracyPair testA = weighted(publishedEntries, "TEST_A");
        AccuracyPair testB = weighted(publishedEntries, "TEST_B");
        String status;
        if (publishedSubjects.isEmpty()) {
            status = "NO_PUBLISHABLE_TEST_METRICS";
        } else if (!withheldSubjects.isEmpty()) {
            status = "PARTIAL_PUBLISH_CONSENT";
        } else {
            status = "AVAILABLE";
        }

        PublicStatsDTO.ActiveModelEvaluation body = new PublicStatsDTO.ActiveModelEvaluation(
                model.getSemver(), testA.top1(), testA.top3(), testB.top1(), testB.top3(),
                metrics.path("browserLatencyMs").asDouble(),
                metrics.path("throughputPredictionsPerSecond").asDouble(),
                metrics.path("modelSizeBytes").asLong(), metrics.path("quantization").asText(),
                metrics.path("goldenSampleCount").asInt(), metrics.path("goldenMaxLogitDiff").asDouble(),
                publicEntries, publicMetadataAccuracy(publishedEntries, profiles), stringList(metrics.path("knownLimitations")));
        return new ModelEvaluation(status, publishedSubjects.size(), withheldSubjects.size(), body);
    }

    private static Map<String, List<PublicStatsDTO.MetadataAccuracy>> publicMetadataAccuracy(
            List<InternalSubjectAccuracy> entries, Map<String, ParticipantProfile> profiles) {
        Map<String, Function<ParticipantProfile, String>> dimensions = new LinkedHashMap<>();
        dimensions.put("handedness", profile -> safe(profile.handedness()));
        dimensions.put("knowsVsl", profile -> Boolean.toString(profile.knowsVsl()));
        dimensions.put("ageGroup", profile -> safe(profile.ageGroup()));
        dimensions.put("region", profile -> safe(profile.region()));

        Map<String, List<PublicStatsDTO.MetadataAccuracy>> result = new LinkedHashMap<>();
        for (Map.Entry<String, Function<ParticipantProfile, String>> dimension : dimensions.entrySet()) {
            Map<String, WeightedValue> grouped = new java.util.TreeMap<>();
            for (InternalSubjectAccuracy entry : entries) {
                String key = dimension.getValue().apply(profiles.get(entry.code()));
                grouped.computeIfAbsent(key, ignored -> new WeightedValue())
                        .add(entry.top1(), entry.sampleCount());
            }
            result.put(dimension.getKey(), grouped.entrySet().stream()
                    .map(value -> new PublicStatsDTO.MetadataAccuracy(
                            value.getKey(), value.getValue().average(), value.getValue().sampleCount))
                    .toList());
        }
        return Map.copyOf(result);
    }

    private static AccuracyPair weighted(List<InternalSubjectAccuracy> entries, String split) {
        double top1 = 0d;
        double top3 = 0d;
        long samples = 0;
        for (InternalSubjectAccuracy entry : entries) {
            if (split.equals(entry.split())) {
                top1 += entry.top1() * entry.sampleCount();
                top3 += entry.top3() * entry.sampleCount();
                samples += entry.sampleCount();
            }
        }
        return samples == 0 ? new AccuracyPair(null, null)
                : new AccuracyPair(top1 / samples, top3 / samples);
    }

    private Map<Integer, String> labelCodes() {
        Map<Integer, String> result = new LinkedHashMap<>();
        labels.labels().forEach(label -> result.put(label.id(), label.code()));
        return result;
    }

    private static List<String> stringList(JsonNode node) {
        if (!node.isArray()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        node.forEach(value -> {
            if (value.isTextual()) {
                result.add(value.asText());
            }
        });
        return List.copyOf(result);
    }

    private static int splitOrder(String split) {
        return "TEST_A".equals(split) ? 0 : 1;
    }

    private static String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private static double rejectionRate(long accepted, long rejected) {
        long denominator = accepted + rejected;
        return denominator == 0 ? 0d : (double) rejected / denominator;
    }

    private static ApiException unavailable(RuntimeException cause) {
        LOGGER.warn("Stats generation failed safely: {}", cause.getClass().getSimpleName());
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STATS_UNAVAILABLE",
                "Dataset statistics are temporarily unavailable");
    }

    private record BaseStats(
            long total,
            long accepted,
            long rejected,
            long needsReview,
            long pending,
            long contributors,
            double averagePerContributor,
            double rejectionRate,
            List<PublicStatsDTO.ClassCount> clipsPerClass,
            Map<String, List<PublicStatsDTO.DistributionCount>> metadataDistribution
    ) {
    }

    private record InternalSubjectAccuracy(
            String code, String split, double top1, double top3, int sampleCount
    ) {
    }

    private record AccuracyPair(Double top1, Double top3) {
    }

    private record ModelEvaluation(
            String status,
            int publishedCount,
            int withheldCount,
            PublicStatsDTO.ActiveModelEvaluation body
    ) {
        private static ModelEvaluation noActiveModel() {
            return new ModelEvaluation("NO_ACTIVE_MODEL", 0, 0, null);
        }
    }

    private static final class WeightedValue {
        private double weightedSum;
        private long sampleCount;

        private WeightedValue add(double value, long samples) {
            weightedSum += value * samples;
            sampleCount += samples;
            return this;
        }

        private double average() {
            return sampleCount == 0 ? 0d : weightedSum / sampleCount;
        }
    }
}
