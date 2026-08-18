import torch
import torch.nn as nn
import onnx
from ai_pipeline.models.vsl_classifier_wrapper import VSLClassifierWrapper
from ai_pipeline.utils.label_hash import get_labels_sha256

# EARS[FR-009]: ONNX Opset 17 Export Script with LABEL_HASH_SHA256 metadata embedding
def export_onnx_model(output_path: str = "models/vsl_classifier_v1.onnx", opset_version: int = 17):
    model = VSLClassifierWrapper()
    model.eval()

    dummy_input = torch.randn(1, 45, 333, dtype=torch.float32)

    # Dynamic axes for variable sequence length input T
    dynamic_axes = {
        "raw_landmarks": {0: "batch_size", 1: "sequence_length"},
        "logits": {0: "batch_size"}
    }

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["raw_landmarks"],
        output_names=["logits"],
        dynamic_axes=dynamic_axes
    )

    # Load ONNX model and embed label_hash SHA256 metadata
    onnx_model = onnx.load(output_path)
    label_hash = get_labels_sha256()

    meta = onnx_model.metadata_props.add()
    meta.key = "label_hash"
    meta.value = label_hash

    meta_opset = onnx_model.metadata_props.add()
    meta_opset.key = "opset_version"
    meta_opset.value = str(opset_version)

    onnx.save(onnx_model, output_path)
    print(f"Exported ONNX model successfully to {output_path} with label_hash={label_hash}")

if __name__ == "__main__":
    export_onnx_model()
