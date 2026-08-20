"""P1-5 — Dataset builder: đọc `data/raw/<Pxx>/*.vslm` → tensor cho training.

NGUYÊN TẮC QUAN TRỌNG NHẤT: mẫu train phải trông ĐÚNG NHƯ thứ model nhìn thấy
lúc chạy thật. Lúc chạy, ring buffer giữ **60 khung gần nhất** và đẩy nguyên
`landmarks [1,60,75,4]` + `mask [1,60,3]` + `timestamps [1,60]` vào ONNX graph —
toàn bộ tiền xử lý nằm trong graph. Nên ở đây ta cũng chỉ cắt cửa sổ 60 khung
thô, KHÔNG tự dựng đặc trưng.

Ba cái bẫy đã biết, đều được xử lý trong file này:

1. **Cửa sổ là 60 KHUNG, không phải 2,0 giây.** Ring buffer đếm khung, không đếm
   thời gian. Máy 22fps thì 60 khung là 2,7 giây; máy 30fps thì đúng 2,0 giây.
   Cắt theo giây sẽ tạo ra cửa sổ có số khung khác lúc chạy → lệch ngay ở kênh
   toạ độ (bài học đã đo: lệch 0.64 cho cùng một động tác).

2. **`timestamps` phải quy về gốc của CỬA SỔ, không phải gốc của clip.**
   `frontend/AGENTS.md` §2 quy định `timestamps` tính bằng giây, tương đối so
   với khung đầu của cửa sổ. File `.vslm` lưu tương đối so với đầu **clip**.
   Quên trừ đi là velocity trong graph tính sai mà không có gì báo lỗi.

3. **Chia tập theo NGƯỜI, không theo clip.** Các cửa sổ cắt từ cùng một clip
   giống nhau ~98%; để lẫn train/test là tự cho điểm mình. Chia theo người còn
   trả lời đúng câu hỏi cần trả lời khi bảo vệ: model có chạy với người lạ không.
"""

from __future__ import annotations

import glob
import json
import os
from collections import Counter, defaultdict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
import torch
from torch.utils.data import Dataset

from ai_pipeline.data.landmark_io import VslmFormatError, read_vslm

# ---- hằng số contract (KHÔNG đổi nếu chưa đổi ONNX graph) -------------------

#: Số khung một cửa sổ — bằng đúng sức chứa ring buffer lúc chạy thật.
WINDOW_FRAMES = 60

#: Số cửa sổ tối đa cắt ra từ mỗi clip. Các cửa sổ của cùng một clip lệch nhau
#: vài khung nên gần trùng nhau; lấy nhiều hơn chỉ làm phình dữ liệu tương quan
#: chứ không thêm thông tin.
MAX_WINDOWS_PER_CLIP = 8

#: fps tối thiểu để clip 3 giây đủ 60 khung.
MIN_FPS = 20.0

#: Đoạn liên tục có tay ngắn nhất (giây). Khớp `tools/recorder-lite/src/summary.ts`.
MIN_HAND_RUN_SEC = 1.0

#: Lỗ mất tay ngắn hơn ngưỡng này là nhiễu bám dấu, được lấp trước khi đo.
BRIDGE_GAP_SEC = 0.15

#: Lớp `idle` được miễn kiểm tra tay (clip idle hợp lệ có thể không có tay nào).
IDLE_CODE = "idle"

_ASPECT_16_9 = 16 / 9
_ASPECT_TOL = 0.02


@dataclass(frozen=True)
class ClipInfo:
    """Một clip đã qua kiểm tra, kèm lý do bị loại (rỗng = dùng được)."""

    path: str
    participant: str
    sign_code: str
    label_index: int
    frame_count: int
    fps_avg: float
    hand_run_sec: float
    reasons: tuple[str, ...]

    @property
    def usable(self) -> bool:
        return not self.reasons


