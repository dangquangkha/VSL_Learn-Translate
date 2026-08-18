import onnx
from ai_pipeline.utils.label_hash import get_labels_sha256

def test_onnx_metadata_prop(model_path: str = "models/vsl_classifier_v1.onnx"):
    onnx_model = onnx.load(model_path)
    metadata = {prop.key: prop.value for prop in onnx_model.metadata_props}
    
    assert "label_hash" in metadata, "Missing label_hash in ONNX metadata"
    expected_hash = get_labels_sha256()
    assert metadata["label_hash"] == expected_hash, f"Hash mismatch: got {metadata['label_hash']}, expected {expected_hash}"
    print("ONNX Metadata Verification Passed.")
