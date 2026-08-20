"""Canh lệch label_hash giữa 4 nơi — P1-2.

`shared/labels.json` là nguồn sự thật duy nhất cho 51 lớp. Hash của nó xuất
hiện ở 4 chỗ và cả 4 PHẢI bằng nhau:

  1. `ai_pipeline/utils/label_hash.get_labels_sha256()`  (nhúng vào .onnx)
  2. `ai_pipeline/generated/labels.py`   — sinh bởi scripts/generate_labels.py
  3. `frontend/src/generated/labels.ts`  — client dùng để verify
  4. metadata `label_hash` trong `models/vsl_classifier_dummy_v2.onnx`

Lệch một chỗ là `labelVerifier.ts` ném `LabelMismatchError` và model bị từ chối
nạp — nhưng chỉ phát hiện được lúc chạy app. Test này kéo lỗi đó về sớm nhất.

KHI TEST NÀY ĐỎ, gần như luôn là vì `shared/labels.json` vừa bị sửa. Cách xử lý:

    PYTHONIOENCODING=utf-8 py scripts/generate_labels.py       # sinh lại .py/.ts
    PYTHONIOENCODING=utf-8 py -m ai_pipeline.export.export_onnx  # export lại .onnx

rồi commit cả 4 thứ cùng nhau.
"""

from __future__ import annotations

import re
from pathlib import Path

import onnx
import pytest

from ai_pipeline.generated.labels import (
    LABEL_HASH_MD5 as PY_LABEL_HASH_MD5,
    LABEL_HASH_SHA256 as PY_LABEL_HASH_SHA256,
    TOTAL_CLASSES as PY_TOTAL_CLASSES,
)
from ai_pipeline.models.vsl_classifier_v2 import NUM_CLASSES
from ai_pipeline.utils.label_hash import (
    get_labels_count,
    get_labels_md5,
    get_labels_sha256,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LABELS_TS = REPO_ROOT / "frontend" / "src" / "generated" / "labels.ts"
DUMMY_ONNX = REPO_ROOT / "models" / "vsl_classifier_dummy_v2.onnx"

REGEN_HINT = (
    "Chay lai: py scripts/generate_labels.py ; "
    "py -m ai_pipeline.export.export_onnx"
)


def test_labels_py_khop_labels_json() -> None:
    """labels.py (sinh tự động) phải khớp labels.json hiện tại."""
    assert PY_LABEL_HASH_SHA256 == get_labels_sha256(), (
        f"labels.py loi thoi so voi shared/labels.json. {REGEN_HINT}"
    )
    assert PY_LABEL_HASH_MD5 == get_labels_md5(), (
        f"MD5 trong labels.py loi thoi. {REGEN_HINT}"
    )


def test_labels_ts_khop_labels_json() -> None:
    """labels.ts (client dùng để verify model) phải khớp labels.json."""
    if not LABELS_TS.exists():
        pytest.skip(f"chua co {LABELS_TS}")

    source = LABELS_TS.read_text(encoding="utf-8")
    match = re.search(r'LABEL_HASH_SHA256\s*=\s*"([0-9a-f]{64})"', source)
    assert match is not None, "khong tim thay LABEL_HASH_SHA256 trong labels.ts"

    assert match.group(1) == get_labels_sha256(), (
        f"labels.ts loi thoi so voi shared/labels.json -> labelVerifier.ts se "
        f"tu choi nap model. {REGEN_HINT}"
    )


def test_so_lop_khop_interface_onnx() -> None:
    """Số lớp trong labels.json phải khớp NUM_CLASSES của interface ONNX.

    Contract đã chốt là `logits [1, 51]`. Nếu ai đó cắt/thêm nhãn trong
    labels.json mà không đổi interface, model sẽ trả sai số chiều và P2/P4
    vỡ ngầm — chặn tại đây.
    """
    assert get_labels_count() == NUM_CLASSES, (
        f"shared/labels.json co {get_labels_count()} lop nhung interface ONNX "
        f"chot {NUM_CLASSES} logits. Doi so lop la DOI CONTRACT: phai bao P2 "
        f"(worker) va P4 (cham diem) truoc khi doi."
    )
    assert PY_TOTAL_CLASSES == NUM_CLASSES


def test_onnx_da_commit_khop_labels_json() -> None:
    """File .onnx đã commit phải mang hash của labels.json hiện tại."""
    if not DUMMY_ONNX.exists():
        pytest.skip(f"chua co {DUMMY_ONNX} (chay export_onnx de sinh)")

    model = onnx.load(str(DUMMY_ONNX))
    metadata = {prop.key: prop.value for prop in model.metadata_props}

    assert metadata.get("label_hash") == get_labels_sha256(), (
        f"models/vsl_classifier_dummy_v2.onnx mang label_hash cu "
        f"({metadata.get('label_hash')}) trong khi labels.json hien tai la "
        f"{get_labels_sha256()}. {REGEN_HINT}"
    )
    assert metadata.get("num_classes") == str(get_labels_count())
