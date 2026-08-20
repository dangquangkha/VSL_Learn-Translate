package com.vsl.modelregistry.validation;

import java.util.List;

public final class ModelContract {

    public static final int REQUIRED_OPSET = 17;
    public static final long MAX_MODEL_BYTES = 5L * 1024L * 1024L;
    public static final int GOLDEN_SAMPLE_COUNT = 20;
    public static final double MAX_GOLDEN_LOGIT_DIFF = 0.001d;
    public static final double MIN_TOP1_TEST_A = 0.85d;
    public static final double MAX_BROWSER_LATENCY_MS = 50d;

    private static final InputSignature REQUIRED_SIGNATURE = new InputSignature(
            new TensorSpec("float32", List.of(1, 60, 75, 4)),
            new TensorSpec("float32", List.of(1, 60, 3)),
            new TensorSpec("float32", List.of(1, 60)),
            new TensorSpec("float32", List.of(1, 51))
    );

    private ModelContract() {
    }

    public static InputSignature requiredSignature() {
        return REQUIRED_SIGNATURE;
    }

    public record TensorSpec(String dtype, List<Integer> shape) {
        public TensorSpec {
            shape = List.copyOf(shape);
        }
    }

    public record InputSignature(
            TensorSpec landmarks,
            TensorSpec mask,
            TensorSpec timestamps,
            TensorSpec logits
    ) {
    }
}
