import json
import torch
import numpy as np
import onnxruntime as ort
from ai_pipeline.models.vsl_classifier_wrapper import VSLClassifierWrapper

# EARS[FR-013, NFR-002, T-02]: Golden Integration Contract Test T-02
def test_golden_contract_t02(onnx_model_path: str = "models/vsl_classifier_v1.onnx", fixtures_path: str = "ai_pipeline/tests/fixtures/golden_tensors.json"):
    pytorch_model = VSLClassifierWrapper()
    pytorch_model.eval()

    ort_session = ort.InferenceSession(onnx_model_path)

    with open(fixtures_path, "r") as f:
        fixtures = json.load(f)

    max_logit_diff = 0.0

    for sample in fixtures:
        seq_len = sample["sequence_length"]
        # Generate deterministic synthetic landmark sample tensor
        torch.manual_seed(sample["id"])
        sample_tensor = torch.randn(1, seq_len, 333, dtype=torch.float32)

        # PyTorch Native Execution
        with torch.no_grad():
            pytorch_logits = pytorch_model(sample_tensor).numpy()

        # ONNX Runtime Execution
        ort_inputs = {"raw_landmarks": sample_tensor.numpy()}
        ort_logits = ort_session.run(None, ort_inputs)[0]

        # Calculate maximum absolute logit difference
        abs_diff = np.max(np.abs(pytorch_logits - ort_logits))
        if abs_diff > max_logit_diff:
            max_logit_diff = abs_diff

        assert abs_diff < 1e-3, f"Sample {sample['id']} failed T-02 contract test: diff {abs_diff} >= 1e-3"

    print(f"Golden Integration Contract Test T-02 PASSED. Max logit diff: {max_logit_diff:.6f} (< 1e-3)")

if __name__ == "__main__":
    test_golden_contract_t02()
