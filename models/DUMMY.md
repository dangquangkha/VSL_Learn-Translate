# `vsl_classifier_dummy_v2.onnx` — model GIẢ, chỉ để chốt interface

> **CẢNH BÁO — ĐỌC TRƯỚC KHI DÙNG**
>
> File `.onnx` trong thư mục này chứa **trọng số khởi tạo ngẫu nhiên**, KHÔNG
> được huấn luyện trên bất kỳ dữ liệu nào. `logits` mà nó trả về **hoàn toàn
> vô nghĩa**.
>
> - **KHÔNG** dùng để đánh giá độ chính xác nhận diện ký hiệu.
> - **KHÔNG** đưa số liệu suy luận từ model này vào báo cáo/slide.
> - **KHÔNG** so sánh accuracy giữa model này với bất kỳ model nào khác.
>
> Mục đích DUY NHẤT: cho P2 (app dịch) và P4 (chế độ học) build và test tích
> hợp ONNX Runtime Web trong lúc chờ model thật huấn luyện xong (MỐC 3).

## 1. Interface (đã CHỐT — `specs/010-p1-foundation/spec.md` §2.1)

### Input — 3 tensor, JavaScript chỉ đưa landmark THÔ

| Tên | Kiểu | Shape | Nội dung |
|---|---|---|---|
| `landmarks` | float32 | `[1, 60, 75, 4]` | 75 điểm × 60 khung hình gần nhất, mỗi điểm `(x, y, z, visibility)` |
| `mask` | float32 | `[1, 60, 3]` | Có/không phát hiện: pose, tay trái, tay phải |
| `timestamps` | float32 | `[1, 60]` | Thời điểm tương đối của từng khung hình (giây); **ô đệm = `-1.0`** |

### Output

| Tên | Kiểu | Shape | Nội dung |
|---|---|---|---|
| `logits` | float32 | `[1, 51]` | Điểm số chưa qua softmax cho 51 lớp (`shared/labels.json`) |

**Toàn bộ tiền xử lý nằm TRONG graph ONNX** (nguyên tắc Zero Training/Serving
Skew, `AGENTS.md` §4.2 — không được nới lỏng). JavaScript tuyệt đối không tự
dựng đặc trưng 333 kênh — chỉ đưa 3 tensor thô ở trên vào `InferenceSession`.

## 2. Layout 75 điểm landmark thô (cố định, không đổi)

| Chỉ số | Nhóm | Số điểm | Nguồn |
|---|---|---|---|
| `0 … 32` | pose | 33 | MediaPipe Pose Landmarker |
| `33 … 53` | tay trái | 21 | MediaPipe Hand Landmarker (`handedness = Left`) |
| `54 … 74` | tay phải | 21 | MediaPipe Hand Landmarker (`handedness = Right`) |

Mỗi điểm 4 giá trị `float32`: `x`, `y`, `z`, `visibility`.

Quy ước ô đệm: khung hình chưa đủ dữ liệu (buffer chưa đầy 60 khung) được
đệm bằng `timestamps = -1.0`; `landmarks`/`mask` ở khung đệm có thể là bất kỳ
giá trị nào (kể cả rác) vì graph loại bỏ chúng dựa trên `timestamps < 0`.
**Giả định bắt buộc:** các khung hợp lệ nằm liên tiếp ở ĐẦU chuỗi 60 khung,
ô đệm dồn về CUỐI.

## 3. Chuỗi tiền xử lý trong graph (`VSLPreprocessorV2`)

Định nghĩa tại `ai_pipeline/models/vsl_classifier_v2.py`. Thứ tự cố định:

1. **B1 — Làm sạch**: `nan_to_num` trên cả 3 input (`landmarks`/`mask` → 0,
   `timestamps` → -1.0).
2. **B2 — Loại ô đệm**: khung có `timestamps < 0` bị nhân về 0 trên cả
   `landmarks` và `mask`.
3. **B3 — Chọn 55 điểm**: từ 75 điểm thô, chọn 13 điểm pose thân trên (mũi,
   vai, khuỷu, cổ tay, út, trỏ, cái — trái/phải) + 21 điểm tay trái + 21 điểm
   tay phải = 55 điểm; chỉ giữ `x, y, z` (bỏ `visibility`).
4. **B4 — Chuẩn hoá theo vai**: dịch gốc toạ độ về trung điểm hai vai, chia
   cho khoảng cách hai vai. Khung không thấy vai (khoảng cách ≈ 0) được đưa
   về 0 thay vì chia cho số gần 0 (tránh nổ giá trị 1/epsilon).
5. **B5 — Xoay 2D**: xoay quanh trục Z sao cho hai vai nằm ngang, góc tính từ
   toạ độ vai THÔ (trước chuẩn hoá).
6. **B6 — Nội suy tuyến tính về 32 khung**: chỉ dùng phần khung hợp lệ (dựa
   trên số khung có `timestamps >= 0`), nội suy đều theo vị trí tương đối.
7. **B7 — Vận tốc**: sai phân giữa các khung liên tiếp sau nội suy (khung
   đầu tiên có vận tốc = 0).
8. **B8 — Ghép đặc trưng**: `[toạ độ (165) | vận tốc (165) | mask (3)]` →
   `[1, 32, 333]`, đưa vào backbone 2 lớp Linear (`hidden_dim=64`) → `logits
   [1, 51]`.

