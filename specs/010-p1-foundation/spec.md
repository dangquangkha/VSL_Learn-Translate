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

1. Một công cụ quay đủ dùng để 5 người thu 600 clip.
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

### 2.2 Hai lỗi trong pipeline tiền xử lý có sẵn

Cả hai đều tồn tại từ `first commit`, không phải do sprint này gây ra.

**Lỗi A — `shoulder_normalizer.py` làm hỏng shape. ĐÃ SỬA ✅**

```python
scale_factor = 1.0 / (shoulder_dist + self.epsilon)   # da la [B, T, 1]
x_reshaped = x_reshaped * scale_factor.unsqueeze(-1)  # -> [B, T, 1, 1]  SAI
```

`torch.norm` dùng `keepdim=True` nên `shoulder_dist` đã là `[B, T, 1]`, broadcast đúng với `[B, T, 333]`. Thêm `.unsqueeze(-1)` biến nó thành `[B, T, 1, 1]`, broadcast ra **`[B, T, T, 333]`** — thừa một chiều. `RotationAligner` ở bước sau slice `x[:, :, 48:50]` vào chiều rộng `T` thay vì chiều đặc trưng → `IndexError`.

**Hệ quả:** toàn bộ pipeline tiền xử lý **chưa bao giờ chạy được**, kéo theo `export_onnx.py` chưa từng xuất thành công, nên `models/vsl_classifier_v1.onnx` không tồn tại và 2 test ONNX cũng fail. Tổng cộng 5/20 test fail đều quy về một dòng này.

Đã sửa: bỏ `.unsqueeze(-1)`. Kết quả `pytest ai_pipeline/tests/` từ **5 failed → 2 failed** (2 test còn lại chờ file model của `P1-2`).

**Lỗi B — `preprocessor_module.py` vứt kênh vận tốc. CHƯA SỬA**

```python
_vel = self.velocity_calc(x)   # tính xong rồi vứt đi
return x                        # thiếu ghép velocity + 3 kênh mask
```

Bước 7 theo SRS phải trả về `[1, 32, 333]` = 165 toạ độ + 165 vận tốc + 3 kênh mask. Hiện `forward()` chỉ trả về đầu ra của interpolator — shape tình cờ đúng nên test shape vẫn pass, nhưng **nội dung sai**.

**Thuộc phạm vi `P1-6`** (train.py). Không sửa ở đây vì nó đổi ý nghĩa đặc trưng đầu vào, phải làm cùng lúc với việc thiết kế model.

### 2.3 Xung đột layout: 333 đặc trưng ≠ 75 điểm của `.vslm`

Đọc `rotation_aligner.py` và `shoulder_normalizer.py` cho thấy layout 333 đặc trưng của code có sẵn là:

| Khối | Số điểm | Giá trị/điểm | Vị trí |
|---|---|---|---|
| pose | 33 | 4 | 0–131 |
| tay trái | 21 | 3 | 132–194 |
| tay phải | 21 | 3 | 195–257 |
| **mặt** | **25** | 3 | **258–332** |

Tổng **100 điểm**, có riêng một khối 25 điểm khuôn mặt.

Nhưng `.vslm` (§3) lưu **75 điểm**, không có khối mặt — và `recorder-lite` chỉ chạy Hand + Pose Landmarker, **không có FaceLandmarker**, nên không tồn tại nguồn dữ liệu nào cho 25 điểm đó.

**Hệ quả cho `P1-2` và `P1-6`:** không thể đưa thẳng dữ liệu `.vslm` vào 5 module tiền xử lý có sẵn. Phải viết đường xử lý mới nhận `[1, 60, 75, 4]` theo interface §2.1. Các module cũ chỉ dùng để tham khảo công thức, không tái sử dụng trực tiếp được.

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
  "sign_code": "chao",
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
ví dụ `P01__chao__20260819T213000123Z.vslm`

### Acceptance Criteria — P1-3

