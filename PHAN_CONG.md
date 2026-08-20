# Phân công công việc — Demo VSL Learn & Translate

| | |
|---|---|
| **Nhóm** | P1 Tài · P2 Khải · P3 An · P4 Hùng · P5 Đức |
| **Mục tiêu** | Demo chạy được đầu-cuối: webcam → landmark → model → từ hiển thị trên màn hình |
| **Phạm vi** | Bản rút gọn của SRS đầy đủ — xem §2 |
| **Tài liệu gốc** | `SRS.md`, `DESIGN.md` |
| **Bảng tiến độ** | `TIENDO.html` — mở bằng trình duyệt. **Bắt buộc cập nhật sau mỗi đầu việc** (xem `AGENTS.md` §4.1) |

---

## 1. Hiện trạng repo (điểm xuất phát)

| Phần | Trạng thái | Ghi chú |
|---|---|---|
| `shared/labels.json` | ✅ Xong | 51 nhãn (50 ký hiệu + `idle`). **Chỉ 10 nhãn demo đã tra QIPEDC thật** (`dictionary_source: QIPEDC`); 40 nhãn còn lại là `UNVERIFIED` — kho dự trữ, được phép thay. Xem `_luu_y` đầu file |
| Backend `auth` | ✅ Xong | JWT, entity, Flyway migration |
| Backend `collection` | 🟡 Một phần | Mới có cấp presigned URL lên R2 |
| `ai_pipeline` — tiền xử lý | ✅ Xong | 7 bước chuẩn hoá landmark, đúng nguyên tắc chống train/serve skew |
| `ai_pipeline` — export ONNX | ✅ Xong | `export_onnx.py` + `quantize_onnx.py`, opset 17 |
| `ai_pipeline` — model | ❌ Chưa có | `vsl_classifier_wrapper.py` chỉ là linear layer ngẫu nhiên, chưa có `train.py` |
| **Frontend** | ❌ Chưa có | Không có `package.json`, chỉ có 2 file lẻ |
| **Dữ liệu** | ❌ Chưa có | Chưa thu thập clip nào |
| Backend còn lại | ❌ Chưa có | `vocabulary`, `learning`, `quality`, `modelregistry`, `stats` |

---

## 2. Phạm vi demo (cắt gọn so với SRS đầy đủ)

**Giữ lại:**

- 10 ký hiệu đã tra QIPEDC thật (xem `specs/010-p1-foundation/spec.md` §4) + lớp `idle`
- Chế độ Dịch chạy thật (buffer, sliding window, decoder)
- Recorder đủ dùng để cả nhóm quay
- Chế độ Học ở mức cơ bản (danh sách từ, luyện tập, chấm điểm)
- Admin ở mức xem thống kê

**Bỏ khỏi phạm vi demo:**

- 38 ký hiệu còn lại
- Tình nguyện viên ngoài nhóm, người thạo VSL
- Cụm giao tiếp (FR-B08)
- Huấn luyện 3 kiến trúc để so sánh — chọn thẳng 1
- Augmentation đầy đủ 7 phép — giữ tối đa 1 phép nếu còn thời gian
- Chia tập nghiêm ngặt, k-fold — chỉ để riêng 1 người làm test

---

## 3. Đường găng (critical path)

```
recorder-lite (P1)
   └→ CẢ NHÓM QUAY ĐỢT 1
        └→ dataset builder (P1)
             └→ train.py (P1)
                  └→ model thật (P1)
                       └→ golden test (P1)
                            └→ P2 thay file → DEMO CHẠY
```

Toàn bộ chuỗi này nằm ở **P1 + hai buổi quay của cả nhóm**.

- P1 chậm → không có gì để demo.
- P3, P4, P5 chậm → demo vẫn chạy, chỉ thiếu tính năng.

---

## 4. Bảng tổng — 5 người theo giai đoạn

