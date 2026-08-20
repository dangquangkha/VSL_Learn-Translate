# Plan 012 — Chọn độ phân giải trong recorder-lite

Chia thành 3 giai đoạn có ranh giới rõ. Mỗi giai đoạn tự đứng được: nếu bị ngắt giữa chừng, giai đoạn đã xong vẫn build và test được.

Nhánh: `feat/chon-do-phan-giai-recorder`

---

## Giai đoạn 1 — Logic thuần + test (không đụng UI, không đụng webcam)

Toàn bộ phần có thể test mà không cần trình duyệt. Làm trước để phần khó kiểm chứng nhất được chốt sớm.

| # | Việc | File |
|---|---|---|
| 1 | `ResolutionPreset`, `RESOLUTION_PRESETS` (3 mức 16:9), `DEFAULT_PRESET_ID` | `shared/landmarks/resolution.ts` (mới) |
| 2 | `getPreset(id)` — id lạ thì lui về mặc định | cùng file |
| 3 | `isSixteenNine(w, h)` — sai số 2% | cùng file |
| 4 | `describeAspect(w, h)` — trả `"16:9"`, `"4:3"`, hoặc `"1.60:1"` để hiện trong thông báo | cùng file |
| 5 | `suggestLowerPreset(current)` — mức thấp hơn kế tiếp, `null` nếu đã thấp nhất | cùng file |
| 6 | `MIN_FPS_FOR_60_FRAMES = 20` kèm chú thích 60 khung ÷ 3 giây | cùng file |
| 7 | Export qua barrel | `shared/landmarks/index.ts` |
| 8 | Test cho toàn bộ mục trên | `tools/recorder-lite/src/resolution.test.ts` |

**Cổng ra giai đoạn 1:** `npm test` xanh, `npm run build` sạch. `AC-17`, `AC-18` đạt.

---

## Giai đoạn 2 — `startWebcam` nhận preset + `stopWebcam`

| # | Việc | File |
|---|---|---|
| 1 | `startWebcam(video, preset?)` — dùng `preset.width/height`, giữ nguyên `frameRate ideal 30` | `shared/landmarks/capture.ts` |
| 2 | Mở rộng kiểu trả về: thêm `aspectOk: boolean`, `aspectLabel: string`. **Bổ sung thêm trường, không đổi trường cũ** — `{ width, height }` vẫn còn để không phá bên gọi | cùng file |
| 3 | `stopWebcam(video)` — dừng mọi track, xoá `srcObject` | cùng file |

**Ràng buộc:** không import `@mediapipe/tasks-vision` trực tiếp vào `shared/landmarks/` (xem đầu `mediapipe.ts` — `vite build` sẽ hỏng). Việc này không đụng tới đó, chỉ nhắc để không vô tình.

**Cổng ra giai đoạn 2:** `npm run build` sạch. Chưa có gì đổi trên UI.

---

## Giai đoạn 3 — UI + nối dây

| # | Việc | File |
|---|---|---|
| 1 | Ô `<select>` chọn độ phân giải + chỗ hiện độ phân giải thực tế | `tools/recorder-lite/src/ui.ts` |
| 2 | Thêm 2 trường vào `AppElements` | cùng file |
| 3 | Lưu/đọc `localStorage` | `tools/recorder-lite/src/session.ts` |
| 4 | Nối sự kiện đổi mức → `stopWebcam` + `startWebcam` lại | `tools/recorder-lite/src/main.ts` |
| 5 | `aspectOk === false` → chặn nút Ghi (thêm điều kiện vào `updateRecordButtonEnabled`) | cùng file |
| 6 | Khoá ô chọn khi đang đếm ngược / đang ghi | cùng file |
| 7 | Gợi ý hạ mức khi fps trực tiếp < 20 | cùng file |

**Cổng ra giai đoạn 3:** `npm run build` sạch, test cũ vẫn xanh. `AC-19`…`AC-24`.

---

## Kiểm chứng cuối — phải làm bằng webcam thật

Phần này **không** test tự động được, và là thứ quyết định spec này có giá trị hay không:

1. Mở recorder, chọn lần lượt 3 mức, ghi lại `fps` trực tiếp của từng mức
2. Quay 1 clip ở mức thấp nhất, đọc lại bằng `ai_pipeline/data/landmark_io.py`, xác nhận `frame_count ≥ 60` và `video_width/height` đúng
3. Ghi con số đo được vào phần kết quả của PR

> Nếu hạ xuống `640×360` mà fps vẫn không lên, thì kết luận là camera bị chặn ở 15fps **bất kể độ phân giải** — lúc đó spec này không cứu được Đức, và phải chuyển sang phương án buổi quay chung. **Nói rõ điều đó trong PR thay vì lờ đi.**

---

## Thứ tự commit

| Commit | Nội dung |
|---|---|
| 1 | `feat(landmarks): preset độ phân giải 16:9 + kiểm tra tỉ lệ khung hình` (giai đoạn 1 + 2) |
| 2 | `feat(recorder): cho chọn độ phân giải, chặn ghi khi tỉ lệ không phải 16:9` (giai đoạn 3) |

`TIENDO.html`: chỉ cập nhật `updated`/`updatedBy`. Đây không phải đầu việc có mã trong `PHAN_CONG.md` nên **không đổi `status`** nào.
