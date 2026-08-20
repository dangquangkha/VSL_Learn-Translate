# AGENTS.md — frontend/

Bổ sung cho `AGENTS.md` ở gốc repo (cơ chế phân cấp §2). Áp dụng cho mọi việc
client-side: chế độ Dịch (P2), Recorder thật (P3), chế độ Học (P4), Admin (P5).

Những ràng buộc dưới đây **rút ra từ dữ liệu quay thật**, không phải suy đoán.
Vi phạm chúng không làm test đỏ — hỏng âm thầm, chỉ lộ ra ở độ chính xác thấp
mà không truy được nguyên nhân.

---

## 1. Dùng `@shared/landmarks`, đừng viết lại

Module trích landmark dùng chung nằm ở `shared/landmarks/` (P1-4). Nó cung cấp
`startWebcam`, `createLandmarkers`, `createLandmarkStream`, `assembleFrame`,
`detectPresence`, và writer `.vslm`. Đọc `shared/landmarks/README.md` trước khi
viết bất cứ thứ gì đụng tới webcam hay landmark.

Hai bản trích landmark song song = hai cách gom điểm khác nhau = dữ liệu train
và dữ liệu chạy thật không còn cùng một phân phối. Đó đúng là thứ module này
sinh ra để tránh.

`createLandmarkers()` **nhận module `@mediapipe/tasks-vision` qua tham số** —
đừng "sửa" thành import trực tiếp trong `shared/landmarks/`: `vite dev` vẫn chạy
nhưng `vite build` sẽ hỏng. Lý do đầy đủ ở đầu `shared/landmarks/mediapipe.ts`.

---

## 2. Ba quy ước của tensor đưa vào model — sai là hỏng ngầm

Model nhận `landmarks [1,60,75,4]`, `mask [1,60,3]`, `timestamps [1,60]`.
Xem `models/DUMMY.md` cho interface đầy đủ.

| Quy ước | Bắt buộc |
|---|---|
| Ô đệm | `timestamps = -1.0` (khi buffer chưa đầy 60 khung) |
| Thứ tự | Khung hợp lệ **dồn về ĐẦU** mảng, ô đệm dồn về cuối |
| Đơn vị | `timestamps` tính bằng **giây**, tương đối so với khung đầu của cửa sổ |

Quy ước thứ ba không phải chuyện hình thức. Graph dùng `timestamps` để chuẩn hoá
kênh vận tốc theo thời gian thật — nếu đưa vào mili giây, hoặc đưa timestamp
tuyệt đối (`performance.now()` thô), vận tốc sẽ sai hàng nghìn lần và model trả
về rác. Không có gì báo lỗi cả.

**Đừng tự dựng đặc trưng.** Chọn 55 điểm, chuẩn hoá theo vai, xoay 2D, nội suy,
tính vận tốc, ghép mask — tất cả nằm **trong** ONNX graph. JavaScript chỉ đưa
landmark thô. Đây là nguyên tắc Zero Training/Serving Skew ở `AGENTS.md` §1.1,
thuộc nhóm không được nới lỏng kể cả trong sprint demo.

---

## 3. Đánh giá clip: KHÔNG dùng ngưỡng 20% của SRS FR-C04

`SRS.md` FR-C04 ghi *"> 20% khung hình mất cả hai tay → từ chối, yêu cầu quay
lại"*. **Tiêu chí này sai và đã được thay** — đừng implement lại nó.

Nó đếm tổng số khung mất tay mà không quan tâm chúng nằm ở đâu, nên gộp chung
hai thứ khác hẳn nhau:

| Kiểu | Bản chất |
|---|---|
| Mất tay ở **giữa** động tác | Lỗi thật — tay bị che, ra ngoài khung, model mất dấu giữa pha nhấn |
| Mất tay ở **đầu / cuối** clip | Bình thường — cử chỉ có ba pha: chuẩn bị → nhấn → thu về |

Đo trên clip quay thật (P01, 3 clip): tỉ lệ mất tay 4,3% / 16,2% / 9,7%, trong
đó hai clip sau **mất 100% ở phần đuôi** — tức pha hạ tay sau khi làm xong. Cả
ba đều ghi trọn vẹn động tác, nhưng theo ngưỡng 20% thì clip 16,2% bị coi là
"gần hỏng". Với clip 3 giây mà ký hiệu chỉ kéo dài 1,5–2 giây, đầu cộng đuôi
vượt 20% là chuyện bình thường.

Nguy hiểm hơn con số: nếu cảnh báo khiến người quay **giữ tay lơ lửng cho đủ 3
giây**, ta tạo ra động tác không tồn tại ngoài đời. Model học "làm xong tay vẫn
treo đó", rồi lúc dùng thật người dùng hạ tay như bình thường — lệch phân phối
ngay tại tầng dữ liệu.

**Tiêu chí đúng:** đo **đoạn liên tục dài nhất có ít nhất một tay**, yêu cầu
**≥ 1 giây** (đủ chứa pha nhấn). Cài đặt mẫu ở
`tools/recorder-lite/src/summary.ts` — dùng lại nguyên logic đó.

Thông báo cho người quay phải nói rõ **mất tay ở đầu/cuối là bình thường, không
cần quay lại**, nếu không họ sẽ tự sửa động tác cho vừa lòng cảnh báo.

---

## 4. Ring buffer 2 giây — đừng đổi độ dài cửa sổ

Cửa sổ 60 khung ≈ 2 giây là một phần của contract, không phải tham số tuỳ chỉnh.

Kênh toạ độ được nội suy trải đều 32 khung trên **toàn bộ** cửa sổ, nên độ dài
cửa sổ đổi thì "hình dạng theo thời gian" của đặc trưng cũng đổi — đã đo được
sai lệch 0.64 giữa cửa sổ 2 giây và 3 giây cho **cùng một động tác**
(`ai_pipeline/tests/test_dummy_onnx_v2.py::test_van_toc_doc_lap_voi_do_dai_cua_so`).

Kênh vận tốc thì đã miễn nhiễm (chuẩn hoá theo thời gian thật), nhưng kênh toạ
độ thì không, và không sửa được trong graph. Model được train trên cửa sổ 2
giây; đưa vào cửa sổ dài ngắn khác là tự tạo skew.

---

## 5. Trước khi nạp model: kiểm tra hai thứ

```ts
import { verifyModelLabelHash } from "./services/labelVerifier";
```

- **`label_hash`** trong metadata `.onnx` phải khớp `LABEL_HASH_SHA256` ở
  `src/generated/labels.ts`. Lệch nghĩa là thứ tự lớp của model không còn khớp
  thứ tự lớp của client → dự đoán ra nhãn sai một cách âm thầm.
- **`model_kind`**: `"dummy"` là model giả trọng số ngẫu nhiên (`models/DUMMY.md`),
  logits vô nghĩa. Kiểm tra cờ này để không lỡ dùng model giả lúc demo thật.

`labels.json` là nguồn sự thật duy nhất cho nhãn. Không hardcode danh sách nhãn,
không hardcode số lớp — đọc từ `src/generated/labels.ts` (sinh tự động, đừng sửa
tay).
