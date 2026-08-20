# Spec 012 — Chọn độ phân giải trong recorder-lite

| | |
|---|---|
| **Chủ sở hữu** | P1 (Tài) |
| **Chế độ** | Sprint Demo (`AGENTS.md` §4.2) — spec rút gọn còn Context + Acceptance Criteria |
| **Gỡ chặn cho** | P3 An, P5 Đức — hai người hiện **không quay được clip dùng được** |
| **Không phải** đầu việc có mã trong `PHAN_CONG.md` | Là bản sửa cho `P1-1` sau khi dữ liệu quay thật phơi ra vấn đề |

---

## 1. Context

Ba người đã quay thử. Đo trên dữ liệu thật:

| | P01 Tài | P3 An | P05 Đức |
|---|---|---|---|
| `frame_count` | 61–74 | 29–58 | **45–45** (cố định) |
| `fps_avg` | 20,2–24,6 | 9,4–19,2 | **14,9–15,0** |
| Độ phân giải | 1280×720 | 1280×720 | 1280×720 |

Cửa sổ model là **60 khung**, clip dài **3 giây** → cần **≥ 20 fps**. An và Đức đều không đạt, nên **99 clip họ đã quay đều không dùng được**.

Hai nguyên nhân khác nhau:

- **An** — dao động 9,4–19,2. Nghẽn tính toán (nhiều khả năng MediaPipe đang chạy CPU vì khởi tạo GPU thất bại; xem log `[landmarks] Khong khoi tao duoc ... voi GPU`).
- **Đức** — ghim cứng 15,0 fps, 45 khung, **không lệch một khung nào trong 36 clip**. Đó là chữ ký của **camera bị chặn fps**, không phải máy yếu.

`shared/landmarks/capture.ts` hiện xin cứng `width ideal 1280 / height ideal 720 / frameRate ideal 30`. Cả ba đều là ràng buộc **mềm**, và rất nhiều webcam chỉ chạy 1280×720 ở 15fps trong khi 640×360 chạy được 30fps. Trình duyệt thoả mãn độ phân giải rồi chấp nhận 15fps.

**Landmark đã chuẩn hoá về `[0,1]` theo chiều rộng/cao ảnh**, nên hạ độ phân giải **không làm đổi dữ liệu** — chỉ làm landmark nhiễu hơn một chút. Đây là đòn bẩy rẻ nhất hiện có.

## 2. Ràng buộc bắt buộc — TỈ LỆ KHUNG HÌNH phải cố định 16:9

Đây là phần dễ làm sai nhất của spec này.

Độ phân giải khác nhau thì không sao — `x = 0.5` vẫn là chính giữa dù 1280 hay 640 pixel. Nhưng **tỉ lệ** khác nhau thì có: `1280×720` là 16:9, `640×480` là **4:3**.

Đổi tỉ lệ là co giãn **không đều** — trục x bị nén khác trục y. Bước chuẩn hoá theo vai trong ONNX graph chia cả `x` lẫn `y` cho **cùng một** khoảng cách vai, nên nó khử được co giãn **đều** (ngồi gần/xa, ống kính rộng/hẹp) nhưng **không khử được co giãn không đều**. Một vòng tay tròn quay ở 16:9 sẽ thành hình bầu dục ở 4:3, và không bước nào trong graph gỡ lại được.

Không test nào đỏ. Chỉ thấy accuracy thấp mà không truy được nguyên nhân.

> **`640×480` TUYỆT ĐỐI không được có trong danh sách lựa chọn** — và nó chính là chế độ webcam hay chạy 30fps nhất, tức là cái người dùng dễ với tay lấy nhất khi đang cần fps.

Vì `getUserMedia` có thể trả về chế độ khác cái được xin, **không được tin lời xin — phải đo lại thứ thực sự nhận được.**

## 3. Yêu cầu chức năng

| Mã | Yêu cầu |
|---|---|
| `R-11` | Ba mức chọn, **tất cả đều 16:9**: `1280×720`, `960×540`, `640×360`. Mặc định `1280×720` |
| `R-12` | Lựa chọn lưu vào `localStorage`, giống `participant_code` — mở lại trang không phải chọn lại |
| `R-13` | Đổi mức → webcam khởi động lại với ràng buộc mới, **không phải tải lại trang**. Cấm đổi khi đang đếm ngược hoặc đang ghi |
| `R-14` | Hiển thị độ phân giải **thực tế nhận được** (từ `video.videoWidth/videoHeight`), không phải mức đã xin |
| `R-15` | Tỉ lệ thực tế lệch 16:9 quá 2% → **CHẶN nút Ghi**, kèm thông báo nói rõ phải chọn mức khác |
| `R-16` | fps trực tiếp < 20 → gợi ý (không chặn) hạ xuống mức thấp hơn kế tiếp |

### Vì sao `R-15` CHẶN chứ không chỉ cảnh báo

Khác hẳn cảnh báo "đoạn liên tục thấy tay" ở `R-10`. Cái đó là **chuyện phán đoán** — clip vẫn có thể tốt, nên chỉ cảnh báo. Tỉ lệ khung hình sai là **khách quan và không cứu được**: clip đã quay ra thì không sửa lại được nữa.

Cái giá của việc chặn nhầm là người đó phải đổi mức chọn, mất 10 giây. Cái giá của việc không chặn là 135 clip phải quay lại. Chặn là đúng.

## 4. Acceptance Criteria

- [ ] `AC-17` `RESOLUTION_PRESETS` có đúng 3 mức, cả 3 đều đúng 16:9 (kiểm bằng test, không kiểm bằng mắt)
- [ ] `AC-18` `isSixteenNine()` nhận `1280×720`, `960×540`, `640×360`; **từ chối** `640×480`, `800×600`, `1024×768`
- [ ] `AC-19` Đổi mức chọn → `startWebcam` được gọi lại với `width/height` mới, luồng cũ đã được dừng (không rò camera track)
- [ ] `AC-20` Lựa chọn sống sót qua reload trang
- [ ] `AC-21` Khi tỉ lệ thực tế không phải 16:9, nút Ghi bị `disabled` và thông báo nêu rõ tỉ lệ nhận được
- [ ] `AC-22` Không đổi được mức khi đang đếm ngược / đang ghi
- [ ] `AC-23` Header `.vslm` ghi đúng `video_width`/`video_height` thực tế của mức đang dùng
- [ ] `AC-24` `npm run build` sạch, toàn bộ test cũ vẫn xanh (17 test của `summary`)

## 5. Ngoài phạm vi

- Sửa `frameRate` thành ràng buộc cứng (`min: 24`) — rủi ro `getUserMedia` ném lỗi trên máy không có chế độ nào đạt; cân nhắc sau khi đo được hiệu quả của việc hạ độ phân giải
- Bật GPU cho máy An — đó là việc cấu hình trình duyệt/driver, không phải việc của code
- Kiểm tra tỉ lệ khung hình phía dataset builder (`P1-5`) — sẽ làm ở spec đó, dùng `video_width`/`video_height` đã có sẵn trong header
- Bất kỳ thay đổi nào với ONNX graph hoặc contract 3 tensor

## 6. Lưới an toàn còn lại

Header `.vslm` **đã** lưu `video_width` và `video_height` từ v1. Nên kể cả nếu `R-15` bị lọt, dataset builder vẫn phát hiện được clip lệch tỉ lệ sau này. Đây là lý do không cần làm gì thêm về định dạng.
