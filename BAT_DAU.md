# BẮT ĐẦU TỪ ĐÂY

> Đọc file này trước. Mất 2 phút. Bên dưới có sẵn đoạn prompt để copy đưa cho agent của bạn.

---

## 1. Repo có những file nào, đọc cái nào

| File | Là gì | Khi nào đọc |
|---|---|---|
| **`BAT_DAU.md`** | File này — cửa vào | Ngay bây giờ |
| **`PHAN_CONG.md`** | Ai làm gì, thứ tự, ai chặn ai | Đọc phần của mình (§5) + §5.1 |
| **`TIENDO.html`** | Bảng tiến độ trực quan — mở bằng trình duyệt | Mỗi lần bắt đầu và kết thúc phiên làm việc |
| **`AGENTS.md`** | Quy tắc bắt buộc cho AI agent | Agent tự đọc, bạn không cần đọc hết |
| `SRS.md` | Đặc tả đầy đủ (85KB) | Chỉ tra khi cần chi tiết một tính năng |
| `DESIGN.md` | Thiết kế kỹ thuật | Chỉ tra khi cần |

**Không cần đọc `SRS.md` từ đầu đến cuối.** Agent sẽ tự tra phần liên quan.

---

## 2. Bạn là ai

| Mã | Tên | Vai trò |
|---|---|---|
| **P1** | **Tài** | AI pipeline (train model, export ONNX) |
| **P2** | **Khải** | FE shell + chế độ Dịch |
| **P3** | **An** | Recorder + thu thập dữ liệu |
| **P4** | **Hùng** | Chế độ Học |
| **P5** | **Đức** | Admin + registry/quality/stats |

Nhớ mã của mình (`P1`…`P5`) — mọi thứ trong repo đều gọi theo mã này.

---

## 3. Copy đoạn dưới đây đưa cho agent

Tìm khối của mã mình, copy nguyên văn, dán vào agent (Claude Code / Antigravity / Codex / Gemini) khi mở dự án lần đầu.

### P1 — Tài

```
Tôi là Tài (P1) trong dự án VSL Learn & Translate, phụ trách AI pipeline.

Trước khi làm bất cứ việc gì, đọc theo thứ tự:
1. AGENTS.md — quy tắc bắt buộc, đặc biệt §4.1 (cập nhật TIENDO.html) và §4.2 (chế độ sprint demo)
2. PHAN_CONG.md — mục §5 phần "P1" là hàng đợi việc của tôi; mục §5.1 là đường dẫn code và danh sách những gì ĐÃ CÓ SẴN (đọc kỹ, nhiều phần đã viết xong rồi, đừng làm lại)
3. TIENDO.html — khối STATUS ở đầu file cho biết đang tới việc nào

Sau đó báo cho tôi: đầu việc tiếp theo của tôi là gì, có đang bị chặn không, rồi bắt đầu làm.

Bắt buộc: xong mỗi đầu việc phải cập nhật TIENDO.html trong cùng commit. Không push thẳng vào main.
```

### P2 — Khải

```
Tôi là Khải (P2) trong dự án VSL Learn & Translate, phụ trách FE shell + chế độ Dịch.

Trước khi làm bất cứ việc gì, đọc theo thứ tự:
1. AGENTS.md — quy tắc bắt buộc, đặc biệt §4.1 (cập nhật TIENDO.html) và §4.2 (chế độ sprint demo)
2. PHAN_CONG.md — mục §5 phần "P2" là hàng đợi việc của tôi; mục §5.1 là đường dẫn code và danh sách những gì ĐÃ CÓ SẴN (đọc kỹ, nhiều phần đã viết xong rồi, đừng làm lại)
3. TIENDO.html — khối STATUS ở đầu file cho biết đang tới việc nào

Sau đó báo cho tôi: đầu việc tiếp theo của tôi là gì, có đang bị chặn không, rồi bắt đầu làm.

Lưu ý: việc đầu tiên của tôi (FE shell) là CỔNG CHẶN — P3, P4, P5 không làm được frontend nếu tôi chưa xong. Ưu tiên tuyệt đối, không xen việc khác.

Bắt buộc: xong mỗi đầu việc phải cập nhật TIENDO.html trong cùng commit. Không push thẳng vào main.
```

### P3 — An

```
Tôi là An (P3) trong dự án VSL Learn & Translate, phụ trách Recorder + thu thập dữ liệu.

Trước khi làm bất cứ việc gì, đọc theo thứ tự:
1. AGENTS.md — quy tắc bắt buộc, đặc biệt §4.1 (cập nhật TIENDO.html) và §4.2 (chế độ sprint demo)
2. PHAN_CONG.md — mục §5 phần "P3" là hàng đợi việc của tôi; mục §5.1 là đường dẫn code và danh sách những gì ĐÃ CÓ SẴN (đọc kỹ, nhiều phần đã viết xong rồi, đừng làm lại)
3. TIENDO.html — khối STATUS ở đầu file cho biết đang tới việc nào

Sau đó báo cho tôi: đầu việc tiếp theo của tôi là gì, có đang bị chặn không, rồi bắt đầu làm.

Lưu ý: phần frontend của tôi phải chờ FE shell của P2. Trong lúc chờ, làm backend module collection trước — phần đó hoàn toàn độc lập.

Bắt buộc: xong mỗi đầu việc phải cập nhật TIENDO.html trong cùng commit. Không push thẳng vào main.
```

