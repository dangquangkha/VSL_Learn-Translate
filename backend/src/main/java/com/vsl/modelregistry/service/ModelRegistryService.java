package com.vsl.modelregistry.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.dto.ActiveModelDTO;
import com.vsl.modelregistry.dto.ModelAdminDTO;
import com.vsl.modelregistry.entity.ModelVersion;
import com.vsl.modelregistry.repository.ModelVersionRepository;
import com.vsl.modelregistry.storage.ModelArtifactStorage;
import com.vsl.modelregistry.validation.LabelCatalog;
import com.vsl.modelregistry.validation.ModelContract;
import com.vsl.modelregistry.validation.ModelContract.InputSignature;
import com.vsl.modelregistry.validation.ModelMetricsValidator;
import com.vsl.modelregistry.validation.ModelMetricsValidator.ValidatedMetrics;
import com.vsl.modelregistry.validation.OnnxModelInspector;
import com.vsl.modelregistry.validation.OnnxModelInspector.Inspection;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class ModelRegistryService {

    private static final Pattern SEMVER = Pattern.compile(
            "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)"
                    + "(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?"
                    + "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$");
    private static final Duration DOWNLOAD_VALIDITY = Duration.ofMinutes(15);

    private final ModelVersionRepository repository;
    private final ModelArtifactStorage storage;
    private final OnnxModelInspector inspector;
    private final LabelCatalog labels;
    private final ModelMetricsValidator metricsValidator;
    private final ObjectMapper objectMapper;

    public ModelRegistryService(ModelVersionRepository repository, ModelArtifactStorage storage,
                                OnnxModelInspector inspector, LabelCatalog labels,
                                ModelMetricsValidator metricsValidator, ObjectMapper objectMapper) {
        this.repository = repository;
        this.storage = storage;
        this.inspector = inspector;
        this.labels = labels;
        this.metricsValidator = metricsValidator;
        this.objectMapper = objectMapper;
    }

    // EARS[FR-002, FR-003, FR-007, FR-020..FR-022, FR-025]
    @Transactional
    public ModelAdminDTO register(MultipartFile modelFile, String semver, String metricsJson) {
        validateSemver(semver);
        if (repository.existsBySemver(semver)) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_VERSION_EXISTS",
                    "A model with this semantic version already exists");
        }

        byte[] artifact = readArtifact(modelFile);
        Inspection inspection = inspector.inspect(artifact);
        inspector.requireCanonicalLabelHash(inspection, labels.canonicalHash());
        ValidatedMetrics validatedMetrics = metricsValidator.validate(metricsJson, artifact.length);

        String modelKey = "models/" + semver + "/model.onnx";
        String metricsKey = "models/" + semver + "/metrics.json";
        byte[] normalizedMetrics = normalizedMetrics(validatedMetrics);

        ModelVersion version = ModelVersion.create(
                UUID.randomUUID(), semver, modelKey, labels.canonicalHash(), sha256(artifact),
                objectMapper.valueToTree(inspection.inputSignature()), validatedMetrics.normalized(),
                validatedMetrics.releaseEligible(), validatedMetrics.validationResults(), Instant.now());
        try {
            // Flush first so the unique semver reservation serializes concurrent uploads
            // before either request can write the shared canonical R2 key.
            version = repository.saveAndFlush(version);
        } catch (DataIntegrityViolationException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_VERSION_EXISTS",
                    "A model with this semantic version already exists");
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MODEL_REGISTRY_UNAVAILABLE",
                    "Model metadata could not be persisted");
        }

        registerRollbackCleanup(modelKey, metricsKey);
        try {
            storage.put(modelKey, artifact, "application/octet-stream");
            storage.put(metricsKey, normalizedMetrics, "application/json");
        } catch (RuntimeException exception) {
            deleteArtifactsQuietly(modelKey, metricsKey);
            throw storageUnavailable("Model artifacts could not be uploaded");
        }
        return toAdminDto(version);
    }

    @Transactional(readOnly = true)
    public Page<ModelAdminDTO> history(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable).map(this::toAdminDto);
    }

    // EARS[FR-005, FR-023]: activation is serialized and never displaces the active model on a failed gate.
    @CacheEvict(value = "activeModel", allEntries = true)
    @Transactional
    public ModelAdminDTO activate(UUID id) {
        ModelVersion target = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MODEL_NOT_FOUND",
                        "The requested model does not exist"));
        requireActivatable(target);

        try {
            if (!storage.exists(target.getR2Key())) {
                throw new ApiException(HttpStatus.CONFLICT, "MODEL_NOT_ACTIVATABLE",
                        "The model artifact is no longer available");
            }
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw storageUnavailable("The model artifact could not be verified");
        }

        target = repository.lockAll().stream()
                .filter(model -> model.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MODEL_NOT_FOUND",
                        "The requested model does not exist"));
        requireActivatable(target);
        if (!target.isActive()) {
            repository.deactivateAll();
            target.activate();
            target = repository.saveAndFlush(target);
        }
        return toAdminDto(target);
    }

    // EARS[FR-006, FR-024, FR-025]: issue a fresh private URL and expose no internal metrics or object key.
    @Transactional(readOnly = true)
    public ActiveModelDTO getActiveModel() {
        ModelVersion active = repository.findByActiveTrue()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NO_ACTIVE_MODEL",
                        "No model is currently active"));
        InputSignature signature = readSignature(active);
        if (!active.getLabelsHash().equals(labels.canonicalHash())
                || !ModelContract.requiredSignature().equals(signature)) {
            throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_MODEL_INCOMPATIBLE",
                    "The active model is incompatible with the current label or tensor contract");
        }

        try {
            if (!storage.exists(active.getR2Key())) {
                throw storageUnavailable("The active model artifact is unavailable");
            }
            ModelArtifactStorage.PresignedDownload download =
                    storage.presignGet(active.getR2Key(), DOWNLOAD_VALIDITY);
            return new ActiveModelDTO(active.getId(), active.getSemver(), active.getLabelsHash(),
                    active.getArtifactSha256(), signature, download.url(), download.expiresAt());
        } catch (ApiException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw storageUnavailable("A download URL could not be issued");
        }
    }

    private void requireActivatable(ModelVersion model) {
        InputSignature signature = readSignature(model);
        boolean metricsPass = model.getMetrics().path("top1AccuracyTestA").asDouble(-1)
                >= ModelContract.MIN_TOP1_TEST_A
                && model.getMetrics().path("browserLatencyMs").asDouble(Double.MAX_VALUE)
                <= ModelContract.MAX_BROWSER_LATENCY_MS
                && model.getMetrics().path("modelSizeBytes").asLong(Long.MAX_VALUE)
                <= ModelContract.MAX_MODEL_BYTES
                && model.getMetrics().path("goldenSampleCount").asInt(-1)
                == ModelContract.GOLDEN_SAMPLE_COUNT
                && model.getMetrics().path("goldenMaxLogitDiff").asDouble(Double.MAX_VALUE)
                < ModelContract.MAX_GOLDEN_LOGIT_DIFF;
        if (!model.isReleaseEligible() || !metricsPass
                || !model.getLabelsHash().equals(labels.canonicalHash())
                || !ModelContract.requiredSignature().equals(signature)) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_NOT_ACTIVATABLE",
                    "The model has not passed all activation gates",
                    Map.of("validationResults", model.getValidationResults()));
        }
    }

    private InputSignature readSignature(ModelVersion model) {
        try {
            return objectMapper.treeToValue(model.getInputSignature(), InputSignature.class);
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.CONFLICT, "ACTIVE_MODEL_INCOMPATIBLE",
                    "The stored tensor signature cannot be read");
        }
    }

    private ModelAdminDTO toAdminDto(ModelVersion model) {
        return new ModelAdminDTO(model.getId(), model.getSemver(), model.getLabelsHash(),
                model.getArtifactSha256(), readSignature(model), model.getMetrics(),
                model.isReleaseEligible(), model.getValidationResults(), model.isActive(), model.getCreatedAt());
    }

    private static void validateSemver(String semver) {
        if (semver == null || semver.length() > 64 || !SEMVER.matcher(semver).matches()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_METADATA",
                    "semver must be a valid Semantic Versioning value");
        }
    }

    private static byte[] readArtifact(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > ModelContract.MAX_MODEL_BYTES
                || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(java.util.Locale.ROOT).endsWith(".onnx")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_ARTIFACT",
                    "model must be a non-empty .onnx file no larger than 5 MiB");
        }
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_ARTIFACT",
                    "The uploaded model could not be read");
        }
    }

    private byte[] normalizedMetrics(ValidatedMetrics metrics) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(metrics.normalized());
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_MODEL_METADATA",
                    "Metrics could not be normalized");
        }
    }

    private void registerRollbackCleanup(String modelKey, String metricsKey) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    deleteArtifactsQuietly(modelKey, metricsKey);
                }
            }
        });
    }

    private void deleteArtifactsQuietly(String modelKey, String metricsKey) {
        try {
            storage.deleteIfExists(modelKey);
        } catch (RuntimeException ignored) {
            // Best effort cleanup; never replace the original failure with a cleanup failure.
        }
        try {
            storage.deleteIfExists(metricsKey);
        } catch (RuntimeException ignored) {
            // Best effort cleanup; never replace the original failure with a cleanup failure.
        }
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static ApiException storageUnavailable(String message) {
        return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MODEL_STORAGE_UNAVAILABLE", message);
    }
}
