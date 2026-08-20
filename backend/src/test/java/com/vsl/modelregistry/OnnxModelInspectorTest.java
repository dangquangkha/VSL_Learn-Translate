package com.vsl.modelregistry;

import com.vsl.common.api.ApiException;
import com.vsl.modelregistry.validation.LabelCatalog;
import com.vsl.modelregistry.validation.ModelContract;
import com.vsl.modelregistry.validation.OnnxModelInspector;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OnnxModelInspectorTest {

    private static final String LABEL_HASH =
            "927342372dcfb1c70d8afb2867324932d3171f30bb6a0cdc24aaea4971a2bf2f";

    private final OnnxModelInspector inspector = new OnnxModelInspector();

    @Test
    void readsOpsetMetadataAndExactTensorContractWithoutInference() {
        OnnxModelInspector.Inspection inspection = inspector.inspect(OnnxFixture.validModel(LABEL_HASH));

        assertThat(inspection.opset()).isEqualTo(17);
        assertThat(inspection.labelHash()).isEqualTo(LABEL_HASH);
        assertThat(inspection.inputSignature()).isEqualTo(ModelContract.requiredSignature());
    }

    @Test
    void rejectsWrongOpset() {
        byte[] model = OnnxFixture.model(18, LABEL_HASH, List.of(
                OnnxFixture.valueInfo("landmarks", 1, 60, 75, 4),
                OnnxFixture.valueInfo("mask", 1, 60, 3),
                OnnxFixture.valueInfo("timestamps", 1, 60)
        ), List.of(OnnxFixture.valueInfo("logits", 1, 51)));

        assertThatThrownBy(() -> inspector.inspect(model))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("INVALID_MODEL_ARTIFACT"));
    }

    @Test
    void rejectsWrongTensorShape() {
        byte[] model = OnnxFixture.model(17, LABEL_HASH, List.of(
                OnnxFixture.valueInfo("landmarks", 1, 32, 75, 4),
                OnnxFixture.valueInfo("mask", 1, 60, 3),
                OnnxFixture.valueInfo("timestamps", 1, 60)
        ), List.of(OnnxFixture.valueInfo("logits", 1, 51)));

        assertThatThrownBy(() -> inspector.inspect(model))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("INVALID_MODEL_ARTIFACT"));
    }

    @Test
    void distinguishesMissingOrMismatchedLabelHash() {
        assertThatThrownBy(() -> inspector.requireCanonicalLabelHash(
                inspector.inspect(OnnxFixture.validModel("bad")), LABEL_HASH))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.code()).isEqualTo("LABELS_HASH_MISMATCH"));
    }
}
