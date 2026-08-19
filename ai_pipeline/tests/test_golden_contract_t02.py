"""Golden Contract Test T-02 cho interface ONNX CŨ — ĐÃ NGỪNG CHẠY.

Test này dùng `VSLClassifierWrapper` và nạp `{"raw_landmarks": ...}`, tức
interface cũ MỘT tensor `[B, T, 333]`. Interface đó đã bị LOẠI BỎ ở
`specs/010-p1-foundation/spec.md` §2.1: nó bắt JavaScript tự dựng 333 đặc trưng,
tức tự tiền xử lý, vi phạm Zero Training/Serving Skew.

ĐỪNG "sửa cho xanh" bằng cách export lại model 1 tensor — làm vậy là tái lập
đúng vi phạm vừa gỡ bỏ.

T-02 vẫn là cổng bắt buộc của **P1-10**, nhưng phải viết lại cho interface 3
tensor (`landmarks` / `mask` / `timestamps`), chạy trên model THẬT với 20 mẫu
chuẩn, ngưỡng sai lệch < 1e-3.

Trong lúc chờ, phép đo tương đương đã có sẵn cho model giả:
`test_dummy_onnx_v2.py::test_parity_pytorch_vs_onnxruntime` (5 mẫu, hiện đạt
max|diff| ~ 3.9e-07).
"""

import json
import torch
import numpy as np
import onnxruntime as ort
import pytest
from ai_pipeline.models.vsl_classifier_wrapper import VSLClassifierWrapper

SKIP_REASON = (
    "Interface ONNX 1 tensor raw_landmarks[B,T,333] da bi loai bo (spec 010 §2.1). "
    "T-02 phai viet lai cho interface 3 tensor tren model that o P1-10."
)


# EARS[FR-013, NFR-002, T-02]: Golden Integration Contract Test T-02
@pytest.mark.skip(reason=SKIP_REASON)
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