- [x] `AC-1` File `.vslm` do JavaScript ghi ra đọc được bằng Python và cho đúng shape `(F, 75, 4)`, `(F,)`, `(F, 3)`. — **đã kiểm chứng** bằng test chéo: bundle `vslmWriter.ts` qua esbuild, ghi 91 khung, đọc lại bằng `landmark_io.py`, giá trị khớp `atol=1e-6`
- [x] `AC-2` Round-trip test: ghi bằng Python → đọc lại bằng Python → mảng khớp chính xác (`np.array_equal`). — **15/15 pytest pass**
- [x] `AC-3` Header JSON parse được và chứa đủ **14 trường** bắt buộc ở trên.
- [x] `AC-4` `label_index` trong header khớp với `id` tương ứng trong `shared/labels.json`.

---

## 4. P1-1 — `recorder-lite`

Công cụ quay tạm, **độc lập hoàn toàn** với `frontend/`. Mục đích duy nhất: để 5 thành viên nhóm thu được 600 clip trong sáng mai. Không phải Recorder thật (đó là `P3-2` của An, có consent, metadata, kiểm tra thiết bị đầy đủ).

### 10 ký hiệu demo — ĐÃ CHỐT (tra QIPEDC thật, 2026-08-20)

Toàn bộ 10 từ dưới đây **đã được tra tay trên `qipedc.moet.gov.vn/dictionary`** và có
video mẫu thật. Trong `shared/labels.json` chúng mang `dictionary_source: "QIPEDC"`;
40 nhãn còn lại mang `"UNVERIFIED"`.

| id | code | Hiển thị |
|---|---|---|
| 1 | `chao` | Chào |
| 3 | `xin_loi` | Xin lỗi |
| 4 | `tam_biet` | Tạm biệt |
| 22 | `bo` | Bố |
| 23 | `me` | Mẹ (má) |
| 42 | `them` | Thèm |
| 43 | `mu_chu` | Mù chữ |
| 44 | `buc_minh` | Bực mình |
| 45 | `nuoc_viet_nam` | Nước Việt Nam |
| 46 | `nguoi_nuoc_ngoai` | Người nước ngoài |

Cộng lớp `idle` (id 0) → **11 lớp có dữ liệu**. Interface ONNX vẫn giữ `logits [1, 51]`
— 40 lớp còn lại không có dữ liệu train, nhưng giữ nguyên số lớp để thêm từ về sau
không phải đổi contract với P2 và P4.

**Mục tiêu dữ liệu:** 5 người × 10 ký hiệu × 12 lần = **600 clip** (60 clip/lớp) +
~15 clip `idle`/người. Con số 12 lần/người suy ngược từ mục tiêu 60 mẫu mỗi lớp.

#### Vì sao bỏ danh sách 12 từ trước đó

Danh sách cũ (`xin_chao`, `cam_on`, `ban`, `toi`, `khong`, `co`, `giup_do`, `hoc`,
`gia_dinh`, `nha`, `an`, `di`) được chọn bằng **suy đoán** về đặc điểm ngôn ngữ ký hiệu,
không phải từ nguồn thật. Khi tra thử mới phát hiện:

- **`xin_chao` không tồn tại** trong từ điển — chỉ có `chào`.
- **`cam_on` không ra kết quả.**
- `shared/labels.json` gắn `dictionary_source: "QIPEDC"` cho **cả 51 nhãn, kể cả `idle`**,
  và `display_name_vi` viết không dấu ("Xin Chao") → trường này chưa từng được xác minh,
  là giá trị điền sẵn khi file được sinh ra.

Hậu quả nếu cứ quay theo danh sách cũ: không có video mẫu thì 5 người sẽ làm 5 kiểu
khác nhau cho cùng một nhãn. Model học một lớp có nhiều biến thể mâu thuẫn → accuracy
thấp, và **không ai truy được nguyên nhân** vì không test nào bắt được nhãn bẩn.
`AGENTS.md` §1.1 cũng cấm dạy/đánh giá ký hiệu không có nguồn từ điển xác minh.

#### Quy tắc thay nhãn về sau