def _normalize_participant(raw: str) -> str:
    """`p2` / `P3` / `p03` → `P02` / `P03` / `P03`.

    Mã người trong header hiện không đồng nhất giữa các thành viên. Chuẩn hoá ở
    đây thay vì sửa file, vì file `.vslm` là dữ liệu đã ghi — sửa nó là sửa bản
    ghi gốc.
    """
    s = raw.strip()
    if len(s) >= 2 and s[0] in "pP" and s[1:].isdigit():
        return f"P{int(s[1:]):02d}"
    return s.upper()


def _longest_hand_run_sec(mask: np.ndarray, fps: float) -> float:
    """Đoạn liên tục dài nhất có ít nhất một tay, sau khi lấp lỗ hổng ngắn.

    Cùng công thức với `computeSummary` phía recorder. Lỗ ở đầu/cuối KHÔNG lấp —
    đó là pha chuẩn bị và pha hạ tay, việc loại chúng ra chính là mục đích của
    thước đo này.
    """
    if fps <= 0 or mask.shape[0] == 0:
        return 0.0
    interval = 1.0 / fps
    has = (mask[:, 1] | mask[:, 2]).astype(bool).copy()

    i = 0
    while i < len(has):
        if has[i]:
            i += 1
            continue
        j = i
        while j < len(has) and not has[j]:
            j += 1
        if i > 0 and j < len(has) and (j - i) * interval <= BRIDGE_GAP_SEC:
            has[i:j] = True
        i = j

    best = cur = 0
    for v in has:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best * interval


def _load_label_map() -> dict[str, int]:
    root = Path(__file__).resolve().parents[2]
    with open(root / "shared" / "labels.json", encoding="utf-8") as f:
        return {item["code"]: item["id"] for item in json.load(f)["labels"]}


def scan_clips(
    raw_dir: str | Path,
    keep_signs: Sequence[str] | None = None,
) -> list[ClipInfo]:
    """Quét mọi `.vslm` dưới `raw_dir`, kiểm tra từng clip, trả về danh sách.

    KHÔNG ném lỗi và KHÔNG âm thầm bỏ clip: clip hỏng vẫn nằm trong kết quả với
    `reasons` nói rõ vì sao, để bên gọi in ra được báo cáo đầy đủ.
    """
    label_map = _load_label_map()
    allow = set(keep_signs) if keep_signs else None
    out: list[ClipInfo] = []

    for path in sorted(glob.glob(os.path.join(str(raw_dir), "**", "*.vslm"), recursive=True)):
        try:
            _, _, mask, header = read_vslm(path)
        except VslmFormatError as exc:
            out.append(
                ClipInfo(path, "?", "?", -1, 0, 0.0, 0.0, (f"file-hong: {exc}",))
            )
            continue

        sign = str(header.get("sign_code", ""))
        if allow is not None and sign not in allow:
            continue

        fps = float(header.get("fps_avg", 0.0) or 0.0)
        frames = int(header.get("frame_count", 0))
        run = _longest_hand_run_sec(mask, fps)
        width = int(header.get("video_width", 0))
        height = int(header.get("video_height", 0))

        reasons: list[str] = []
        if frames < WINDOW_FRAMES:
            reasons.append(f"khung<{WINDOW_FRAMES}")
        if fps < MIN_FPS:
            reasons.append("fps<20")
        if height <= 0 or abs(width / height - _ASPECT_16_9) / _ASPECT_16_9 > _ASPECT_TOL:
            reasons.append("ti-le-khong-16:9")
        if sign not in label_map:
            reasons.append("nhan-khong-co-trong-labels.json")
        elif int(header.get("label_index", -1)) != label_map[sign]:
            reasons.append("label_index-lech-labels.json")
        if sign != IDLE_CODE and run < MIN_HAND_RUN_SEC:
            reasons.append("doan-tay<1s")

        out.append(
            ClipInfo(
                path=path,
                participant=_normalize_participant(str(header.get("participant_code", ""))),
                sign_code=sign,
                label_index=label_map.get(sign, -1),
                frame_count=frames,
                fps_avg=fps,
                hand_run_sec=run,
                reasons=tuple(reasons),
            )
        )
    return out