| Giai đoạn | P1 Tài (AI) | P2 Khải (Shell + Dịch) | P3 An (Recorder) | P4 Hùng (Học) | P5 Đức (Admin) |
|---|---|---|---|---|---|
| ① Khởi động | `recorder-lite` + ONNX giả | **FE shell** | BE `collection` | BE `vocabulary` | BE `modelregistry` + `stats` |
| ⬛ MỐC 1 | — | — | **CẢ NHÓM QUAY ĐỢT 1** | — | — |
| ② Dựng lõi | dataset builder + `train.py` | Worker + ring buffer + window | Recorder thật trên shell | FE từ vựng + luyện tập (mock) | FE admin dashboard |
| ③ Có số đầu tiên | train lần 1 + đánh giá | decoder + UI Dịch | kiểm tra chất lượng + upload R2 | BE `learning` + Leitner | BE `quality` + quản lý model |
| ⬛ MỐC 2 | — | — | **QUAY ĐỢT 2 (bù ký hiệu yếu)** | — | — |
| ④ Model thật | train lần 2 + export + **golden test** | chỉnh ngưỡng decoder | layout Android / polish | hoàn thiện UI Học | trang minh bạch dataset |
| ⬛ MỐC 3 | **GIAO MODEL THẬT** | ← nhận | — | ← nhận | — |
| ⑤ Tích hợp | đánh giá theo người | thay model thật + offline cache | polish | mock → model thật | số liệu thật lên trang minh bạch |
| ⑥ Đệm | **CẢ NHÓM**: sửa lỗi, chạy thử toàn luồng, quay video demo dự phòng | | | | |

**Hai điểm quan trọng nhất đọc từ bảng:**

1. **P2 làm FE shell trước tiên, không xen việc khác.** P3, P4, P5 đều không làm được FE nếu thiếu nó — đó là lý do cả ba bắt đầu bằng phần backend của mình ở giai đoạn ①.
2. **ONNX giả ở giai đoạn ① là mấu chốt gỡ chặn.** Nhờ nó, P2 và P4 build trọn vẹn tính năng qua giai đoạn ②③④ mà không phải chờ P1 train xong. Đến MỐC 3 chỉ là thay file.

---

## 4.1 Cổng chuyển giai đoạn — ai chờ ai

**Trong giai đoạn ① không ai chặn ai** — cả 5 người làm việc độc lập hoàn toàn. Nhưng có **4 sản phẩm của giai đoạn ① là cổng chặn**: chưa xong và chưa push thì người khác không sang được giai đoạn ②.

| Cổng | Ai làm | Ai bị chặn nếu chưa xong | Người bị chặn làm gì trong lúc chờ |
|---|---|---|---|
| **FE shell** | P2 | P3, P4, P5 — toàn bộ phần frontend | Làm tiếp phần backend của mình |
| **ONNX giả** (đúng shape) | P1 | P2 (Worker), P4 (chấm điểm) | P2 dựng khung Worker rỗng, P4 làm FE danh sách từ |
| **Module `useLandmarks`** | P1 | P2 (ring buffer), P3 (Recorder) | P3 làm tiếp BE `collection` |
| **`recorder-lite`** | P1 | **Cả nhóm** — không quay được, MỐC 1 không diễn ra | — |

> Nói cách khác: **P1 và P2 là hai người quyết định cả nhóm có sang giai đoạn ② được hay không.** Bốn cổng trên đều nằm ở hai người này, và cả bốn phải xong + push trong giai đoạn ①.

**Từ giai đoạn ② trở đi, không còn cổng chặn nào** — cả 5 người chạy liên tục qua ② và ③ mà không phải chờ nhau. Chỉ còn hai điểm đồng bộ toàn nhóm là MỐC 2 (quay đợt 2) và MỐC 3 (giao model thật).

**Điểm chờ cuối cùng — MỐC 3:** P2 và P4 phải chờ golden test PASS mới thay được model thật. Nếu golden test trượt, hai người này **không ngồi không**: vẫn tiếp tục chạy trên ONNX giả để hoàn thiện UI, chỉnh ngưỡng decoder, làm service worker cache. Chỉ có con số độ chính xác là chưa thật.

---

## 5. Hàng đợi công việc từng người

### P1 (Tài) — AI pipeline + hai contract

