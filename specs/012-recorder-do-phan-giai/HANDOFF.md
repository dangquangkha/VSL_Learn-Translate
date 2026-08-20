# HANDOFF — prompt để agent khác tiếp tục spec 012

Copy nguyên khối bên dưới, dán vào agent mới.

---

```
Tôi là Tài (P1), chủ dự án VSL Learn & Translate (học + dịch Ngôn ngữ Ký hiệu Việt Nam).
Trả lời tôi bằng tiếng Việt. Repo: https://github.com/dangquangkha/VSL_Learn-Translate (PUBLIC)

Một agent khác đang làm dở spec 012 thì bị ngắt. Nhiệm vụ của bạn là TIẾP TỤC, không làm lại.

## ĐỌC NGAY, theo thứ tự

1. `specs/012-recorder-do-phan-giai/spec.md`  — Context + Acceptance Criteria (AC-17..AC-24)
2. `specs/012-recorder-do-phan-giai/plan.md`  — 3 giai đoạn, mỗi giai đoạn có "cổng ra" rõ ràng
3. `AGENTS.md` §4.1 (bắt buộc cập nhật TIENDO.html) và §4.2 (Sprint Demo ĐANG BẬT)
4. `frontend/AGENTS.md` — ràng buộc client-side, đặc biệt §1 và §2

## VIỆC ĐẦU TIÊN: xác định đang dở ở đâu

Đừng tin file này về tiến độ — TỰ KIỂM TRA:

    git branch --show-current      # phải là feat/chon-do-phan-giai-recorder
    git log --oneline main..HEAD   # commit nào đã có
    git status --short
    cd tools/recorder-lite && npm test && npm run build

Đối chiếu kết quả với bảng 3 giai đoạn trong `plan.md`, rồi làm tiếp từ giai đoạn
chưa đạt "cổng ra". Giai đoạn đã xong thì KHÔNG làm lại.

## RÀNG BUỘC KHÔNG ĐƯỢC PHÁ

1. **Mọi preset độ phân giải phải là 16:9.** Không bao giờ thêm 640×480 (4:3) dù nó
   chạy 30fps. Lý do đầy đủ ở `spec.md` §2 và trong chú thích `isSixteenNine()` tại
   `shared/landmarks/resolution.ts`. Tóm tắt: đổi tỉ lệ là co giãn KHÔNG ĐỀU, mà bước
   chuẩn hoá theo vai trong ONNX graph chỉ khử được co giãn ĐỀU. Hỏng âm thầm, không
   test nào đỏ.

2. **`createLandmarkers()` nhận module `@mediapipe/tasks-vision` qua THAM SỐ.** Đừng
   "sửa" thành import trực tiếp trong `shared/landmarks/` — `vite dev` vẫn chạy nhưng
   `vite build` sẽ hỏng. Xem đầu `shared/landmarks/mediapipe.ts`.

3. **Không đụng ONNX graph, không đổi contract 3 tensor** (`landmarks [1,60,75,4]` +
   `mask [1,60,3]` + `timestamps [1,60]` → `logits [1,51]`). Ngoài phạm vi spec này.

4. **Không push thẳng `main`.** Conventional Commits, mở PR rồi merge.

5. **Cập nhật `TIENDO.html` trong cùng commit** — nhưng spec này KHÔNG phải đầu việc có
   mã trong `PHAN_CONG.md`, nên chỉ sửa `updated` + `updatedBy`, KHÔNG đổi `status` nào.
   Chỉ sửa trong khối `BEGIN/END STATUS DATA`.

## MÔI TRƯỜNG (Windows) — đã trả giá để biết

- Python gọi bằng `py`, KHÔNG phải `python`
- Luôn đặt `PYTHONIOENCODING=utf-8`, thiếu là `print()` tiếng Việt ném UnicodeEncodeError
- `PYTHONPATH=.` khi chạy script import `ai_pipeline`
- **Python nhận path Windows (`C:\...`), KHÔNG nhận path Git Bash (`/c/...`)**
- **`py - <<EOF` KHÔNG dùng được — nó mở REPL rồi treo.** Viết ra file .py rồi chạy
- PowerShell không có `&&`, dùng `;`
- `ls -l | awk '{print $5}'` cho SAI kích thước vì tên user có khoảng trắng → dùng `stat -c%s`
- Node v24.14.0, npm 11.9.0, Python 3.14.2
- Test JS: `cd tools/recorder-lite && npm test` (vitest). Test Python: `py -m pytest ai_pipeline/tests`

## CÁCH TÔI MUỐN BẠN LÀM VIỆC

- Làm ĐÚNG phạm vi spec 012 rồi DỪNG. Không tự động nhảy sang việc khác.
- **TỰ VERIFY ĐỘC LẬP** — chạy lại test, đọc code, đừng tin báo cáo suông. Tiền lệ:
  một subagent từng che lỗi build bằng NTFS junction cục bộ; một subagent khác để lại
  NaN trong parity test.
- **Đừng chỉ nghe tôi nói — tra cứu và phản biện.** Nếu thấy spec sai thì nói, đừng làm bừa.
- Chỉ tick acceptance criteria nào THỰC SỰ kiểm chứng được. Cái nào cần webcam thật thì
  ghi rõ "chưa kiểm chứng, cần Tài quay thử".

## PHẦN KHÔNG TEST TỰ ĐỘNG ĐƯỢC — phải nói rõ, đừng lờ đi

`AC-19`, `AC-21`, `AC-22` và toàn bộ mục "Kiểm chứng cuối" trong `plan.md` cần webcam
thật. Bạn KHÔNG tự làm được. Làm xong code thì báo tôi để tôi quay thử, và ghi rõ trong
PR là chưa kiểm chứng.

Đặc biệt: nếu hạ xuống 640×360 mà fps vẫn không lên thì spec này KHÔNG cứu được máy của
Đức (P05) — camera bị chặn 15fps bất kể độ phân giải. Phải nói thẳng điều đó trong PR
thay vì báo cáo thành công.

## BỐI CẢNH: vì sao có spec này

Ba người đã quay thử, đo trên dữ liệu thật:

| | P01 Tài | P3 An | P05 Đức |
|---|---|---|---|
| frame_count | 61–74 | 29–58 | 45–45 (cố định) |
| fps_avg | 20,2–24,6 | 9,4–19,2 | 14,9–15,0 |

Cửa sổ model là 60 khung, clip 3 giây → cần ≥ 20 fps. An và Đức không đạt nên 99 clip
họ đã quay đều KHÔNG DÙNG ĐƯỢC. Đây là cổng chặn của cả hai người.
```

---

## Ghi chú cho Tài (không nằm trong prompt)

Nếu agent mới hỏi "đã làm tới đâu", bảo nó chạy đúng 4 lệnh trong mục
*"VIỆC ĐẦU TIÊN"* — trạng thái thật nằm ở git và ở kết quả test, không nằm ở
lời kể của ai.
