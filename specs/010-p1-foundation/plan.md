# Plan 010 — P1 Foundation

Kế hoạch triển khai cho `spec.md`. Thực hiện **tuần tự từng đầu việc**, xong một cái thì cập nhật `TIENDO.html` + commit rồi mới sang cái tiếp theo.

---

## Môi trường

| | |
|---|---|
| Node | v24.14.0 ✅ |
| npm | 11.9.0 ✅ |
| Python | **gọi bằng `py`, không phải `python`** (Windows Store alias chặn `python`) |
| Encoding | Console mặc định là **cp1258**, `print()` tiếng Việt sẽ ném `UnicodeEncodeError`. Mọi script Python phải chạy với `PYTHONIOENCODING=utf-8`, hoặc chỉ log bằng ASCII |
| Nhánh | `feat/p1-foundation` |

---

## P1-3 — Định dạng `.vslm`  ▸ thực hiện cùng P1-1

Định dạng là contract, không phải code. Nhưng contract chưa ai đọc lại được thì chưa chứng minh được là đúng — nên phần reader Python nằm cùng đợt này.

| # | Việc | File |
|---|---|---|
| 1 | Writer + reader Python cho `.vslm` | `ai_pipeline/data/landmark_io.py` |
| 2 | Test round-trip + validate header | `ai_pipeline/tests/test_landmark_io.py` |

**API tối thiểu:**

```python
write_vslm(path, landmarks, timestamps, mask, header) -> None
read_vslm(path) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict]
#   landmarks (F,75,4) float32 · timestamps (F,) float32 · mask (F,3) uint8 · header dict
```

Reader phải raise lỗi rõ ràng khi: magic/format sai, `frame_count` không khớp độ dài dữ liệu, thiếu trường header bắt buộc.

---

## P1-1 — `recorder-lite`  ▸ ĐANG LÀM

| # | Việc | File |
|---|---|---|
| 1 | Khởi tạo Vite + TS | `tools/recorder-lite/package.json`, `vite.config.ts`, `index.html` |
| 2 | Nạp MediaPipe Tasks Vision, khởi tạo Hand + Pose Landmarker | `src/mediapipe.ts` |
| 3 | Vòng lặp webcam + trích landmark mỗi khung hình | `src/capture.ts` |
| 4 | Gom 75 điểm theo đúng thứ tự §3, sinh `mask` + `timestamps` | `src/frameAssembler.ts` |
| 5 | Ghi file `.vslm` (khớp bit-for-bit với reader Python) | `src/vslmWriter.ts` |
| 6 | UI: chọn ký hiệu, đếm ngược, ghi 3s, Giữ/Quay lại, bộ đếm phiên | `src/main.ts`, `src/ui.ts` |
| 7 | Đọc danh sách ký hiệu từ `shared/labels.json` | import trực tiếp qua alias Vite |

**Quyết định triển khai:**

- MediaPipe qua `@mediapipe/tasks-vision`; file `.task` model tải từ CDN lần đầu rồi cache — chấp nhận được vì đây là công cụ nội bộ.
- Chạy Hand + Pose **song song trên cùng một khung hình**, không xen kẽ, để `timestamps` của hai nhóm khớp nhau.
- Không dùng React — vanilla TS đủ và khởi động nhanh hơn.
- Lưu file bằng `Blob` + thẻ `<a download>`; không dùng File System Access API để tránh khác biệt giữa các trình duyệt.

---

## P1-2 — ONNX giả  ▸ CHƯA LÀM

| # | Việc | File |
|---|---|---|
| 1 | Wrapper nhận 3 input theo §2.1 | `ai_pipeline/models/vsl_classifier_v2.py` |
| 2 | Chọn 55/75 điểm + ghép velocity + mask **bên trong** graph | cùng file |
| 3 | Sửa `export_onnx.py` xuất 3 input | `ai_pipeline/export/export_onnx.py` |
| 4 | Ghi chú model giả | `models/DUMMY.md` |
| 5 | Kiểm tra nạp được bằng `onnxruntime-web` | test thủ công trong trình duyệt |

> Không đụng `vsl_classifier_wrapper.py` cũ — giữ lại để đối chiếu, xoá sau khi P1-6 xong.

---

## P1-4 — Module `useLandmarks`  ▸ CHƯA LÀM

Chỉ bắt đầu **sau khi** `recorder-lite` chạy ổn định. Đây là bước tách code đã chạy được thành module, không phải viết mới.

| # | Việc | File |
|---|---|---|
| 1 | Chuyển `mediapipe.ts` + `capture.ts` + `frameAssembler.ts` sang package dùng chung | `shared/landmarks/` |
| 2 | Trỏ `recorder-lite` sang package, xác nhận `AC-6`…`AC-9` vẫn đạt | |
| 3 | Viết `README.md` cho package — P2 và P3 đọc cái này để dùng | `shared/landmarks/README.md` |

---

## Thứ tự commit

| Commit | Nội dung | Cập nhật `TIENDO.html` |
|---|---|---|
| 1 | `feat(recorder): recorder-lite + định dạng .vslm` | `P1-3` → `done`, `P1-1` → `done` |
| 2 | `feat(ai): export ONNX giả đúng interface 3 tensor` | `P1-2` → `done` — **mở cổng `onnxDummy`** |
| 3 | `refactor(landmarks): tách module useLandmarks dùng chung` | `P1-4` → `done` — **mở cổng `useLandmarks`** |
