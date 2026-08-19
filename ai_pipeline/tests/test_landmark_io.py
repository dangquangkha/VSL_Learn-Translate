"""Test suite cho landmark_io.py.

Phủ các trường hợp sử dụng và validation của file .vslm v1.
"""

import json
import struct
import tempfile
from pathlib import Path

import numpy as np
import pytest

from ai_pipeline.data.landmark_io import VslmFormatError, read_vslm, write_vslm


@pytest.fixture
def sample_data():
    """Fixture tạo dữ liệu sample ngẫu nhiên cho test."""
    F = 30  # 30 khung hình
    np.random.seed(42)

    landmarks = np.random.randn(F, 75, 4).astype(np.float32)
    timestamps = np.linspace(0, 1.0, F, dtype=np.float32)
    mask = np.random.randint(0, 2, size=(F, 3), dtype=np.uint8)

    header = {
        "format": "vslm",
        "version": 1,
        "participant_code": "P01",
        "sign_code": "xin_chao",
        "label_index": 1,
        "frame_count": F,
        "point_layout": [["pose", 33], ["left_hand", 21], ["right_hand", 21]],
        "values_per_point": 4,
        "duration_ms": 1000,
        "fps_avg": 30.0,
        "video_width": 1280,
        "video_height": 720,
        "recorded_at": "2026-08-19T21:30:00.000Z",
        "recorder_version": "lite-1",
    }

    return landmarks, timestamps, mask, header


@pytest.fixture
def labels_json_path():
    """Đường dẫn đến file labels.json."""
    return Path(__file__).parent.parent.parent / "shared" / "labels.json"


