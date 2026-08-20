package com.vsl.stats;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.MetricsFixture;
import com.vsl.modelregistry.entity.ModelVersion;
import com.vsl.modelregistry.repository.ModelVersionRepository;
import com.vsl.modelregistry.validation.LabelCatalog;
import com.vsl.modelregistry.validation.ModelContract;
import com.vsl.participant.ParticipantDirectory;
import com.vsl.stats.dto.AdminStatsDTO;
import com.vsl.stats.dto.PublicStatsDTO;
import com.vsl.stats.repository.DatasetStatsRepository;
import com.vsl.stats.repository.DatasetStatsRepository.Counts;
import com.vsl.stats.repository.DatasetStatsRepository.DatasetSnapshot;
import com.vsl.stats.repository.DatasetStatsRepository.DistributionCount;
import com.vsl.stats.service.DatasetStatsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessResourceFailureException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatasetStatsServiceTest {

    @Mock
    private DatasetStatsRepository statsRepository;
    @Mock
    private ModelVersionRepository modelRepository;

    private ObjectMapper mapper;
    private DatasetStatsService service;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper().findAndRegisterModules();
        ParticipantDirectory participants = codes -> MetricsFixture.participants().entrySet().stream()
                .filter(entry -> codes.contains(entry.getKey()))
                .collect(java.util.stream.Collectors.toMap(
                        java.util.Map.Entry::getKey, java.util.Map.Entry::getValue));
        service = new DatasetStatsService(statsRepository, new LabelCatalog(mapper), modelRepository,
                participants, mapper);
    }

    @Test
    void publicStatsUseExactFormulasAndAlwaysReturnAll51Labels() {
        when(statsRepository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED)).thenReturn(snapshot());
        when(modelRepository.findByActiveTrue()).thenReturn(Optional.empty());

        PublicStatsDTO result = service.getPublicStats();

        assertThat(result.scope()).isEqualTo("PUBLIC_CONSENTED");
        assertThat(result.totalClips()).isEqualTo(10);
        assertThat(result.averageClipsPerContributor()).isEqualTo(2.0);
        assertThat(result.rejectionRate()).isEqualTo(0.25);
        assertThat(result.totalClasses()).isEqualTo(51);
        assertThat(result.clipsPerClass()).hasSize(51);
        assertThat(result.clipsPerClass().getFirst().code()).isEqualTo("idle");
        assertThat(result.clipsPerClass().getFirst().count()).isZero();
        assertThat(result.clipsPerClass().get(1).count()).isEqualTo(6);
        assertThat(result.modelEvaluationStatus()).isEqualTo("NO_ACTIVE_MODEL");
        assertThat(result.activeModelEvaluation()).isNull();
    }

    @Test
    void publicModelEvaluationFiltersConsentAndUsesUnlinkableAliases() throws Exception {
        when(statsRepository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED)).thenReturn(snapshot());
        when(modelRepository.findByActiveTrue()).thenReturn(Optional.of(activeModel()));

        PublicStatsDTO result = service.getPublicStats();

        assertThat(result.modelEvaluationStatus()).isEqualTo("PARTIAL_PUBLISH_CONSENT");
        assertThat(result.publishedTestSubjectCount()).isEqualTo(1);
        assertThat(result.withheldTestSubjectCount()).isEqualTo(1);
        assertThat(result.activeModelEvaluation().top1AccuracyTestA()).isEqualTo(0.90);
        assertThat(result.activeModelEvaluation().top1AccuracyTestB()).isNull();
        assertThat(result.activeModelEvaluation().perSubjectAccuracy())
                .extracting(PublicStatsDTO.SubjectAccuracy::evaluationAlias)
                .containsExactly("TEST-A-01");
        assertThat(mapper.writeValueAsString(result)).doesNotContain("EXT-A", "EXT-B", "TEAM-01");
    }

    @Test
    void noPublishableTestSubjectUsesNullAccuracyInsteadOfFakeZero() throws Exception {
        ParticipantDirectory nobodyPublishes = codes -> MetricsFixture.participants().entrySet().stream()
                .filter(entry -> codes.contains(entry.getKey()))
                .collect(java.util.stream.Collectors.toMap(
                        java.util.Map.Entry::getKey,
                        entry -> new ParticipantDirectory.ParticipantProfile(
                                entry.getKey(), entry.getValue().teamMember(), entry.getValue().knowsVsl(),
                                false, entry.getValue().useInProject(), entry.getValue().region(),
                                entry.getValue().handedness(), entry.getValue().ageGroup())));
        service = new DatasetStatsService(statsRepository, new LabelCatalog(mapper), modelRepository,
                nobodyPublishes, mapper);
        when(statsRepository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED)).thenReturn(snapshot());
        when(modelRepository.findByActiveTrue()).thenReturn(Optional.of(activeModel()));

        PublicStatsDTO result = service.getPublicStats();

        assertThat(result.modelEvaluationStatus()).isEqualTo("NO_PUBLISHABLE_TEST_METRICS");
        assertThat(result.activeModelEvaluation().top1AccuracyTestA()).isNull();
        assertThat(result.activeModelEvaluation().top3AccuracyTestA()).isNull();
    }

    @Test
    void adminStatsUseInternalScopeAndIncludeOperationalBreakdowns() throws Exception {
        DatasetSnapshot snapshot = snapshot();
        when(statsRepository.load(DatasetStatsRepository.Scope.ADMIN_INTERNAL)).thenReturn(snapshot);
        when(modelRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(activeModel()));

        AdminStatsDTO result = service.getAdminStats();

        assertThat(result.scope()).isEqualTo("ADMIN_INTERNAL");
        assertThat(result.contributorProgress()).hasSize(1);
        assertThat(result.rejectionRateBySign()).hasSize(1);
        assertThat(result.modelMetricsHistory()).hasSize(1);
        assertThat(result.modelMetricsHistory().getFirst().metrics().toString()).contains("EXT-A");
    }

    @Test
    void schemaOrQueryFailureReturns503InsteadOfZeros() {
        when(statsRepository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED))
                .thenThrow(new DataAccessResourceFailureException("missing clips table"));

        assertThatThrownBy(service::getPublicStats)
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.status().value()).isEqualTo(503);
                    assertThat(error.code()).isEqualTo("STATS_UNAVAILABLE");
                });
    }

    @Test
    void consentScopeGuardFailsClosed() {
        DatasetSnapshot unsafe = new DatasetSnapshot(snapshot().counts(), snapshot().acceptedByLabel(),
                snapshot().metadataDistribution(), snapshot().contributorProgress(),
                snapshot().rejectionRateBySign(), 1);
        when(statsRepository.load(DatasetStatsRepository.Scope.PUBLIC_CONSENTED)).thenReturn(unsafe);

        assertThatThrownBy(service::getPublicStats)
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("STATS_UNAVAILABLE"));
    }

    private DatasetSnapshot snapshot() {
        return new DatasetSnapshot(
                new Counts(10, 6, 2, 1, 1, 3),
                Map.of(1, 6L),
                Map.of(
                        "region", List.of(new DistributionCount("SOUTH", 3)),
                        "handedness", List.of(new DistributionCount("RIGHT", 3)),
                        "knowsVsl", List.of(new DistributionCount("false", 3)),
                        "ageGroup", List.of(new DistributionCount("18-24", 3))
                ),
                List.of(new DatasetStatsRepository.ContributorProgress("EXT-A", 6, 50)),
                List.of(new DatasetStatsRepository.RejectionBySign(1, 6, 2)),
                0
        );
    }

    private ModelVersion activeModel() throws Exception {
        var metrics = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(MetricsFixture.validMetrics());
        metrics.put("modelSizeBytes", 1234);
        ModelVersion model = ModelVersion.create(UUID.randomUUID(), "1.2.0", "models/1.2.0/model.onnx",
                "22c0ff1688cddde59683322e549c51a0b470135f084c2142bc1940a4919f0767",
                "a".repeat(64), mapper.valueToTree(ModelContract.requiredSignature()), metrics,
                true, mapper.createObjectNode().put("all", "PASSED"), Instant.parse("2026-08-20T03:00:00Z"));
        model.activate();
        return model;
    }
}