## 4. Cách tạo lại file

```powershell
$env:PYTHONIOENCODING = "utf-8"
py -m ai_pipeline.export.export_onnx
```

(Trên bash: `PYTHONIOENCODING=utf-8 py -m ai_pipeline.export.export_onnx`)

Ghi ra `models/vsl_classifier_dummy_v2.onnx`, ghi đè file cũ nếu có.

## 5. Trọng số & khả năng tái lập

- Seed mặc định: `20260819`.
- Trọng số khởi tạo bằng `torch.Generator().manual_seed(seed)` riêng (không
  đụng trạng thái ngẫu nhiên toàn cục), phân phối `Uniform(-0.05, 0.05)`.
- **Tái lập được tuyệt đối**: export 2 lần với cùng seed cho ra file
  `.onnx` giống hệt nhau (SHA256 khớp) — đã kiểm chứng, xem báo cáo P1-2.
- File **không** nhúng timestamp tạo file trong metadata, để không phá tính
  tái lập.

## 6. Metadata nhúng trong file (`onnx.load(...).metadata_props`)

| Key | Ý nghĩa |
|---|---|
| `label_hash` | SHA256 **canonical** của `shared/labels.json` (`ai_pipeline.utils.label_hash.get_labels_sha256()`) — bằng đúng `LABEL_HASH_SHA256` trong `frontend/src/generated/labels.ts` |
| `opset_version` | `"17"` |
| `model_kind` | `"dummy"` — cờ báo đây là model giả |
| `interface_version` | `"3tensor-v1"` |
| `input_frames` | `"60"` |
| `num_points` | `"75"` |
| `values_per_point` | `"4"` |
| `num_classes` | `"51"` |
| `weight_seed` | seed dùng khởi tạo trọng số (mặc định `"20260819"`) |
| `preprocessing` | mô tả ngắn chuỗi tiền xử lý trong graph |

## 7. Giới hạn — KHÔNG đại diện cho model thật

Kích thước file và độ trễ suy luận của model giả này **không phản ánh** kích
thước/độ trễ của model thật (backbone thật sẽ dùng kiến trúc khác, có thể
lớn hơn hoặc nhỏ hơn nhiều). Không dùng số liệu benchmark của file này để ước
lượng hiệu năng production.

## 8. Khi thay bằng model thật (MỐC 3)

- **Interface giữ nguyên** — 3 tensor `landmarks`/`mask`/`timestamps` vào,
  `logits [1, 51]` ra. P2/P4 không cần đổi code gọi `InferenceSession`, chỉ
  đổi đường dẫn file `.onnx`.
- Trước khi dùng model mới, P2/P4 **phải kiểm tra** `metadata_props["label_hash"]`
  của file mới khớp với `get_labels_sha256()` tính từ `shared/labels.json`
  hiện hành — tránh trường hợp thứ tự lớp trong model không khớp thứ tự lớp
  trong `labels.json` (lệch → dự đoán sai nhãn một cách âm thầm).
- Kiểm tra thêm `model_kind` đã đổi từ `"dummy"` sang giá trị khác (vd.
  `"trained"`) để chắc chắn không còn dùng nhầm model giả trong production.

## 9. Khi `shared/labels.json` thay đổi — BẮT BUỘC làm đủ 2 bước

`label_hash` nhúng trong file `.onnx` là ảnh chụp của `labels.json` **tại thời
điểm export**. Sửa `labels.json` mà không export lại thì client
(`labelVerifier.ts`) sẽ từ chối nạp model với `LabelMismatchError`.

```bash
PYTHONIOENCODING=utf-8 py scripts/generate_labels.py         # sinh lai labels.py + labels.ts
PYTHONIOENCODING=utf-8 py -m ai_pipeline.export.export_onnx  # export lai .onnx
```

Commit cả bốn thứ cùng một lần: `shared/labels.json`,
`ai_pipeline/generated/labels.py`, `frontend/src/generated/labels.ts`,
`models/vsl_classifier_dummy_v2.onnx`.

`ai_pipeline/tests/test_label_hash_sync.py` canh đúng chuyện này — quên bước
nào thì `pytest` đỏ ngay, không phải chờ tới lúc mở app mới phát hiện.

> **Đổi SỐ LƯỢNG lớp là chuyện khác — đó là đổi contract.** `logits [1, 51]`
> đã chốt với P2 và P4. Cắt `labels.json` xuống 13 lớp nghĩa là output thành
> `[1, 13]`, hai người kia phải sửa code. `export_onnx.py` sẽ báo lỗi và từ
> chối xuất file nếu số lớp trong `labels.json` khác `NUM_CLASSES` — cố ý,
> để lệch này không đi lọt xuống dưới.

### Ghi chú lịch sử: công thức hash đã từng lệch

Trước P1-2, `label_hash.py` băm **raw bytes** của `labels.json` còn
`scripts/generate_labels.py` băm **JSON đã chuẩn hoá** — hai giá trị khác nhau,
nên model export ra sẽ **luôn** bị `labelVerifier.ts` từ chối. Đã thống nhất về
một công thức canonical duy nhất. Ngoài ra hash raw bytes còn đổi theo kiểu
xuống dòng: cùng một `labels.json` cho `04b53d02…` (bản CRLF trên đĩa Windows)
và `db6ec04b…` (bản LF trong Git blob) — một lỗi rất khó truy.
