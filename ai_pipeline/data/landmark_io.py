"""I/O cho file .vslm v1.

Module xử lý đọc/ghi file landmark định dạng .vslm v1 theo spec 010-p1-foundation.
"""

import json
import struct
from pathlib import Path
from typing import Any, Tuple

import numpy as np


class VslmFormatError(Exception):
    """Lỗi khi định dạng file .vslm không hợp lệ."""
    pass


def write_vslm(
    path: str | Path,
    landmarks: np.ndarray,
    timestamps: np.ndarray,
    mask: np.ndarray,
    header: dict[str, Any],
) -> None:
    """Ghi dữ liệu landmark vào file .vslm v1.

    Args:
        path: Đường dẫn file đích
        landmarks: Mảng shape (F, 75, 4) dtype float32 - tọa độ 75 điểm
        timestamps: Mảng shape (F,) dtype float32 - thời điểm (giây)
        mask: Mảng shape (F, 3) dtype uint8 - mask phát hiện [pose, left_hand, right_hand]
        header: Dict chứa metadata (phải có frame_count)

    Raises:
        ValueError: Nếu shape hoặc dtype không hợp lệ
    """
    path = Path(path)

    # Kiểm tra shape và dtype
    if landmarks.shape != (len(timestamps), 75, 4):
        raise ValueError(
            f"landmarks shape phải là ({len(timestamps)}, 75, 4), "
            f"nhận {landmarks.shape}"
        )
    if landmarks.dtype != np.float32:
        raise ValueError(f"landmarks dtype phải float32, nhận {landmarks.dtype}")

    if timestamps.dtype != np.float32:
        raise ValueError(f"timestamps dtype phải float32, nhận {timestamps.dtype}")

    if mask.shape != (len(timestamps), 3):
        raise ValueError(
            f"mask shape phải là ({len(timestamps)}, 3), "
            f"nhận {mask.shape}"
        )
    if mask.dtype != np.uint8:
        raise ValueError(f"mask dtype phải uint8, nhận {mask.dtype}")

    # Đảm bảo header có frame_count khớp
    F = len(timestamps)
    header = dict(header)  # Copy để không thay đổi gốc
    header["frame_count"] = F

    # Mã hóa header JSON
    header_json = json.dumps(header, ensure_ascii=False).encode("utf-8")
    header_len = len(header_json)

    # Ghi file
    with open(path, "wb") as f:
        # 1. Ghi headerLen (uint32 LE)
        f.write(struct.pack("<I", header_len))

        # 2. Ghi header JSON
        f.write(header_json)

        # 3. Ghi landmarks (F × 75 × 4 float32 LE)
        # Dùng "<f4" thay vì np.float32 để ép little-endian tường minh, không phụ
        # thuộc byte order của máy — đây là contract dùng chung với JavaScript.
        f.write(landmarks.astype("<f4", order="C").tobytes())

        # 4. Ghi timestamps (F float32 LE)
        f.write(timestamps.astype("<f4", order="C").tobytes())

        # 5. Ghi mask (F × 3 uint8)
        f.write(mask.astype(np.uint8, order="C").tobytes())


def read_vslm(path: str | Path) -> Tuple[np.ndarray, np.ndarray, np.ndarray, dict]:
    """Đọc dữ liệu landmark từ file .vslm v1.

    Args:
        path: Đường dẫn file

    Returns:
        Tuple (landmarks, timestamps, mask, header) với:
        - landmarks: np.ndarray shape (F, 75, 4) dtype float32
        - timestamps: np.ndarray shape (F,) dtype float32
        - mask: np.ndarray shape (F, 3) dtype uint8
        - header: dict metadata

    Raises:
        VslmFormatError: Nếu định dạng file không hợp lệ
    """
    path = Path(path)

    try:
        with open(path, "rb") as f:
            # 1. Đọc headerLen (uint32 LE)
            header_len_bytes = f.read(4)
            if len(header_len_bytes) < 4:
                raise VslmFormatError("File quá ngắn: không đủ 4 byte cho headerLen")

            header_len = struct.unpack("<I", header_len_bytes)[0]

            # 2. Đọc header JSON
            header_json_bytes = f.read(header_len)
            if len(header_json_bytes) < header_len:
                raise VslmFormatError(
                    f"File cắt cụt: cần {header_len} byte header, "
                    f"nhận {len(header_json_bytes)} byte"
                )

            try:
                header = json.loads(header_json_bytes.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                raise VslmFormatError(f"Header JSON không hợp lệ: {e}")

            # Kiểm tra các trường bắt buộc
            required_fields = [
                "format", "version", "participant_code", "sign_code",
                "label_index", "frame_count", "point_layout", "values_per_point",
                "duration_ms", "fps_avg", "video_width", "video_height",
                "recorded_at", "recorder_version"
            ]
            for field in required_fields:
                if field not in header:
                    raise VslmFormatError(f"Header thiếu trường bắt buộc: {field}")

            # Kiểm tra format và version
            if header.get("format") != "vslm":
                raise VslmFormatError(
                    f"format phải là 'vslm', nhận '{header.get('format')}'"
                )
            if header.get("version") != 1:
                raise VslmFormatError(
                    f"version phải là 1, nhận {header.get('version')}"
                )

            F = header.get("frame_count")

            # 3. Đọc landmarks (F × 75 × 4 float32 LE)
            landmarks_size = F * 75 * 4 * 4  # 4 bytes per float32
            landmarks_bytes = f.read(landmarks_size)
            if len(landmarks_bytes) < landmarks_size:
                raise VslmFormatError(
                    f"File cắt cụt: cần {landmarks_size} byte landmarks, "
                    f"nhận {len(landmarks_bytes)} byte"
                )
            # "<f4" ép little-endian tường minh; .copy() để mảng trả về ghi được
            # (np.frombuffer trả về mảng read-only, sẽ vỡ ở bước dựng dataset).
            landmarks = np.frombuffer(
                landmarks_bytes, dtype="<f4"
            ).reshape((F, 75, 4)).copy()

            # 4. Đọc timestamps (F float32 LE)
            timestamps_size = F * 4  # 4 bytes per float32
            timestamps_bytes = f.read(timestamps_size)
            if len(timestamps_bytes) < timestamps_size:
                raise VslmFormatError(
                    f"File cắt cụt: cần {timestamps_size} byte timestamps, "
                    f"nhận {len(timestamps_bytes)} byte"
                )
            timestamps = np.frombuffer(timestamps_bytes, dtype="<f4").copy()

            # 5. Đọc mask (F × 3 uint8)
            mask_size = F * 3  # 1 byte per uint8
            mask_bytes = f.read(mask_size)
            if len(mask_bytes) < mask_size:
                raise VslmFormatError(
                    f"File cắt cụt: cần {mask_size} byte mask, "
                    f"nhận {len(mask_bytes)} byte"
                )
            mask = np.frombuffer(mask_bytes, dtype=np.uint8).reshape((F, 3)).copy()

    except VslmFormatError:
        raise
    except Exception as e:
        raise VslmFormatError(f"Lỗi đọc file: {e}")

    # Kiểm tra frame_count khớp với độ dài thực tế
    if len(landmarks) != F or len(timestamps) != F or len(mask) != F:
        raise VslmFormatError(
            f"frame_count ({F}) không khớp với độ dài dữ liệu: "
            f"landmarks {len(landmarks)}, timestamps {len(timestamps)}, mask {len(mask)}"
        )

    return landmarks, timestamps, mask, header
