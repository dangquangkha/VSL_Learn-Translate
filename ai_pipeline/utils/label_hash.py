"""Tính hash của `shared/labels.json` — nguồn sự thật duy nhất cho 51 lớp.

Hash này được nhúng vào metadata file `.onnx` (`export_onnx.py`) và được client
so khớp với `LABEL_HASH_SHA256` trong `frontend/src/generated/labels.ts`
(`frontend/src/services/labelVerifier.ts`). Lệch hash nghĩa là thứ tự lớp của
model không còn khớp thứ tự lớp của client — model bị từ chối nạp.

CÔNG THỨC (CANONICAL) — phải khớp TUYỆT ĐỐI với `scripts/generate_labels.py`:

    json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False)
    -> chuẩn hoá CRLF/CR về LF
    -> encode UTF-8
    -> sha256 / md5

Vì sao KHÔNG hash raw bytes của file (bản cũ của module này đã làm vậy và gây
lệch): hash raw bytes đổi theo cách xuống dòng và cách format file. Cùng một
`labels.json` cho ra hash khác nhau giữa bản trên đĩa (CRLF sau khi Git
checkout trên Windows) và bản trong Git blob (LF) — đã kiểm chứng thực tế:
`04b53d02…` (đĩa) vs `db6ec04b…` (blob). Hash canonical chỉ đổi khi nội dung
nhãn thật sự đổi.

`ai_pipeline/tests/test_label_hash_sync.py` canh cho hai công thức không lệch
nhau lần nữa.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

DEFAULT_LABELS_PATH = "shared/labels.json"


def _resolve(labels_file_path: str | Path) -> Path:
    """Trả về đường dẫn tuyệt đối tới labels.json (fallback theo gốc repo)."""
    path = Path(labels_file_path)
    if not path.is_absolute():
        root = Path(__file__).resolve().parent.parent.parent
        path = root / labels_file_path

    if not path.exists():
        raise FileNotFoundError(f"Labels file not found at {path}")

    return path


def load_labels(labels_file_path: str | Path = DEFAULT_LABELS_PATH) -> dict[str, Any]:
    """Đọc và parse `shared/labels.json`."""
    return json.loads(_resolve(labels_file_path).read_text(encoding="utf-8"))


def get_labels_canonical_text(
    labels_file_path: str | Path = DEFAULT_LABELS_PATH,
) -> str:
    """Dạng chuẩn hoá của labels.json dùng để băm.

    Giữ ĐÚNG tham số của `scripts/generate_labels.py`: `indent=2`,
    `sort_keys=True`, `ensure_ascii=False`, và chuẩn hoá mọi kiểu xuống dòng
    về `\\n`.
    """
    data = load_labels(labels_file_path)
    text = json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False)
    return text.replace("\r\n", "\n").replace("\r", "\n")


def get_labels_sha256(labels_file_path: str | Path = DEFAULT_LABELS_PATH) -> str:
    """SHA256 canonical của labels.json — giá trị nhúng vào ONNX metadata."""
    return hashlib.sha256(
        get_labels_canonical_text(labels_file_path).encode("utf-8")
    ).hexdigest()


def get_labels_md5(labels_file_path: str | Path = DEFAULT_LABELS_PATH) -> str:
    """MD5 canonical của labels.json (đối chiếu với labels.ts / labels.py)."""
    return hashlib.md5(
        get_labels_canonical_text(labels_file_path).encode("utf-8")
    ).hexdigest()


def get_labels_count(labels_file_path: str | Path = DEFAULT_LABELS_PATH) -> int:
    """Số lớp thực tế trong labels.json — dùng để chặn lệch với NUM_CLASSES."""
    return len(load_labels(labels_file_path)["labels"])