40 slot `UNVERIFIED` là **kho dự trữ**: tra thêm được từ nào thì ghi đè lên một slot,
giữ nguyên tổng 51. Nhưng **id đã có clip quay thì đóng băng vĩnh viễn** — header `.vslm`
lưu `label_index`, nên đổi nghĩa của một id sau khi đã quay sẽ làm toàn bộ clip đó mang
nhãn sai một cách âm thầm. Chi tiết ghi trong `_luu_y` ở đầu `shared/labels.json`.

Đổi `labels.json` xong phải chạy `py scripts/generate_labels.py` **và**
`py -m ai_pipeline.export.export_onnx`; `test_label_hash_sync.py` canh việc này.

### Ghi nhận: `shared/labels.json` không khớp SRS Phụ lục A

Hai danh sách khác nhau đáng kể. `labels.json` **không có** số đếm (một…năm), `o_dau`, `can`, `ngu`, `dau`, `benh_vien`, `nha_ve_sinh`, `tien`, `buon`, `met`, `doi`, `khat`, `sang`, `chieu`, `toi_(buổi)`; ngược lại nó **có** `hoc`, `tieng`, `ky_hieu`, `viet_nam`, `gap_go`, `ong`, `ba`, `nha`, `truong_hoc`, `thay_co`, `com`, `den`, `lam_viec`, `nghi_ngoi`, `gio`, `yeu`, `dep` — những từ không có trong Phụ lục A.

**Xử lý:** theo `AGENTS.md` §1.1, `shared/labels.json` là nguồn sự thật duy nhất và thắng SRS về thứ tự ưu tiên → dùng `labels.json`, không sửa.

**Hệ quả phải nêu trong báo cáo:** `labels.json` **không có ký hiệu tĩnh nào** (SRS giữ số đếm chính là để chứng minh model xử lý được cả hai loại tĩnh và động). Điểm phân tích này hiện đang mất. Không ảnh hưởng demo tuần này, nhưng phải nói rõ khi bảo vệ thay vì để hội đồng phát hiện.

### Yêu cầu chức năng

| Mã | Yêu cầu |
|---|---|
| `R-01` | Ứng dụng Vite + TypeScript độc lập tại `tools/recorder-lite/`, chạy bằng `npm run dev`, **không cần backend, không cần đăng nhập** |
| `R-02` | Người quay nhập `participant_code` (ví dụ `P01`) một lần khi bắt đầu phiên; lưu vào `localStorage` |
| `R-03` | Chọn tập ký hiệu cần quay từ `shared/labels.json`; mặc định là 10 ký hiệu demo + `idle` |
| `R-04` | Hiển thị webcam trực tiếp, chạy MediaPipe Hand Landmarker + Pose Landmarker mỗi khung hình |
| `R-05` | Hiển thị trạng thái thời gian thực: fps hiện tại, thấy pose hay không, thấy tay trái/phải hay không |
| `R-06` | Nút Ghi → đếm ngược 3-2-1 → ghi landmark trong **3 giây** → tự dừng |
| `R-07` | Sau khi ghi: hiện `frame_count`, `fps_avg`, tỉ lệ khung hình thấy tay; hai nút **Giữ** và **Quay lại** |
| `R-08` | Bấm Giữ → sinh file `.vslm` theo §3 và tải về máy (Blob download) |
| `R-09` | Bộ đếm phiên: hiển thị đã quay bao nhiêu lần cho mỗi ký hiệu, để người quay biết còn thiếu gì |
| `R-10` | Cảnh báo (không chặn) nếu `fps_avg < 15` hoặc **đoạn liên tục dài nhất có tay < 1 giây**. Không dùng ngưỡng "> 20% khung mất cả hai tay" — mất tay ở đầu/cuối clip là pha chuẩn bị / hạ tay, hoàn toàn bình thường; xem ghi chú sửa đổi ở `SRS.md` FR-C04 và `frontend/AGENTS.md` §3 |

### Ngoài phạm vi P1-1

Phiếu đồng ý · khai metadata nhân khẩu · kiểm tra ánh sáng/khoảng cách · upload R2 · hàng đợi nền · layout Android · tài khoản. Tất cả thuộc `P3-2`.

### Acceptance Criteria — P1-1

