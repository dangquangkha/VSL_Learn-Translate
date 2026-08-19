# Spec 010 — P1 Foundation (giai đoạn ①)

| | |
|---|---|
| **Chủ sở hữu** | P1 (Tài) |
| **Chế độ** | Sprint Demo (`AGENTS.md` §4.2) — spec rút gọn còn Context + Acceptance Criteria |
| **Đầu việc bao phủ** | `P1-1` recorder-lite · `P1-2` ONNX giả · `P1-3` định dạng landmark · `P1-4` module `useLandmarks` |
| **Gỡ chặn cho** | Cả nhóm (P1-1) · P2 Khải, P4 Hùng (P1-2) · P2 Khải, P3 An (P1-4) |

---

## 1. Context

Repo chưa có frontend và chưa có dữ liệu. Bốn đầu việc trong spec này là **cổng chặn của giai đoạn ①**: chưa xong thì cả nhóm không quay được dữ liệu và P2/P4 không build được tính năng.

Mục tiêu **không phải** sản phẩm hoàn chỉnh, mà là bốn thứ tối thiểu để cả nhóm chạy song song:

1. Một công cụ quay đủ dùng để 5 người thu 720 clip.
2. Một định dạng file landmark được cả JavaScript (ghi) lẫn Python (đọc) thống nhất.
3. Một file `.onnx` đúng interface cuối cùng để P2/P4 build mà không chờ model thật.
4. Một module trích landmark dùng chung cho recorder, chế độ Dịch và chế độ Học.

---

## 2. Hai quyết định kỹ thuật bắt buộc

### 2.1 Interface ONNX — chuyển sang 3 tensor theo SRS §5.2

`ai_pipeline/export/export_onnx.py` hiện xuất **một** input `raw_landmarks [B, T, 333]`. Giữ nguyên nghĩa là **JavaScript phải tự dựng 333 đặc trưng** (ghép toạ độ + vận tốc + mask), tức là tự tiền xử lý — vi phạm nguyên tắc Zero Training/Serving Skew, thứ mà `AGENTS.md` §4.2 xếp vào cột **không được nới lỏng kể cả trong sprint demo**.

**Quyết định: interface ONNX là 3 tensor, JS chỉ đưa landmark thô.**

| Tên | Kiểu | Hình dạng | Nội dung |
|---|---|---|---|
| `landmarks` | float32 | `[1, 60, 75, 4]` | 75 điểm × 60 khung hình gần nhất, mỗi điểm `(x, y, z, visibility)` |
| `mask` | float32 | `[1, 60, 3]` | Có/không phát hiện: pose, tay trái, tay phải |
| `timestamps` | float32 | `[1, 60]` | Thời điểm tương đối của từng khung hình (giây); ô đệm = `-1.0` |

**Đầu ra:** `logits` float32 `[1, 51]`.

> Ghi chú lệch so với SRS §5.2: SRS ghi `[1, 60, 55, 3]` (55 điểm đã chọn subset, 3 giá trị). Spec này dùng **75 điểm × 4 giá trị** để khớp với dữ liệu thô mà MediaPipe trả về (33 pose + 21×2 tay) và với yêu cầu §4.3 của SRS là **lưu toàn bộ landmark, không cắt subset**. Việc chọn 55 điểm là bước nằm **bên trong** ONNX graph, không phải việc của JavaScript.

### 2.2 Lỗi đã phát hiện trong `preprocessor_module.py`

```python
_vel = self.velocity_calc(x)   # tính xong rồi vứt đi
return x                        # thiếu ghép velocity + mask channel
```

Bước 7 theo SRS phải trả về `[1, 32, 333]` = 165 toạ độ + 165 vận tốc + 3 kênh mask. Hiện tại `forward()` chỉ trả về đầu ra của interpolator.

**Không sửa trong spec này** — thuộc phạm vi `P1-6` (train.py). Ghi nhận ở đây để không ai tưởng phần tiền xử lý đã hoàn chỉnh.

---

## 3. P1-3 — Định dạng file landmark `.vslm` v1

Nguồn sự thật cho contract giữa Recorder (P3 An) và training pipeline (P1 Tài).

### Bố cục nhị phân