- [ ] `recorder-lite`: trang Vite độc lập, webcam → MediaPipe → lưu landmark ra file (không cần shell, không cần auth)
- [ ] Export ONNX giả: trọng số ngẫu nhiên nhưng **đúng shape tensor cuối** — dùng `export_onnx.py` có sẵn → **giao P2, P4**
- [ ] Chốt định dạng file landmark (header JSON + float32) → **giao P3**
- [ ] Tách `useLandmarks` từ recorder-lite thành module tái dùng → **giao P2, P3, P4**
- [ ] Dataset builder: đọc clip landmark → tensor dataset, chia tập theo người. ⚠️ **Bắt buộc sinh mẫu bằng cách TRƯỢT CỬA SỔ 2 GIÂY trên clip 3 giây**, đúng như ring buffer lúc chạy thật — ném cả clip 3 giây vào model là tạo train/serve skew ở kênh toạ độ (đã đo: lệch 0.64 cho cùng một động tác). Xem `ai_pipeline/tests/test_dummy_onnx_v2.py::test_van_toc_doc_lap_voi_do_dai_cua_so`
- [ ] Viết `train.py` + training loop
- [ ] Train lần 1, đánh giá, xác định ký hiệu yếu → **báo P3 để quay bù**
- [ ] Train lần 2 với dữ liệu đầy đủ
- [ ] Export ONNX thật + lượng tử hoá int8
- [ ] **Golden test**: sai lệch logits PyTorch ↔ ONNX Runtime Web < 1e-3 → **giao model thật cho P2, P4**
- [ ] Đánh giá accuracy theo từng người → **giao P5** cho trang minh bạch

### P2 (Khải) — FE shell + chế độ Dịch

- [ ] **FE shell**: Vite + React + TS, routing, API client, JWT context, layout, component dùng chung → **giao P3, P4, P5** (ưu tiên cao nhất)
- [ ] Web Worker + nạp ONNX (chạy với ONNX giả của P1)
- [ ] Ring buffer 2 giây + sliding window mỗi 6 khung hình
- [ ] Decoder: ngưỡng xác suất 0.7, cùng nhãn lặp ở 3 cửa sổ liên tiếp, khoá 1 giây sau khi phát từ, chờ thấy `idle`
- [ ] UI chế độ Dịch: webcam, trạng thái realtime (fps, confidence, thấy tay hay không), chuỗi từ, nút xoá/copy
- [ ] Thay model thật, đo độ trễ, chỉnh lại ngưỡng decoder
- [ ] Service worker cache model + runtime để chạy offline

### P3 (An) — Recorder + thu thập dữ liệu

- [ ] BE `collection` hoàn thiện: participants, consents, recording_sessions, clips metadata, điều phối phân bổ ký hiệu
- [ ] Recorder thật trên shell: consent → khai metadata ẩn danh → phiên có dẫn dắt → đếm ngược → ghi 3 giây
- [ ] Kiểm tra thiết bị (FR-C03): đủ sáng, thấy thân trên, khoảng cách hợp lý, fps ≥ 15, khung hình đứng yên
- [ ] Tự loại clip hỏng: **đoạn liên tục dài nhất có tay < 1 giây**, < 20 khung hợp lệ, không thấy pose > 30% khung — ⚠️ **KHÔNG dùng ngưỡng "mất tay > 20% khung" của SRS FR-C04**, xem `frontend/AGENTS.md` §3 để biết vì sao
- [ ] Upload lên R2 qua presigned URL + hàng đợi nền + tự hạ chất lượng
- [ ] **Điều phối đợt quay 2** — ưu tiên ký hiệu P1 báo yếu
- [ ] Layout Android (FR-C07) — chỉ làm nếu còn thời gian

### P4 (Hùng) — Chế độ Học

- [ ] BE `vocabulary`: CRUD ký hiệu, seed 10 ký hiệu demo từ `shared/labels.json` (nhãn có `dictionary_source: QIPEDC`)
- [ ] BE `learning`: bảng `practice_attempts`, `user_sign_progress`, logic Leitner
- [ ] FE danh sách từ vựng + màn chi tiết ký hiệu
- [ ] FE luyện tập: webcam + chấm điểm — **dùng ONNX giả của P1**
- [ ] UI tiến độ + ôn tập giãn cách Leitner
- [ ] Thay ONNX giả bằng model thật

### P5 (Đức) — Admin + registry/quality/stats

- [ ] BE `modelregistry`: upload `.onnx`, metrics, labels hash, cờ active → **cung cấp `/api/model/active` cho P2**
- [ ] BE `stats`: thống kê dataset theo nhãn, theo người, theo metadata
- [ ] BE `quality`: worker `@Async` hậu kiểm clip, gán trạng thái `ACCEPTED`/`REJECTED`/`NEEDS_REVIEW` → **chỉ clip ACCEPTED mới được P1 đưa vào train**
- [ ] FE admin dashboard
- [ ] FE quản lý từ vựng + quản lý phiên bản model
- [ ] FE trang minh bạch dataset (dùng số liệu thật từ P1)