- [x] `AC-5` `npm install && npm run dev` chạy được, mở trình duyệt thấy webcam. — `npm install` ✅, `npx tsc --noEmit` sạch ✅, `npm run build` ✅, dev server phục vụ module đúng ✅, **P1 đã mở bằng webcam thật** ✅
- [x] `AC-6` Quay một clip 3 giây trên máy ~30fps cho `frame_count` trong khoảng 80–95. — **P1 xác nhận bằng webcam thật**
- [x] `AC-7` File `.vslm` đọc được bằng `ai_pipeline/data/landmark_io.py`. — **đã kiểm chứng end-to-end** (xem `AC-1`)
- [x] `AC-8` Mất tay → `mask = 0`, toạ độ tay `0.0`, không `NaN`. — **đã kiểm chứng** trên dữ liệu mô phỏng khung 10–14
- [x] `AC-9` Quay liên tiếp 3 clip không phải tải lại trang. — **P1 xác nhận bằng webcam thật**

### Kiểm tra `handedness` — ĐÃ XONG, rủi ro đóng lại

Rủi ro đã nêu: MediaPipe phân loại tay dựa trên giả định ảnh đã lật gương, nhưng camera trả khung hình gốc — nên có khả năng giơ tay phải mà bị gắn nhãn `"Left"`. Nếu phát hiện sau khi 5 người quay xong 600 clip thì phải quay lại toàn bộ. — **ĐÃ XÁC MINH 2026-08-20**: quay thử bằng tay phải, dữ liệu vào đúng ô tay phải (62-67/70 khung), ô tay trái trống. Nhãn handedness ĐÚNG, không cần lật.

**P1 đã kiểm tra bằng webcam thật: pose, tay trái và tay phải đều nhận diện đúng.**

→ **Cổng `recorderLite` MỞ.** Cả nhóm quay được.

---

## 5. P1-2 — ONNX giả (đúng interface cuối)

File `.onnx` với **trọng số ngẫu nhiên** nhưng **interface đúng §2.1**, giao cho P2 Khải và P4 Hùng để build tính năng mà không chờ model thật.

### Acceptance Criteria — P1-2

- [x] `AC-10` File `.onnx` nhận đúng 3 input theo §2.1 và trả `logits [1, 51]`. — **đã kiểm chứng** bằng `test_onnx_io_contract` (tên/dtype/shape kiểm qua cả `onnx.load` lẫn `onnxruntime.InferenceSession`)
- [~] `AC-11` Nạp được bằng `onnxruntime` phía Python **và** bằng `onnxruntime-web` trong trình duyệt. — `onnxruntime` Python ✅ (parity `max|diff| = 3.9e-07` trên 5 mẫu). `onnxruntime-web` 1.27.0 **backend wasm** ✅ (parity `max|diff| = 9.5e-07` trên 4 mẫu) nhưng chạy **trên Node**, chưa mở trong trình duyệt thật — cùng runtime wasm, khác host. Chốt hẳn khi P2 nạp được trong Worker.
- [x] `AC-12` Metadata nhúng `label_hash` khớp với `shared/labels.json` (dùng `ai_pipeline/utils/label_hash.py`). — **đã kiểm chứng**; đồng thời phát hiện và sửa lỗi hai công thức hash lệch nhau khiến `labelVerifier.ts` từ chối nạp model 100% (xem `models/DUMMY.md` §9)
- [x] `AC-13` Có file `models/DUMMY.md` ghi rõ đây là model giả, không dùng để đánh giá.

> **Lỗi đáng nhớ, phát hiện khi làm P1-2 — P1-9 phải tránh lặp lại:** ONNX không có op
> `Atan2`, exporter phân rã nó thành phép chia `y/x`. Khung thiếu vai có vector vai
> `(0,0)`: PyTorch định nghĩa `atan2(0,0) = 0` còn graph ONNX tính `0/0 = NaN`, NaN lan
> ra toàn bộ `logits`. Chỉ lộ khi buffer chưa đầy 60 khung — tức đúng tình huống thật
> của chế độ Dịch, và **không** lộ nếu chỉ test bằng dữ liệu đủ 60 khung hợp lệ.

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