| Vị trí | Kiểu | Nội dung |
|---|---|---|
| `0 … 3` | uint32 LE | `headerLen` — độ dài phần header tính bằng byte |
| `4 … 4+headerLen` | UTF-8 | Header JSON |
| tiếp theo | float32 LE × `F × 75 × 4` | `landmarks` |
| tiếp theo | float32 LE × `F` | `timestamps` (giây, tương đối so với khung đầu) |
| tiếp theo | uint8 × `F × 3` | `mask` — pose, tay trái, tay phải (`0` hoặc `1`) |

`F` = `frame_count` trong header.

### Thứ tự 75 điểm (cố định, không đổi)

| Chỉ số | Nhóm | Số điểm | Nguồn |
|---|---|---|---|
| `0 … 32` | pose | 33 | MediaPipe Pose Landmarker |
| `33 … 53` | tay trái | 21 | MediaPipe Hand Landmarker (`handedness = Left`) |
| `54 … 74` | tay phải | 21 | MediaPipe Hand Landmarker (`handedness = Right`) |

Mỗi điểm 4 giá trị `float32`: `x`, `y`, `z`, `visibility`.

- Pose: dùng `visibility` do MediaPipe trả về.
- Tay: MediaPipe không trả `visibility` → ghi `1.0` nếu phát hiện được tay đó ở khung hình này, `0.0` nếu không.
- Khung hình không phát hiện được một nhóm → toàn bộ điểm của nhóm đó ghi `0.0` và `mask` tương ứng bằng `0`.

### Header JSON — các trường bắt buộc

```json
{
  "format": "vslm",
  "version": 1,
  "participant_code": "P01",
  "sign_code": "xin_chao",
  "label_index": 1,
  "frame_count": 88,
  "point_layout": [["pose", 33], ["left_hand", 21], ["right_hand", 21]],
  "values_per_point": 4,
  "duration_ms": 3000,
  "fps_avg": 29.3,
  "video_width": 1280,
  "video_height": 720,
  "recorded_at": "2026-08-19T21:30:00.000Z",
  "recorder_version": "lite-1"
}
```

### Tên file

`{participant_code}__{sign_code}__{recorded_at_compact}.vslm`
ví dụ `P01__xin_chao__20260819T213000123Z.vslm`

### Acceptance Criteria — P1-3

- [x] `AC-1` File `.vslm` do JavaScript ghi ra đọc được bằng Python và cho đúng shape `(F, 75, 4)`, `(F,)`, `(F, 3)`. — **đã kiểm chứng** bằng test chéo: bundle `vslmWriter.ts` qua esbuild, ghi 91 khung, đọc lại bằng `landmark_io.py`, giá trị khớp `atol=1e-6`
- [x] `AC-2` Round-trip test: ghi bằng Python → đọc lại bằng Python → mảng khớp chính xác (`np.array_equal`). — **15/15 pytest pass**
- [x] `AC-3` Header JSON parse được và chứa đủ **14 trường** bắt buộc ở trên.
- [x] `AC-4` `label_index` trong header khớp với `id` tương ứng trong `shared/labels.json`.

---

## 4. P1-1 — `recorder-lite`

Công cụ quay tạm, **độc lập hoàn toàn** với `frontend/`. Mục đích duy nhất: để 5 thành viên nhóm thu được 720 clip trong sáng mai. Không phải Recorder thật (đó là `P3-2` của An, có consent, metadata, kiểm tra thiết bị đầy đủ).

### 12 ký hiệu demo — ĐÃ CHỐT

Nguyên tắc chọn: tránh các cặp dễ nhầm, trải đều về **vị trí thực hiện** (mặt / ngực / không gian trung tính) và **kiểu chuyển động**. Với 12 lớp mà chỉ ~60 mẫu/lớp, hai ký hiệu giống nhau là đủ để kéo tụt độ chính xác trên sân khấu.

| id | code | Lý do chọn |
|---|---|---|
| 1 | `xin_chao` | Chào hỏi, thực hiện gần đầu |
| 2 | `cam_on` | Xã giao, khác vị trí với `xin_chao` |
| 5 | `ban` | Chỉ ra ngoài |
| 6 | `toi` | Chỉ vào mình — tương phản rõ với `ban` |
| 10 | `khong` | Phủ định |
| 11 | `co` | Khẳng định — tương phản rõ với `khong` |
| 12 | `giup_do` | Hai tay, chuyển động nâng |
| 15 | `hoc` | Trừu tượng |
| 21 | `gia_dinh` | Hai tay, chuyển động vòng |
| 30 | `nha` | Hai tay tạo hình mái — khác biệt nhất trong tập |
| 34 | `an` | Tay đưa lên miệng |
| 38 | `di` | Chuyển động ngang |

