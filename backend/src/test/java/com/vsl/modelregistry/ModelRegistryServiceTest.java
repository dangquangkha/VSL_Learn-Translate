package com.vsl.modelregistry;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.dto.ActiveModelDTO;
import com.vsl.modelregistry.dto.ModelAdminDTO;
import com.vsl.modelregistry.entity.ModelVersion;
import com.vsl.modelregistry.repository.ModelVersionRepository;
import com.vsl.modelregistry.service.ModelRegistryService;
import com.vsl.modelregistry.storage.ModelArtifactStorage;
import com.vsl.modelregistry.validation.LabelCatalog;
import com.vsl.modelregistry.validation.ModelContract;
import com.vsl.modelregistry.validation.ModelMetricsValidator;
import com.vsl.modelregistry.validation.OnnxModelInspector;
import com.vsl.participant.ParticipantDirectory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ModelRegistryServiceTest {

    private static final String LABEL_HASH =
            "927342372dcfb1c70d8afb2867324932d3171f30bb6a0cdc24aaea4971a2bf2f";

    @Mock
    private ModelVersionRepository repository;
    @Mock
    private ModelArtifactStorage storage;

    private ModelRegistryService service;
    private ObjectMapper mapper;
    private byte[] validArtifact;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        ParticipantDirectory participants = codes -> MetricsFixture.participants().entrySet().stream()
                .filter(entry -> codes.contains(entry.getKey()))
                .collect(java.util.stream.Collectors.toMap(
                        java.util.Map.Entry::getKey, java.util.Map.Entry::getValue));
        LabelCatalog catalog = new LabelCatalog(mapper);
        service = new ModelRegistryService(repository, storage, new OnnxModelInspector(), catalog,
                new ModelMetricsValidator(mapper, participants), mapper);
        validArtifact = OnnxFixture.validModel(LABEL_HASH);
    }

    @Test
    void duplicateSemverIsRejectedBeforeStorageMutation() {
        when(repository.existsBySemver("1.2.0")).thenReturn(true);

        assertThatThrownBy(() -> service.register(file(validArtifact), "1.2.0", MetricsFixture.validMetrics()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("MODEL_VERSION_EXISTS"));
        verify(storage, never()).put(anyString(), any(), anyString());
    }

    @Test
    void storesArtifactAndNormalizedMetricsAtPrivateCanonicalKeys() {
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        String lowAccuracy = MetricsFixture.validMetrics().replace(
                "\"top1AccuracyTestA\": 0.90", "\"top1AccuracyTestA\": 0.84");

        ModelAdminDTO result = service.register(file(validArtifact), "1.2.0", lowAccuracy);

        assertThat(result.releaseEligible()).isFalse();
        assertThat(result.active()).isFalse();
        assertThat(result.artifactSha256()).hasSize(64);
        verify(storage).put("models/1.2.0/model.onnx", validArtifact, "application/octet-stream");
        verify(storage).put(org.mockito.ArgumentMatchers.eq("models/1.2.0/metrics.json"),
                any(byte[].class), org.mockito.ArgumentMatchers.eq("application/json"));
    }

    @Test
    void databaseReservationFailureDoesNotTouchStorage() {
        when(repository.saveAndFlush(any())).thenThrow(new IllegalStateException("database unavailable"));

        assertThatThrownBy(() -> service.register(file(validArtifact), "1.2.0", MetricsFixture.validMetrics()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("MODEL_REGISTRY_UNAVAILABLE"));
        verify(storage, never()).put(anyString(), any(), anyString());
    }

    @Test
    void storageFailureDoesNotCreateDatabaseRecordAndTriggersCleanup() {
        doThrow(new IllegalStateException("R2 down")).when(storage)
                .put("models/1.2.0/model.onnx", validArtifact, "application/octet-stream");
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> service.register(file(validArtifact), "1.2.0", MetricsFixture.validMetrics()))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("MODEL_STORAGE_UNAVAILABLE"));
        verify(repository).saveAndFlush(any());
        verify(storage).deleteIfExists("models/1.2.0/model.onnx");
        verify(storage).deleteIfExists("models/1.2.0/metrics.json");
    }

    @Test
    void refusesToActivateAReleaseIneligibleModelWithoutTouchingCurrentActive() throws Exception {
        ModelVersion model = model(false);
        UUID id = model.getId();
        when(repository.findById(id)).thenReturn(Optional.of(model));

        assertThatThrownBy(() -> service.activate(id))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("MODEL_NOT_ACTIVATABLE"));
        verify(repository, never()).deactivateAll();
    }

    @Test
    void activatesEligibleModelUnderTheGlobalRepositoryLock() throws Exception {
        ModelVersion model = model(true);
        UUID id = model.getId();
        when(repository.findById(id)).thenReturn(Optional.of(model));
        when(repository.lockAll()).thenReturn(List.of(model));
        when(storage.exists(model.getR2Key())).thenReturn(true);
        when(repository.saveAndFlush(model)).thenReturn(model);

        ModelAdminDTO result = service.activate(id);

        assertThat(result.active()).isTrue();
        verify(repository).deactivateAll();
        verify(repository).saveAndFlush(model);
    }

    @Test
    void activeResponseContainsShortLivedUrlButNoInternalMetrics() throws Exception {
        ModelVersion model = model(true);
        model.activate();
        when(repository.findByActiveTrue()).thenReturn(Optional.of(model));
        when(storage.exists(model.getR2Key())).thenReturn(true);
        when(storage.presignGet(model.getR2Key(), java.time.Duration.ofMinutes(15)))
                .thenReturn(new ModelArtifactStorage.PresignedDownload(
                        "https://signed.example/model", Instant.parse("2026-08-20T03:15:00Z")));

        ActiveModelDTO result = service.getActiveModel();

        assertThat(result.downloadUrl()).isEqualTo("https://signed.example/model");
        assertThat(result.downloadUrlExpiresAt()).isEqualTo(Instant.parse("2026-08-20T03:15:00Z"));
        assertThat(result.inputSignature()).isEqualTo(ModelContract.requiredSignature());
    }

    private ModelVersion model(boolean eligible) throws Exception {
        ModelMetricsValidator.ValidatedMetrics metrics = new ModelMetricsValidator(
                mapper, codes -> MetricsFixture.participants()).validate(MetricsFixture.validMetrics(), validArtifact.length);
        return ModelVersion.create(UUID.randomUUID(), "1.2.0", "models/1.2.0/model.onnx", LABEL_HASH,
                "a".repeat(64), mapper.valueToTree(ModelContract.requiredSignature()), metrics.normalized(),
                eligible, metrics.validationResults(), Instant.parse("2026-08-20T03:00:00Z"));
    }

    private static MockMultipartFile file(byte[] bytes) {
        return new MockMultipartFile("model", "model.onnx", "application/octet-stream", bytes);
    }
}
