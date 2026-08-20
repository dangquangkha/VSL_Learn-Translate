"""Test metadata của interface ONNX CŨ — ĐÃ NGỪNG CHẠY.

Test này nạp `models/vsl_classifier_v1.onnx`, tức model theo interface cũ MỘT
tensor `raw_landmarks [B, T, 333]`. Interface đó đã bị LOẠI BỎ ở
`specs/010-p1-foundation/spec.md` §2.1 (bắt JavaScript tự dựng 333 đặc trưng =
tự tiền xử lý = vi phạm Zero Training/Serving Skew). `export_onnx.py` không còn
sinh file đó nữa, nên test này không thể xanh trở lại theo cách cũ.

ĐỪNG "sửa cho xanh" bằng cách export lại model 1 tensor — làm vậy là tái lập
đúng vi phạm vừa gỡ bỏ.

Phần metadata của interface MỚI đã được phủ bởi:
  - `test_dummy_onnx_v2.py::test_onnx_metadata`
  - `test_label_hash_sync.py`  (canh lệch hash giữa 4 nơi)

Việc viết lại test này cho interface 3 tensor thuộc **P1-10** (golden test T-02).
"""

import onnx
import pytest

from ai_pipeline.utils.label_hash import get_labels_sha256

SKIP_REASON = (
    "Interface ONNX 1 tensor raw_landmarks[B,T,333] da bi loai bo (spec 010 §2.1). "
    "Viet lai cho interface 3 tensor o P1-10."
)


@pytest.mark.skip(reason=SKIP_REASON)
def test_onnx_metadata_prop(model_path: str = "models/vsl_classifier_v1.onnx"):
    onnx_model = onnx.load(model_path)
    metadata = {prop.key: prop.value for prop in onnx_model.metadata_props}

    assert "label_hash" in metadata, "Missing label_hash in ONNX metadata"
    expected_hash = get_labels_sha256()
    assert metadata["label_hash"] == expected_hash, f"Hash mismatch: got {metadata['label_hash']}, expected {expected_hash}"
    print("ONNX Metadata Verification Passed.")