Cộng lớp `idle` (id 0) → **13 lớp** cho model demo.

**Đã loại có chủ đích:**

| Loại bỏ | Vì |
|---|---|
| `tam_biet` | Dễ nhầm `xin_chao` — cả hai thường là động tác vẫy tay |
| `xin_loi` | Dễ nhầm `cam_on` — cùng xuất phát từ vùng cằm/miệng |
| `uong` | Dễ nhầm `an` — cùng vị trí ở miệng |
| `anh` `chi` `em` `bo` `me` `ong` `ba` | Nhóm người thân thường chung hình tay, chỉ khác vị trí |
| `hom_nay` `ngay_mai` `hom_qua` | **Rủi ro nhầm cao nhất** — thường cùng gốc, chỉ khác hướng chuyển động |

> **Cần xác minh bằng mắt:** danh sách trên dựa trên đặc điểm chung của ngôn ngữ ký hiệu, **chưa đối chiếu video QIPEDC thật**. Tra thử 12 từ này trên `qipedc.moet.gov.vn/dictionary` (~5 phút) để xác nhận chúng thật sự khác nhau rõ; thấy cặp nào giống thì đổi sang từ khác trong `shared/labels.json`. Việc này đồng thời hoàn thành mốc kiểm chứng tuần 1 của SRS.

### Ghi nhận: `shared/labels.json` không khớp SRS Phụ lục A

Hai danh sách khác nhau đáng kể. `labels.json` **không có** số đếm (một…năm), `o_dau`, `can`, `ngu`, `dau`, `benh_vien`, `nha_ve_sinh`, `tien`, `buon`, `met`, `doi`, `khat`, `sang`, `chieu`, `toi_(buổi)`; ngược lại nó **có** `hoc`, `tieng`, `ky_hieu`, `viet_nam`, `gap_go`, `ong`, `ba`, `nha`, `truong_hoc`, `thay_co`, `com`, `den`, `lam_viec`, `nghi_ngoi`, `gio`, `yeu`, `dep` — những từ không có trong Phụ lục A.

**Xử lý:** theo `AGENTS.md` §1.1, `shared/labels.json` là nguồn sự thật duy nhất và thắng SRS về thứ tự ưu tiên → dùng `labels.json`, không sửa.

**Hệ quả phải nêu trong báo cáo:** `labels.json` **không có ký hiệu tĩnh nào** (SRS giữ số đếm chính là để chứng minh model xử lý được cả hai loại tĩnh và động). Điểm phân tích này hiện đang mất. Không ảnh hưởng demo tuần này, nhưng phải nói rõ khi bảo vệ thay vì để hội đồng phát hiện.

### Yêu cầu chức năng

| Mã | Yêu cầu |
|---|---|
| `R-01` | Ứng dụng Vite + TypeScript độc lập tại `tools/recorder-lite/`, chạy bằng `npm run dev`, **không cần backend, không cần đăng nhập** |
| `R-02` | Người quay nhập `participant_code` (ví dụ `P01`) một lần khi bắt đầu phiên; lưu vào `localStorage` |
| `R-03` | Chọn tập ký hiệu cần quay từ `shared/labels.json`; mặc định là 12 ký hiệu demo + `idle` |
| `R-04` | Hiển thị webcam trực tiếp, chạy MediaPipe Hand Landmarker + Pose Landmarker mỗi khung hình |
| `R-05` | Hiển thị trạng thái thời gian thực: fps hiện tại, thấy pose hay không, thấy tay trái/phải hay không |
| `R-06` | Nút Ghi → đếm ngược 3-2-1 → ghi landmark trong **3 giây** → tự dừng |
| `R-07` | Sau khi ghi: hiện `frame_count`, `fps_avg`, tỉ lệ khung hình thấy tay; hai nút **Giữ** và **Quay lại** |
| `R-08` | Bấm Giữ → sinh file `.vslm` theo §3 và tải về máy (Blob download) |
| `R-09` | Bộ đếm phiên: hiển thị đã quay bao nhiêu lần cho mỗi ký hiệu, để người quay biết còn thiếu gì |
| `R-10` | Cảnh báo (không chặn) nếu `fps_avg < 15` hoặc > 20% khung hình mất cả hai tay |