---

## 5.1 Đường dẫn code và những gì ĐÃ CÓ SẴN

Đọc mục này trước khi bắt đầu — nhiều phần đã được viết rồi, đừng làm lại.

### Đã có sẵn, dùng lại ngay

| File / thư mục | Nội dung | Ai cần biết |
|---|---|---|
| `shared/labels.json` | 51 nhãn, nguồn sự thật duy nhất | Tất cả |
| `scripts/generate_labels.py` | Sinh `labels.py` + `labels.ts` từ JSON | P1, P4 |
| `ai_pipeline/preprocessing/` | **7 bước tiền xử lý đã viết xong**: `landmark_cleaner`, `shoulder_normalizer`, `rotation_aligner`, `frame_interpolator`, `velocity_calculator`, gộp ở `preprocessor_module.py` | P1 |
| `ai_pipeline/models/vsl_classifier_wrapper.py` | Linear layer ngẫu nhiên — **chính là thứ dùng để export ONNX giả** | P1 |
| `ai_pipeline/export/export_onnx.py` + `quantize_onnx.py` | Export opset 17 + lượng tử hoá int8, đã chạy được | P1 |
| `ai_pipeline/tests/test_golden_contract_t02.py` | **Golden test đã có khung sẵn** — không phải viết từ đầu | P1 |
| `ai_pipeline/utils/label_hash.py` | Tính hash danh sách nhãn | P1, P5 |
| `backend/src/main/java/com/vsl/auth/` | Module hoàn chỉnh: controller / dto / entity / repository / security / service — **dùng làm khuôn mẫu cho mọi module BE mới** | P3, P4, P5 |
| `backend/src/main/java/com/vsl/collection/` | Mới có phần cấp presigned URL lên R2 (`config`, `controller`, `dto`, `service`) | P3 |
| `frontend/src/generated/labels.ts` | Danh sách nhãn phía TS | P2, P4 |
| `frontend/src/services/labelVerifier.ts` | So khớp hash nhãn giữa model và client | P2 |

### Nơi đặt code mới

| Việc | Đường dẫn |
|---|---|
| BE `vocabulary` (P4) | `backend/src/main/java/com/vsl/vocabulary/` |
| BE `learning` (P4) | `backend/src/main/java/com/vsl/learning/` |
| BE `collection` bổ sung (P3) | `backend/src/main/java/com/vsl/collection/` |
| BE `modelregistry` (P5) | `backend/src/main/java/com/vsl/modelregistry/` |
| BE `quality` (P5) | `backend/src/main/java/com/vsl/quality/` |
| BE `stats` (P5) | `backend/src/main/java/com/vsl/stats/` |
| Migration DB | `backend/src/main/resources/db/migration/` — đánh số tiếp `V3__`, `V4__`… (đã có `V1`, `V2`) |
| FE shell (P2) | `frontend/` — dựng Vite + React + TS quanh `src/` đang có |
| `train.py`, dataset builder (P1) | `ai_pipeline/training/` (thư mục mới) |
| `recorder-lite` (P1) | `tools/recorder-lite/` (thư mục mới, độc lập, không đụng `frontend/`) |

### Đánh số spec-kit

`specs/` hiện có `002-featurename-labels-pipeline`, `003-onnx-export`, `004-auth-service`, `005-r2-upload`.

Feature mới bắt đầu từ **`006-`** trở đi. Thống nhất trước khi tạo để không hai người cùng lấy một số:

| Số | Feature | Người |
|---|---|---|
| `006-` | FE shell | P2 |
| `007-` | Recorder + collection | P3 |
| `008-` | Vocabulary + learning | P4 |
| `009-` | Translate mode | P2 |
| `010-` | Training pipeline | P1 |
| `011-` | Admin + registry/quality/stats | P5 |

> Xem `AGENTS.md` §4.2 về việc quy trình spec-kit có được rút gọn trong sprint demo hay không — **chủ dự án phải quyết định và ghi vào đó trước khi cả nhóm bắt đầu.**

---

## 6. Contract phải chốt trước khi chia việc