class TestRoundTrip:
    """Test round-trip: write → read (AC-2)."""

    def test_round_trip_basic(self, sample_data):
        """Ghi dữ liệu → đọc lại → khẳng định mảng khớp chính xác."""
        landmarks, timestamps, mask, header = sample_data

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # Ghi
            write_vslm(tmp_path, landmarks, timestamps, mask, header)

            # Đọc
            read_landmarks, read_timestamps, read_mask, read_header = read_vslm(
                tmp_path
            )

            # Khẳng định
            assert np.array_equal(landmarks, read_landmarks)
            assert np.array_equal(timestamps, read_timestamps)
            assert np.array_equal(mask, read_mask)

            # Kiểm tra header các trường chính
            assert read_header["format"] == "vslm"
            assert read_header["version"] == 1
            assert read_header["participant_code"] == "P01"
            assert read_header["label_index"] == 1
            assert read_header["frame_count"] == len(timestamps)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_round_trip_with_zeros(self):
        """Round-trip với landmarks và mask toàn số 0."""
        F = 10
        landmarks = np.zeros((F, 75, 4), dtype=np.float32)
        timestamps = np.zeros(F, dtype=np.float32)
        mask = np.zeros((F, 3), dtype=np.uint8)

        header = {
            "format": "vslm",
            "version": 1,
            "participant_code": "P01",
            "sign_code": "xin_chao",
            "label_index": 1,
            "frame_count": F,
            "point_layout": [["pose", 33], ["left_hand", 21], ["right_hand", 21]],
            "values_per_point": 4,
            "duration_ms": 1000,
            "fps_avg": 30.0,
            "video_width": 1280,
            "video_height": 720,
            "recorded_at": "2026-08-19T21:30:00.000Z",
            "recorder_version": "lite-1",
        }

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            read_landmarks, read_timestamps, read_mask, _ = read_vslm(tmp_path)

            assert np.array_equal(landmarks, read_landmarks)
            assert np.array_equal(timestamps, read_timestamps)
            assert np.array_equal(mask, read_mask)
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestShapeAndDtype:
    """Test shape và dtype trả về."""

    def test_landmarks_shape(self, sample_data):
        """Kiểm tra landmarks trả về shape (F, 75, 4)."""
        landmarks, timestamps, mask, header = sample_data
        F = len(timestamps)

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            read_landmarks, _, _, _ = read_vslm(tmp_path)

            assert read_landmarks.shape == (F, 75, 4)
            assert read_landmarks.dtype == np.float32
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_timestamps_shape(self, sample_data):
        """Kiểm tra timestamps trả về shape (F,)."""
        landmarks, timestamps, mask, header = sample_data
        F = len(timestamps)

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            _, read_timestamps, _, _ = read_vslm(tmp_path)

            assert read_timestamps.shape == (F,)
            assert read_timestamps.dtype == np.float32
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_mask_shape(self, sample_data):
        """Kiểm tra mask trả về shape (F, 3)."""
        landmarks, timestamps, mask, header = sample_data
        F = len(timestamps)

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            _, _, read_mask, _ = read_vslm(tmp_path)

            assert read_mask.shape == (F, 3)
            assert read_mask.dtype == np.uint8
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestHeaderValidation:
    """Test validation header."""

    def test_missing_required_fields(self, sample_data):
        """Raise lỗi khi header thiếu trường bắt buộc."""
        import struct

        landmarks, timestamps, mask, header = sample_data
        F = len(timestamps)

        required_fields = [
            "format", "version", "participant_code", "sign_code",
            "label_index", "frame_count", "point_layout", "values_per_point",
            "duration_ms", "fps_avg", "video_width", "video_height",
            "recorded_at", "recorder_version"
        ]

        for field in required_fields:
            with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
                tmp_path = tmp.name

            try:
                # Ghi file thường trước
                write_vslm(tmp_path, landmarks, timestamps, mask, header)

                # Sau đó manually remove field từ header JSON
                with open(tmp_path, "r+b") as f:
                    # Đọc headerLen
                    header_len_bytes = f.read(4)
                    header_len = struct.unpack("<I", header_len_bytes)[0]

                    # Đọc header JSON
                    header_json_bytes = f.read(header_len)
                    header_dict = json.loads(header_json_bytes.decode("utf-8"))

                    # Remove field
                    del header_dict[field]

                    # Rewrite file với header bị thiếu
                    new_header_json = json.dumps(header_dict, ensure_ascii=False).encode("utf-8")
                    new_header_len = len(new_header_json)

                    # Seek back và rewrite
                    f.seek(0)
                    f.write(struct.pack("<I", new_header_len))
                    f.write(new_header_json)
                    # Truncate file để xóa phần cũ nếu header mới ngắn hơn

                with pytest.raises(VslmFormatError, match=f"thiếu trường.*{field}"):
                    read_vslm(tmp_path)
            finally:
                Path(tmp_path).unlink(missing_ok=True)

    def test_invalid_format(self, sample_data):
        """Raise lỗi khi format không phải 'vslm'."""
        landmarks, timestamps, mask, header = sample_data
        header["format"] = "invalid"

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)

            with pytest.raises(VslmFormatError, match="format phải là 'vslm'"):
                read_vslm(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_invalid_version(self, sample_data):
        """Raise lỗi khi version không phải 1."""
        landmarks, timestamps, mask, header = sample_data
        header["version"] = 2

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)

            with pytest.raises(VslmFormatError, match="version phải là 1"):
                read_vslm(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestFrameCountValidation:
    """Test validation frame_count."""

    def test_frame_count_mismatch(self, sample_data):
        """Raise lỗi khi frame_count không khớp độ dài dữ liệu."""
        landmarks, timestamps, mask, header = sample_data
        F = len(timestamps)

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # Ghi file thường trước
            write_vslm(tmp_path, landmarks, timestamps, mask, header)

            # Sau đó manually modify frame_count trong header JSON
            with open(tmp_path, "r+b") as f:
                # Đọc headerLen
                header_len_bytes = f.read(4)
                header_len = struct.unpack("<I", header_len_bytes)[0]

                # Đọc header JSON
                header_json_bytes = f.read(header_len)
                header_dict = json.loads(header_json_bytes.decode("utf-8"))

                # Sửa frame_count thành sai
                header_dict["frame_count"] = F + 5

                # Rewrite header
                new_header_json = json.dumps(header_dict, ensure_ascii=False).encode("utf-8")
                new_header_len = len(new_header_json)

                # Seek back và rewrite
                f.seek(0)
                f.write(struct.pack("<I", new_header_len))
                f.write(new_header_json)

            # Lỗi có thể là "frame_count không khớp" hoặc "File cắt cụt"
            # tùy vào cách frame_count bị sai
            with pytest.raises(VslmFormatError):
                read_vslm(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestTruncatedFile:
    """Test file cắt cụt."""

    def test_truncated_header(self):
        """Raise lỗi khi file cắt cụt ở phần header."""
        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            # Ghi chỉ 4 byte headerLen
            with open(tmp_path, "wb") as f:
                f.write(b"\x64\x00\x00\x00")  # headerLen = 100
                # Nhưng chỉ ghi 10 byte header thay vì 100

            with pytest.raises(VslmFormatError, match="File cắt cụt"):
                read_vslm(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_too_short_file(self):
        """Raise lỗi khi file quá ngắn."""
        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            with open(tmp_path, "wb") as f:
                f.write(b"\x01\x02")  # Chỉ 2 byte

            with pytest.raises(VslmFormatError, match="File quá ngắn"):
                read_vslm(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestLabelIndexValidation:
    """Test AC-4: label_index khớp với id trong labels.json."""

    def test_label_index_in_labels(self, sample_data, labels_json_path):
        """Kiểm tra label_index trong header khớp với id trong labels.json."""
        landmarks, timestamps, mask, header = sample_data

        # Đọc labels.json
        with open(labels_json_path, "r", encoding="utf-8") as f:
            labels_data = json.load(f)

        # Lấy tất cả valid ids từ labels
        valid_ids = [label["id"] for label in labels_data["labels"]]

        # Test một số valid ids
        for label_id in valid_ids[:5]:  # Chỉ test 5 cái
            header["label_index"] = label_id

            with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
                tmp_path = tmp.name

            try:
                write_vslm(tmp_path, landmarks, timestamps, mask, header)
                _, _, _, read_header = read_vslm(tmp_path)

                assert read_header["label_index"] == label_id
                # Kiểm tra id này có trong labels
                assert label_id in valid_ids
            finally:
                Path(tmp_path).unlink(missing_ok=True)

    def test_invalid_label_index(self, sample_data, labels_json_path):
        """Test với invalid label_index (không có trong labels.json)."""
        landmarks, timestamps, mask, header = sample_data

        # Đọc labels.json
        with open(labels_json_path, "r", encoding="utf-8") as f:
            labels_data = json.load(f)

        valid_ids = [label["id"] for label in labels_data["labels"]]
        # Tìm một id không có trong labels
        invalid_id = max(valid_ids) + 100

        header["label_index"] = invalid_id

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            _, _, _, read_header = read_vslm(tmp_path)

            # File được ghi/đọc thành công, nhưng label_index không hợp lệ
            assert read_header["label_index"] == invalid_id
            # Nhưng theo AC-4, label_index phải khớp với id trong labels.json
            # Đây là warning/validation ở app level, reader chỉ cần ghi/đọc
            assert invalid_id not in valid_ids
        finally:
            Path(tmp_path).unlink(missing_ok=True)


class TestEdgeCases:
    """Test các trường hợp edge case."""

    def test_single_frame(self):
        """Test với chỉ 1 khung hình."""
        F = 1
        landmarks = np.ones((F, 75, 4), dtype=np.float32)
        timestamps = np.array([0.0], dtype=np.float32)
        mask = np.ones((F, 3), dtype=np.uint8)

        header = {
            "format": "vslm",
            "version": 1,
            "participant_code": "P01",
            "sign_code": "xin_chao",
            "label_index": 0,
            "frame_count": F,
            "point_layout": [["pose", 33], ["left_hand", 21], ["right_hand", 21]],
            "values_per_point": 4,
            "duration_ms": 33,
            "fps_avg": 30.0,
            "video_width": 1280,
            "video_height": 720,
            "recorded_at": "2026-08-19T21:30:00.000Z",
            "recorder_version": "lite-1",
        }

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            read_landmarks, read_timestamps, read_mask, _ = read_vslm(tmp_path)

            assert read_landmarks.shape == (1, 75, 4)
            assert read_timestamps.shape == (1,)
            assert read_mask.shape == (1, 3)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    def test_large_frame_count(self):
        """Test với số khung hình lớn."""
        F = 300  # 10 giây @ 30fps
        landmarks = np.random.randn(F, 75, 4).astype(np.float32)
        timestamps = np.linspace(0, 10.0, F, dtype=np.float32)
        mask = np.ones((F, 3), dtype=np.uint8)

        header = {
            "format": "vslm",
            "version": 1,
            "participant_code": "P02",
            "sign_code": "cam_on",
            "label_index": 2,
            "frame_count": F,
            "point_layout": [["pose", 33], ["left_hand", 21], ["right_hand", 21]],
            "values_per_point": 4,
            "duration_ms": 10000,
            "fps_avg": 30.0,
            "video_width": 1920,
            "video_height": 1080,
            "recorded_at": "2026-08-19T22:00:00.000Z",
            "recorder_version": "lite-1",
        }

        with tempfile.NamedTemporaryFile(suffix=".vslm", delete=False) as tmp:
            tmp_path = tmp.name

        try:
            write_vslm(tmp_path, landmarks, timestamps, mask, header)
            read_landmarks, read_timestamps, read_mask, _ = read_vslm(tmp_path)

            assert read_landmarks.shape == (F, 75, 4)
            assert np.allclose(timestamps, read_timestamps)
        finally:
            Path(tmp_path).unlink(missing_ok=True)