### Ngoài phạm vi P1-1

Phiếu đồng ý · khai metadata nhân khẩu · kiểm tra ánh sáng/khoảng cách · upload R2 · hàng đợi nền · layout Android · tài khoản. Tất cả thuộc `P3-2`.

### Acceptance Criteria — P1-1

- [~] `AC-5` `npm install && npm run dev` chạy được, mở trình duyệt thấy webcam. — `npm install` ✅, `npx tsc --noEmit` sạch ✅, `npm run build` ✅ (164 KB). **Phần webcam chưa test** (môi trường không có webcam)
- [ ] `AC-6` Quay một clip 3 giây trên máy ~30fps cho `frame_count` trong khoảng 80–95. — **CẦN TEST BẰNG WEBCAM THẬT**
- [x] `AC-7` File `.vslm` đọc được bằng `ai_pipeline/data/landmark_io.py`. — **đã kiểm chứng end-to-end** (xem `AC-1`)
- [x] `AC-8` Mất tay → `mask = 0`, toạ độ tay `0.0`, không `NaN`. — **đã kiểm chứng** trên dữ liệu mô phỏng khung 10–14
- [ ] `AC-9` Quay liên tiếp 3 clip không phải tải lại trang. — **CẦN TEST BẰNG WEBCAM THẬT**

### Ba việc phải làm với webcam thật trước khi cả nhóm quay

1. `AC-6` — quay thử 1 clip, xác nhận `frame_count` rơi vào 80–95.
2. `AC-9` — quay 3 clip liên tiếp không tải lại trang.
3. **Kiểm tra nhãn `handedness`** — MediaPipe phân loại tay dựa trên giả định ảnh đã lật gương. Camera thật trả khung hình gốc, nên có khả năng giơ tay phải mà MediaPipe gắn nhãn `"Left"`. Không sai spec (spec định nghĩa tay trái/phải = đúng nhãn MediaPipe trả về), nhưng phải xác nhận **nhất quán** trước khi 5 người quay 720 clip — phát hiện sau khi quay xong là phải quay lại toàn bộ.

---

## 5. P1-2 — ONNX giả (đúng interface cuối)

File `.onnx` với **trọng số ngẫu nhiên** nhưng **interface đúng §2.1**, giao cho P2 Khải và P4 Hùng để build tính năng mà không chờ model thật.

### Acceptance Criteria — P1-2

- [ ] `AC-10` File `.onnx` nhận đúng 3 input theo §2.1 và trả `logits [1, 51]`.
- [ ] `AC-11` Nạp được bằng `onnxruntime` phía Python **và** bằng `onnxruntime-web` trong trình duyệt.
- [ ] `AC-12` Metadata nhúng `label_hash` khớp với `shared/labels.json` (dùng `ai_pipeline/utils/label_hash.py`).
- [ ] `AC-13` Có file `models/DUMMY.md` ghi rõ đây là model giả, không dùng để đánh giá.

---

## 6. P1-4 — Module `useLandmarks`

Tách logic trích landmark từ `recorder-lite` thành module tái dùng cho P2 (chế độ Dịch) và P3 (Recorder thật).

### Acceptance Criteria — P1-4

- [ ] `AC-14` Module đặt tại `shared/landmarks/` hoặc `packages/landmarks/`, import được từ cả `frontend/` lẫn `tools/recorder-lite/`.
- [ ] `AC-15` API trả về stream landmark chuẩn hoá thành mảng `[75, 4]` + `mask [3]` + `timestamp` mỗi khung hình.
- [ ] `AC-16` `recorder-lite` được refactor để dùng module này, hành vi không đổi (`AC-6`…`AC-9` vẫn đạt).

---

## 7. Out of Scope (toàn spec)

Training loop · dataset builder · golden test · lượng tử hoá int8 · upload R2 · bất kỳ endpoint backend nào · sửa lỗi `preprocessor_module.py` (thuộc `P1-6`).