| Contract | Ai sở hữu | Ai tiêu thụ | Trạng thái |
|---|---|---|---|
| `shared/labels.json` | — | Tất cả | ✅ Đã xong |
| Định dạng file landmark (header JSON + float32) | P1 | P3 (Recorder), P1 (training) | ⬜ Cần chốt |
| Interface tensor ONNX: `[1,60,55,3]`, `[1,60,3]`, `[1,60]` → 51 logits | P1 | P2, P4 | ⬜ Cần chốt |
| Quy ước FE shell: routing, API client, JWT, component chung | P2 | P3, P4, P5 | ⬜ Cần chốt |
| Danh sách endpoint API | Người làm BE tương ứng | FE tương ứng | ⬜ Cần chốt |

> Quan trọng nhất là **định dạng landmark**: nó là điểm chạm giữa Recorder (P3) và training (P1). Lệch định dạng là hỏng cả hai phía, và rất khó phát hiện.

---

## 7. Mốc đồng bộ cả nhóm

| Mốc | Điều kiện kích hoạt | Nội dung |
|---|---|---|
| **MỐC 1 — Quay đợt 1** | P1 xong `recorder-lite` | Cả 5 người: 10 ký hiệu × 12 lần + 15 clip `idle`/người (ngồi yên, gãi đầu, uống nước, chỉnh tóc) |
| **MỐC 2 — Quay đợt 2** | P1 báo ký hiệu yếu sau train lần 1 | Cả 5 người, chỉ quay bù ký hiệu yếu |
| **MỐC 3 — Giao model thật** | Golden test PASS | P1 giao `.onnx` cho P2 và P4 cùng lúc |

**Mục tiêu dữ liệu:** 5 người × 10 ký hiệu × 12 lần = **600 clip** (60 clip/lớp) + ~75 clip `idle`.

> Không được bỏ qua clip `idle`. Thiếu `idle`, chế độ Dịch sẽ phun từ liên tục ngay cả khi người dùng ngồi im — demo sẽ trông rất tệ.

---

## 8. Khi bị chặn thì làm gì

Nguyên tắc: **không ai ngồi chờ.** Mỗi người luôn có việc backend độc lập để rút ra làm.

| Người | Nếu đang chờ | Rút việc này ra làm |
|---|---|---|
| P1 | chờ quay xong | Viết sẵn `train.py` chạy với dữ liệu giả để kiểm tra luồng |
| P2 | (hầu như không bị chặn) | Shell là việc đầu, hoàn toàn tự chủ |
| P3 | chờ FE shell | BE `collection` — đủ việc cho cả giai đoạn ① |
| P4 | chờ FE shell | BE `vocabulary` + `learning` |
| P5 | chờ FE shell hoặc chờ clip | BE `modelregistry` + `stats` |

---

## 9. Định nghĩa "demo xong"

- [ ] Mở web, bật webcam, làm một ký hiệu → từ tương ứng hiện lên màn hình
- [ ] Ngồi yên 60 giây → không phun ra từ nào (lớp `idle` hoạt động)
- [ ] Làm liên tiếp 3 ký hiệu khác nhau → ra đúng 3 từ theo thứ tự
- [ ] Golden test PASS (sai lệch PyTorch ↔ ONNX Runtime Web < 1e-3)
- [ ] Có video demo dự phòng đã quay sẵn, phòng khi camera hoặc mạng hỏng lúc trình bày

---

## 10. Lưu ý khi trình bày

**Về độ chính xác:** toàn bộ dữ liệu train đến từ chính 5 thành viên nhóm. Khi thành viên tự demo, độ chính xác sẽ rất cao vì model đã "thấy" chính người đó lúc train — con số này **không phản ánh** khả năng thật với người lạ.

Nên chủ động nói rõ điều này khi trình bày, kèm con số của người được để riêng làm tập test. Nêu trước một hạn chế đáng tin hơn nhiều so với việc để người xem tự phát hiện.

**Những gì cắt khỏi phạm vi demo** (38 ký hiệu còn lại, tình nguyện viên ngoài nhóm, cụm giao tiếp, so sánh 3 kiến trúc) nên được trình bày như **kế hoạch giai đoạn sau**, không phải như phần bị bỏ quên — chúng đều đã có đặc tả đầy đủ trong `SRS.md`.