### P4 — Hùng

```
Tôi là Hùng (P4) trong dự án VSL Learn & Translate, phụ trách chế độ Học.

Trước khi làm bất cứ việc gì, đọc theo thứ tự:
1. AGENTS.md — quy tắc bắt buộc, đặc biệt §4.1 (cập nhật TIENDO.html) và §4.2 (chế độ sprint demo)
2. PHAN_CONG.md — mục §5 phần "P4" là hàng đợi việc của tôi; mục §5.1 là đường dẫn code và danh sách những gì ĐÃ CÓ SẴN (đọc kỹ, nhiều phần đã viết xong rồi, đừng làm lại)
3. TIENDO.html — khối STATUS ở đầu file cho biết đang tới việc nào

Sau đó báo cho tôi: đầu việc tiếp theo của tôi là gì, có đang bị chặn không, rồi bắt đầu làm.

Lưu ý: phần frontend của tôi phải chờ FE shell của P2. Trong lúc chờ, làm backend module vocabulary trước — phần đó hoàn toàn độc lập.

Bắt buộc: xong mỗi đầu việc phải cập nhật TIENDO.html trong cùng commit. Không push thẳng vào main.
```

### P5 — Đức

```
Tôi là Đức (P5) trong dự án VSL Learn & Translate, phụ trách Admin + modelregistry/quality/stats.

Trước khi làm bất cứ việc gì, đọc theo thứ tự:
1. AGENTS.md — quy tắc bắt buộc, đặc biệt §4.1 (cập nhật TIENDO.html) và §4.2 (chế độ sprint demo)
2. PHAN_CONG.md — mục §5 phần "P5" là hàng đợi việc của tôi; mục §5.1 là đường dẫn code và danh sách những gì ĐÃ CÓ SẴN (đọc kỹ, nhiều phần đã viết xong rồi, đừng làm lại)
3. TIENDO.html — khối STATUS ở đầu file cho biết đang tới việc nào

Sau đó báo cho tôi: đầu việc tiếp theo của tôi là gì, có đang bị chặn không, rồi bắt đầu làm.

Lưu ý: phần frontend của tôi phải chờ FE shell của P2. Trong lúc chờ, làm backend modelregistry và stats trước — phần đó hoàn toàn độc lập.

Bắt buộc: xong mỗi đầu việc phải cập nhật TIENDO.html trong cùng commit. Không push thẳng vào main.
```

---

## 4. Bốn quy tắc, ai cũng phải theo

1. **Xong việc nào là cập nhật `TIENDO.html` ngay, trong cùng commit.** Người sau nhìn vào đó mới biết đã tới lượt mình. Việc chưa cập nhật bảng coi như chưa xong. Chi tiết cách sửa nằm trong `AGENTS.md` §4.1 — chỉ sửa khối `BEGIN/END STATUS DATA`, không đụng phần còn lại.

2. **Không push thẳng vào `main`.** Tạo nhánh `feat/...`, `fix/...` rồi mở PR.

3. **Đọc `PHAN_CONG.md` §5.1 trước khi viết dòng code đầu tiên.** Nhiều phần đã có sẵn trong repo — tiền xử lý landmark, export ONNX, golden test, module `auth` làm mẫu. Viết lại là mất thời gian vô ích.

4. **Bị chặn thì không ngồi chờ** — rút việc backend của mình ra làm. `PHAN_CONG.md` §8 ghi rõ mỗi người nên làm gì khi chờ.

---

## 5. Tối nay làm gì (giai đoạn ①)

Giai đoạn ① là giai đoạn duy nhất **không ai chặn ai** — cả 5 người làm song song hoàn toàn.

| Người | Việc tối nay |
|---|---|
| P1 — Tài | `recorder-lite` + export ONNX giả + module `useLandmarks` |
| P2 — Khải | **FE shell** — ưu tiên tuyệt đối |
| P3 — An | BE `collection` |
| P4 — Hùng | BE `vocabulary` + seed 12 ký hiệu |
| P5 — Đức | BE `modelregistry` + `stats` |

**Bốn thứ phải xong và push trong tối nay** (nếu không, sáng mai có người không làm được gì):

- FE shell — Khải (P2)
- ONNX giả — Tài (P1)
- `useLandmarks` — Tài (P1)
- `recorder-lite` — Tài (P1) *(chưa xong thì cả nhóm không quay được)*

**Sáng mai:** cả nhóm quay dữ liệu đợt 1 — **12 ký hiệu × 12 lần + 15 clip `idle`** mỗi người.

**12 ký hiệu đã chốt** (recorder-lite tự hiện sẵn, không phải tự chọn):

| | | | |
|---|---|---|---|
| xin chào | cảm ơn | bạn | tôi |
| không | có | giúp đỡ | học |
| gia đình | nhà | ăn | đi |

Cộng lớp `idle` (ngồi yên, gãi đầu, uống nước, chỉnh tóc) → **13 lớp**.

Lý do chọn đúng 12 từ này — và vì sao loại `tạm biệt`, `xin lỗi`, `uống`, nhóm người thân, nhóm thời gian — xem `specs/010-p1-foundation/spec.md` §4.

---

## 6. Kiểm tra tiến độ

Mở `TIENDO.html` bằng trình duyệt (double-click là được, không cần server).

Bảng cho biết ngay: ai đang làm gì, cổng nào đã mở, ai đang bị chặn bởi ai, và việc tiếp theo của từng người.