def window_starts(frame_count: int, max_windows: int = MAX_WINDOWS_PER_CLIP) -> list[int]:
    """Vị trí bắt đầu của các cửa sổ 60 khung, trải đều trên clip.

    Trải đều thay vì dùng stride cố định để clip dài và clip ngắn đóng góp số
    mẫu gần bằng nhau — clip dài chỉ khác ở chỗ các cửa sổ đa dạng hơn.
    """
    if frame_count < WINDOW_FRAMES:
        return []
    last = frame_count - WINDOW_FRAMES
    if last == 0:
        return [0]
    n = min(max_windows, last + 1)
    return sorted({int(round(v)) for v in np.linspace(0, last, n)})


class VslmWindowDataset(Dataset):
    """Cửa sổ 60 khung cắt từ các clip `.vslm`, nạp lười (lazy) theo từng clip.

    Không vật chất hoá toàn bộ cửa sổ ra RAM/đĩa: các cửa sổ của cùng một clip
    chồng nhau ~98%, lưu hết là nhân dữ liệu lên ~8 lần mà không thêm thông tin.
    Thay vào đó giữ chỉ mục `(clip, vị trí bắt đầu)` và đọc clip khi cần, có cache.
    """

    def __init__(self, clips: Iterable[ClipInfo], max_windows: int = MAX_WINDOWS_PER_CLIP):
        self.clips = [c for c in clips if c.usable]
        self.index: list[tuple[int, int]] = [
            (i, start)
            for i, clip in enumerate(self.clips)
            for start in window_starts(clip.frame_count, max_windows)
        ]

    def __len__(self) -> int:
        return len(self.index)

    @staticmethod
    @lru_cache(maxsize=64)
    def _read(path: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        landmarks, timestamps, mask, _ = read_vslm(path)
        return landmarks, timestamps, mask

    def __getitem__(self, i: int) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, int]:
        clip_i, start = self.index[i]
        clip = self.clips[clip_i]
        landmarks, timestamps, mask = self._read(clip.path)
        end = start + WINDOW_FRAMES

        win_lm = torch.from_numpy(np.ascontiguousarray(landmarks[start:end]))
        win_mask = torch.from_numpy(np.ascontiguousarray(mask[start:end])).float()

        # BẪY #2: quy timestamps về gốc của CỬA SỔ, không phải gốc của clip.
        win_ts = torch.from_numpy(np.ascontiguousarray(timestamps[start:end])).float()
        win_ts = win_ts - win_ts[0]

        return win_lm, win_mask, win_ts, clip.label_index


def split_by_participant(
    clips: Sequence[ClipInfo],
    test_participants: Sequence[str],
) -> tuple[list[ClipInfo], list[ClipInfo]]:
    """Chia train/test theo NGƯỜI. Không cửa sổ nào của một người nằm cả hai bên."""
    test_set = {p.upper() for p in test_participants}
    train = [c for c in clips if c.usable and c.participant not in test_set]
    test = [c for c in clips if c.usable and c.participant in test_set]
    return train, test


def summarize(clips: Sequence[ClipInfo]) -> str:
    """Bảng người × ký hiệu cho clip dùng được, kèm lý do loại."""
    usable = [c for c in clips if c.usable]
    people = sorted({c.participant for c in usable})
    signs = sorted({c.sign_code for c in usable})
    grid: dict[tuple[str, str], int] = defaultdict(int)
    for c in usable:
        grid[(c.sign_code, c.participant)] += 1

    lines = ["%-16s %s  TONG" % ("ky hieu", " ".join("%5s" % p for p in people))]
    for s in signs:
        row = [grid[(s, p)] for p in people]
        lines.append("%-16s %s  %4d" % (s, " ".join("%5d" % v for v in row), sum(row)))
    lines.append(
        "%-16s %s  %4d"
        % (
            "TONG",
            " ".join("%5d" % sum(grid[(s, p)] for s in signs) for p in people),
            len(usable),
        )
    )

    rejected = Counter(r for c in clips if not c.usable for r in c.reasons)
    if rejected:
        lines.append("")
        lines.append("Bi loai (%d/%d clip):" % (len(clips) - len(usable), len(clips)))
        for reason, n in rejected.most_common():
            lines.append("   %-32s %3d" % (reason, n))
    return "\n".join(lines)
