# Đặc tả Yêu cầu Phần mềm (SRS)
## VSL Learn & Translate — Ứng dụng học và dịch Ngôn ngữ Ký hiệu Việt Nam

| | |
|---|---|
| **Phiên bản** | 2.0 — chốt toàn bộ 8 quyết định còn treo; bổ sung §2.6 (nhánh phụ thuộc người thạo VSL), §4.1.1 (biến thể vùng miền), FR-C07 (recorder trên Android), L-8, L-9, R-11 |
| **Ngày** | 17/08/2026 |
| **Trạng thái** | **Không còn điểm bỏ ngỏ.** Sẵn sàng chuyển sang lập kế hoạch triển khai |
| **Nhóm thực hiện** | 4–5 thành viên |
| **Thời lượng** | 12 tuần |

---

## Mục lục

1. [Giới thiệu](#1-giới-thiệu)
2. [Mô tả tổng quan](#2-mô-tả-tổng-quan)
3. [Yêu cầu chức năng](#3-yêu-cầu-chức-năng)
4. [Yêu cầu về dữ liệu](#4-yêu-cầu-về-dữ-liệu)
5. [Yêu cầu phần AI](#5-yêu-cầu-phần-ai)
6. [Yêu cầu phi chức năng](#6-yêu-cầu-phi-chức-năng)
7. [Giao diện ngoài](#7-giao-diện-ngoài)
8. [Kiểm thử và tiêu chí nghiệm thu](#8-kiểm-thử-và-tiêu-chí-nghiệm-thu)
9. [Kế hoạch triển khai](#9-kế-hoạch-triển-khai)
10. [Rủi ro và phương án dự phòng](#10-rủi-ro-và-phương-án-dự-phòng)
11. [Hạn chế đã biết](#11-hạn-chế-đã-biết)
12. [Phụ lục A — Danh sách 50 ký hiệu](#phụ-lục-a--danh-sách-50-ký-hiệu)
13. [Phụ lục B — Cụm giao tiếp cơ bản](#phụ-lục-b--cụm-giao-tiếp-cơ-bản-fr-b08)

---

## 1. Giới thiệu

### 1.1 Mục đích tài liệu

Tài liệu này đặc tả đầy đủ yêu cầu cho hệ thống **VSL Learn & Translate**: một ứng dụng web giúp người nghe bình thường học Ngôn ngữ Ký hiệu Việt Nam (VSL) và nhận dạng ký hiệu thành chữ theo thời gian thực qua webcam.

Đối tượng đọc: thành viên nhóm phát triển, giảng viên hướng dẫn, hội đồng chấm.

### 1.2 Phạm vi sản phẩm

Hệ thống gồm bốn thành phần:

| Thành phần | Mô tả |
|---|---|
| **Frontend** | Ứng dụng web tĩnh (React + TypeScript). Chạy MediaPipe để trích landmark và ONNX Runtime Web để nhận dạng — **toàn bộ inference diễn ra trên máy người dùng**. |
| **Backend** | Spring Boot 3 / Java 21. Quản lý tài khoản, từ vựng, tiến độ học, thu thập dữ liệu, phiên bản model, thống kê. |
| **Pipeline AI** | Mã Python chạy offline: dựng dataset, huấn luyện, đánh giá, xuất ONNX. |
| **Dataset** | Bộ dữ liệu VSL do nhóm tự thu thập từ ~20 người, được công bố kèm dataset card. |

Nội dung giảng dạy gồm **50 ký hiệu đơn lẻ** và **6–8 cụm giao tiếp cơ bản** (§3.2, Phụ lục B). Cụm giao tiếp được dạy như một đơn vị có nguồn tra cứu riêng, không phải do nhóm tự ghép các ký hiệu lại.

**Không thuộc phạm vi:** dịch câu hoàn chỉnh có ngữ pháp VSL, sinh câu tự do từ chuỗi ký hiệu, dịch ngược chữ → ký hiệu (avatar 3D), ứng dụng di động native, nhận dạng biểu cảm khuôn mặt (non-manual markers), inference phía server.

### 1.3 Thuật ngữ và viết tắt

| Thuật ngữ | Giải thích |
|---|---|
| **VSL** | Vietnamese Sign Language — Ngôn ngữ Ký hiệu Việt Nam |
| **Landmark** | Toạ độ các điểm mốc trên tay/cơ thể do MediaPipe trích xuất |
| **Gloss** | Từ tiếng Việt tương ứng với một ký hiệu |
| **Ký hiệu tĩnh / động** | Ký hiệu không có / có chuyển động trong quá trình thực hiện |
| **Lớp `idle`** | Lớp đặc biệt biểu thị "người dùng không đang thực hiện ký hiệu nào" |
| **Subject-independent split** | Chia train/test theo người, đảm bảo một người chỉ xuất hiện ở đúng một tập |
| **Train/serve skew** | Sai lệch giữa tiền xử lý lúc huấn luyện và lúc suy luận |
| **Presigned URL** | URL có chữ ký tạm thời cho phép tải lên/xuống trực tiếp từ object storage |
| **DTW** | Dynamic Time Warping — thuật toán so khớp hai chuỗi thời gian có tốc độ khác nhau |
| **P0 / P1 / P2** | Mức ưu tiên: bắt buộc / nên có / cắt trước khi hết giờ |

### 1.4 Tài liệu tham chiếu

- **Nguồn chuẩn chính:** Danh mục Ngôn ngữ Ký hiệu — dự án QIPEDC, Bộ Giáo dục và Đào tạo, `qipedc.moet.gov.vn/dictionary`. Khoảng 4.000 từ có video, thu thập từ cộng đồng người Điếc ba miền, do Bộ GD&ĐT quản lý, tài trợ bởi GPRBA/World Bank
- **Căn cứ pháp lý cho chuẩn quốc gia:** Thông tư 17/2020/TT-BGDĐT (bảng chữ cái ký hiệu)
- **Nguồn đối chiếu phụ:** `nnkh.thaiphong.net` · `tudienngonngukyhieu.com`
- Tài liệu ngôn ngữ học về cú pháp VSL — cần cho Phụ lục B
- MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) — Hand Landmarker, Pose Landmarker
- ONNX Runtime Web
- IEEE 830 (cấu trúc tài liệu SRS)

---

## 2. Mô tả tổng quan

### 2.1 Bối cảnh

Người khiếm thính tại Việt Nam gặp rào cản giao tiếp thường trực do rất ít người nghe biết VSL, trong khi tài nguyên học VSL trực tuyến gần như không có. Hệ thống này giải quyết hai nửa của vấn đề: giúp người nghe **học** VSL có phản hồi tự động, và **dịch** ký hiệu thành chữ trong hội thoại đơn giản.

### 2.2 Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────┐
│ FE — React + TypeScript (static, Cloudflare Pages)           │
│   MediaPipe Tasks → landmark   |   ONNX Runtime Web → nhãn   │
│   Học · Dịch · Đóng góp dữ liệu · Admin                      │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST + JWT
┌───────────────────────────▼──────────────────────────────────┐
│ BE — Spring Boot 3 / Java 21 (monolith chia module)          │
│  auth · vocabulary · learning · collection · quality         │
│  · modelregistry · stats        + @Async worker              │
└──────┬──────────────────────────────────┬────────────────────┘
       │                                  │
  PostgreSQL                       Cloudflare R2 (S3 API)
  users, tiến độ, metadata         video, landmark, file .onnx
                                          ▲
┌─────────────────────────────────────────┴────────────────────┐
│ training/ — Python, chạy offline trên Colab/laptop           │
│   kéo dataset → train → đánh giá → export ONNX → đẩy lên     │
└──────────────────────────────────────────────────────────────┘
```

**Nguyên tắc kiến trúc bất di bất dịch: backend không chạy inference.** Không tồn tại endpoint `/predict`. Model chạy trong trình duyệt. Bốn lý do:

1. **Riêng tư** — video và landmark không bao giờ rời khỏi máy người dùng ở chế độ Học và Dịch.
2. **Độ trễ** — chế độ dịch liên tục cần ~5 dự đoán/giây; round-trip mạng khiến nó không dùng được.
3. **Chi phí** — không cần GPU server.
4. **Khả năng chống chịu khi demo** — chế độ Dịch vẫn chạy khi backend sập hoặc mất mạng, vì model đã nằm trong cache trình duyệt.

### 2.3 Nhóm người dùng

| Vai trò | Mô tả | Quyền |
|---|---|---|
| **Khách** | Chưa đăng nhập | Dùng chế độ Dịch, xem trang minh bạch dataset |
| **LEARNER** | Người học | Toàn bộ chế độ Học, lưu tiến độ |
| **CONTRIBUTOR** | Người quay dữ liệu (ẩn danh, không cần tài khoản) | Truy cập luồng đóng góp dữ liệu qua link mời |
| **ADMIN** | Thành viên nhóm | Duyệt clip, quản lý từ vựng, quản lý phiên bản model, xem thống kê |

### 2.4 Ràng buộc

| Mã | Ràng buộc |
|---|---|
| C-01 | Inference phải chạy hoàn toàn client-side |
| C-02 | Chi phí hạ tầng bằng 0 hoặc dùng credit sinh viên (Azure for Students / Oracle Always Free) |
| C-03 | **Chế độ Học và Dịch:** Chrome/Edge mới trên desktop. **Recorder (FR-C):** thêm Chrome trên Android — xem §3.3. Không cam kết Safari, Firefox, hay iOS ở bất kỳ chế độ nào |
| C-04 | Toàn bộ dữ liệu do nhóm tự thu thập, có phiếu đồng ý |
| C-05 | Thời lượng 12 tuần, 4–5 người |
| C-06 | Dùng MediaPipe **Tasks Vision API** qua gói `@mediapipe/tasks-vision`, không dùng bộ Legacy Solutions (hỗ trợ đã kết thúc từ 01/03/2023). Mặc định: `HandLandmarker` + `PoseLandmarker` chạy song song. **[Spike tuần 1]** kiểm tra xem `HolisticLandmarker` có sẵn trong gói **web** hay không — nếu có, cân nhắc dùng vì nó đảm bảo tay và pose đồng bộ thời gian tuyệt đối, đổi lại phải tải thêm 468 điểm khuôn mặt không dùng đến |

### 2.5 Giả định và phụ thuộc

| Mã | Giả định | Rủi ro nếu sai |
|---|---|---|
| A-01 | Nhóm mời được 12–15 tình nguyện viên quay dữ liệu | Giảm còn 30 ký hiệu, xem §10 |
| A-02 | Nhóm tiếp cận được 2–3 người sử dụng VSL thành thạo. **Hạn chót xác nhận: hết tuần 4.** Xem cây quyết định ở §2.6 | Kích hoạt nhánh dự phòng ở §2.6 — không để treo |
| A-03 | Danh mục QIPEDC (~4.000 từ có video) chứa đủ 50 ký hiệu cần dùng. **Xác minh trong tuần 1 bằng cách tra thử từng từ** | Thay ký hiệu không tra được bằng ký hiệu khác cùng nhóm chủ đề, giữ nguyên tổng số 50 |
| A-04 | Tình nguyện viên có webcam và kết nối đủ để tải lên ~100–225MB mỗi phiên | Cơ chế tự hạ chất lượng ở FR-C05 xử lý |
| A-05 | Máy tình nguyện viên chạy được MediaPipe ở tối thiểu 15fps | Recorder cảnh báo và ghi nhận fps thực tế vào metadata |

### 2.6 Phụ thuộc quan trọng nhất: người sử dụng VSL thành thạo

Ba hạng mục cùng phụ thuộc vào việc mời được 2–3 người thạo VSL: video mẫu tự quay (§4.1.3), cụm giao tiếp (FR-B08), và tập Test B (§5.6). Vì vậy đây không phải một giả định để ngỏ mà là một **nhánh quyết định có hạn chót**.

**Hạn chót: hết tuần 4.** Sau mốc này, dự án đi theo một trong hai nhánh và không quay lại.

| | Nhánh A — mời được (≥ 2 người) | Nhánh B — không mời được |
|---|---|---|
| Video mẫu | Tự quay, đối chiếu QIPEDC | Nhúng/liên kết QIPEDC, **không sao chép** |
| FR-B08 cụm giao tiếp | Triển khai | **Loại bỏ hoàn toàn** |
| Test B | Có — đo được khoảng cách người mới tập ↔ người ký thạo | Không có |
| Phạm vi kết luận trong báo cáo | Nêu rõ đã kiểm chứng trên cả hai nhóm | Nêu rõ **mọi số liệu chỉ nói về người mới tập bắt chước video** |
| Chế độ Học | Chạy được offline | Cần mạng, phụ thuộc QIPEDC còn hoạt động |

**Nơi nên tìm** (bắt đầu ngay tuần 1, đây là việc mất thời gian chờ đợi nhất trong cả dự án): chi hội/câu lạc bộ người Điếc tại địa phương · trung tâm hỗ trợ phát triển giáo dục hoà nhập · trường chuyên biệt dành cho trẻ khiếm thính · giáo viên dạy VSL · các nhóm cộng đồng trực tuyến quanh dự án QIPEDC.

Khối lượng cần từ họ rất nhỏ — khoảng 15 phút quay 50 ký hiệu cho Test B, cộng ~30 phút quay video mẫu và xác nhận trật tự cụm. Nêu rõ con số này khi liên hệ; lời mời "giúp em 45 phút" dễ được nhận lời hơn nhiều so với một lời mời không có giới hạn.

---

## 3. Yêu cầu chức năng

### 3.1 Khu vực công khai (không cần đăng nhập)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| **FR-A01** | Trang chủ giới thiệu vấn đề, giá trị xã hội và ba lối vào (Học / Dịch / Đóng góp) | P0 |
| **FR-A02** | **Chế độ Dịch**: bật webcam, nhận dạng liên tục, hiển thị chuỗi từ đã nhận. Có nút xoá chuỗi và sao chép. Chạy 100% client-side, hoạt động được sau lần tải đầu kể cả khi mất mạng | P0 |
| **FR-A02.1** | Hiển thị trạng thái thời gian thực: đang thấy tay hay không, độ tin cậy dự đoán hiện tại, số khung hình/giây | P0 |
| **FR-A02.2** | Hiển thị rõ thông báo "Video không rời khỏi máy bạn" | P0 |
| **FR-A03** | **Trang minh bạch dataset**: số người tham gia, phân bố mẫu theo nhãn, độ chính xác theo từng người trong tập test, các hạn chế đã biết | P1 |
| **FR-A04** | Trang giới thiệu nhóm và liệt kê nguồn từ điển VSL đã dùng cho từng ký hiệu | P1 |

**Luồng chế độ Dịch (FR-A02):**

1. Người dùng cấp quyền camera
2. MediaPipe trích landmark mỗi khung hình, đẩy vào bộ đệm vòng 2 giây
3. Mỗi 6 khung hình (~0,2 giây), cửa sổ hiện tại được đưa vào model
4. Bộ giải mã phát ra một từ khi thoả **cả ba** điều kiện: nhãn ≠ `idle`, xác suất ≥ 0,7, và cùng nhãn lặp lại ở ≥ 3 cửa sổ liên tiếp
5. Sau khi phát một từ, hệ thống khoá 1 giây và yêu cầu quan sát thấy `idle` trước khi phát từ tiếp theo
6. Từ được nối vào chuỗi hiển thị

### 3.2 Chế độ Học (cần đăng nhập)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| **FR-B01** | Đăng ký và đăng nhập bằng email + mật khẩu, xác thực JWT | P0 |
| **FR-B02** | Danh sách 50 ký hiệu nhóm theo 7 chủ đề, hiển thị trạng thái tiến độ từng ký hiệu | P0 |
| **FR-B03** | Trang chi tiết ký hiệu: video mẫu phát lặp, nút tua chậm 0,5×, mô tả cách thực hiện bằng chữ, nguồn tra cứu | P0 |
| **FR-B04** | **Luyện tập**: đếm ngược 3 giây → ghi 3 giây → chấm điểm → hiển thị phản hồi. Kết quả gửi về backend | P0 |
| **FR-B05** | Trang tiến độ: lịch sử điểm theo thời gian, chuỗi ngày luyện liên tiếp, danh sách ký hiệu tới hạn ôn tập | P1 |
| **FR-B06** | Lộ trình bài học có thứ tự, mở khoá dần theo tiến độ | P1 |
| **FR-B07** | Phản hồi chi tiết bằng DTW: so quỹ đạo cổ tay của người tập với mẫu chuẩn, sinh gợi ý dạng "tay đưa hơi thấp", "làm hơi nhanh" | P2 |
| **FR-B08** | **Cụm giao tiếp cơ bản**: 6–8 cụm có nguồn (Phụ lục B), mỗi cụm có video mẫu của **cả cụm** và được chấm bằng cách kiểm tra các ký hiệu thành phần xuất hiện đúng thứ tự | P1 |

**Quy tắc chấm điểm một ký hiệu (FR-B04):**

- Điểm = xác suất model gán cho nhãn đúng × 100, làm tròn
- Phân loại: **≥ 70 Đạt** · **40–69 Gần đúng** · **< 40 Chưa đúng**
- Nếu nhãn dự đoán cao nhất là `idle`, hiển thị "Chưa phát hiện được ký hiệu nào" thay vì chấm 0 điểm
- Trạng thái Leitner cập nhật: Đạt → tăng một bậc; Chưa đúng → về bậc 1

**Hạn chế đã biết của cách chấm này:** model chỉ phân biệt 51 lớp, nên một động tác hoàn toàn nằm ngoài tập nhãn vẫn có thể nhận điểm cao cho một lớp nào đó. Lớp `idle` giảm bớt nhưng không loại bỏ hiện tượng này. FR-B07 nếu triển khai sẽ khắc phục vì DTW so trực tiếp với mẫu chuẩn thay vì đi qua bộ phân loại. Hạn chế này phải được nêu trong báo cáo.

---

**Cụm giao tiếp (FR-B08) — quy tắc bắt buộc.** Học từ rời không đủ để giao tiếp, giống như học từ vựng tiếng Anh mà không học câu. Nhưng phần này mang rủi ro cao nhất trong toàn bộ sản phẩm, nên bị ràng buộc chặt:

| Ràng buộc | Nội dung |
|---|---|
| **Nguồn** | Chỉ đưa vào cụm **tra được trong từ điển VSL** hoặc **do người sử dụng VSL thành thạo xác nhận và quay mẫu**. Nhóm tuyệt đối không tự ghép ký hiệu thành cụm |
| **Trật tự** | Lấy từ nguồn, không suy ra từ trật tự từ tiếng Việt. **Lưu dưới dạng tập hợp các trật tự hợp lệ, không phải một trật tự duy nhất** — xem giải thích bên dưới |
| **Độ dài** | **Tối đa 3 ký hiệu mỗi cụm.** Cụm càng dài thì số biến thể trật tự hợp lệ càng nhiều và việc chấm càng vô nghĩa |
| **Từ vựng** | Mọi ký hiệu thành phần phải nằm trong 50 ký hiệu đã có, nếu không sẽ không chấm được |
| **Video mẫu** | Video của **cả cụm** do người thạo VSL thực hiện, không phải nối ba video ký hiệu rời |
| **Nhãn giao diện** | Ghi rõ hệ thống chấm *"có làm đủ các ký hiệu theo đúng thứ tự không"*, **không** ghi *"chấm điểm câu"* |
| **Không tra được** | Bỏ cụm đó. Không có nguồn thì không dạy |

**Cách chấm — khoan dung với trật tự, nghiêm với thành phần.**

Khảo sát ngôn ngữ học cho thấy trật tự từ trong VSL **không hoàn toàn cố định**: cùng một nội dung có thể sắp xếp theo nhiều cách hợp lệ khác nhau. Vì vậy chấm điểm theo một trật tự duy nhất sẽ đánh trượt những người ký **đúng** — sai lầm tệ hơn cả không có tính năng này, vì nó dạy người học rằng cách đúng của họ là sai.

| Thành phần điểm | Trọng số | Cách tính |
|---|---|---|
| **Đủ ký hiệu** | 80% | Tỉ lệ ký hiệu thành phần được nhận dạng, không xét thứ tự |
| **Trật tự** | 20% | Chuỗi nhận được có khớp **một trong các trật tự đã xác nhận** hay không |

Đạt ở mức đủ ký hiệu là đã qua. Trật tự chỉ là điểm cộng, và chỉ tính khi cụm đó có nhiều hơn một trật tự được xác nhận thì mới chấp nhận cả hai.

Phản hồi chỉ đúng ký hiệu bị thiếu: *"Hệ thống không nhận được ký hiệu GIÚP ĐỠ"*. Nếu đủ ký hiệu nhưng khác trật tự đã ghi nhận, hiển thị trung lập: *"Bạn làm đủ các ký hiệu. Trật tự trong video mẫu là ..."* — thông báo, không phải trừ điểm nặng.

Không cần thêm lớp cho model, không cần thu thêm dữ liệu.

**Ràng buộc kỹ thuật từ bộ giải mã — bắt buộc đọc trước khi thiết kế màn hình.** Bộ giải mã ở FR-A02 chỉ phát ra một từ sau khi quan sát thấy `idle` (bước 5). Nếu người học ký cả cụm liền mạch không ngắt, **chỉ ký hiệu đầu tiên được phát ra** và điểm sẽ luôn thấp bất kể họ làm đúng hay sai.

Vì vậy màn hình luyện cụm phải hướng dẫn rõ ràng: **ký từng ký hiệu, dừng ngắn khoảng nửa giây giữa các ký hiệu.** Đây chính là biểu hiện cụ thể của hạn chế L-7 — hệ thống dạy và chấm ở dạng từ điển, không ở dạng nói liền. Không được im lặng về điều này rồi để người học tự đoán vì sao mình mãi không đạt điểm.

**Giới hạn phải nêu trên giao diện:** hệ thống không quan sát biểu cảm khuôn mặt (L-3), nên không thể đánh giá cụm có được ký tự nhiên và đúng ngữ pháp hay không. Nó chỉ kiểm tra thành phần và thứ tự.

### 3.3 Đóng góp dữ liệu (recorder)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| **FR-C01** | Phiếu đồng ý là màn hình đầu tiên, tách riêng ba quyền có thể chọn độc lập: (a) dùng cho đồ án, (b) công bố dataset, (c) chiếu video khi bảo vệ. Quyền (a) là bắt buộc để tiếp tục | P0 |
| **FR-C02** | Khai metadata ẩn danh: thuận tay trái/phải, đã biết VSL trước đây hay chưa, nhóm tuổi, có phải thành viên nhóm không. **Không thu thập tên, email hay bất kỳ định danh cá nhân nào** | P0 |
| **FR-C03** | Kiểm tra thiết bị trước khi cho phép ghi: đủ sáng, thấy đủ thân trên, khoảng cách hợp lý (đo qua độ rộng vai trên khung hình), fps ≥ 15, **khung hình đứng yên** (phương sai vị trí vai qua các khung hình dưới ngưỡng). Hiển thị checklist xanh/đỏ, chỉ bật nút ghi khi tất cả đạt | P0 |
| **FR-C07** | **Recorder chạy được trên Chrome/Android**: bố cục dọc, kiểm tra codec và tự chuyển VP8/H.264 nếu thiết bị không hỗ trợ VP9, hướng dẫn dựng máy cố định | P1 |
| **FR-C04** | Phiên quay có dẫn dắt: video mẫu phát lặp bên cạnh, đếm ngược 3-2-1, ghi 3 giây, tự kiểm tra chất lượng, cho xem lại, người quay chọn Giữ hoặc Quay lại | P0 |
| **FR-C05** | Hàng đợi tải lên chạy nền: clip tự đẩy lên trong lúc người quay chuẩn bị ký hiệu tiếp theo; thất bại thì tự thử lại; mất mạng thì lưu tạm trong IndexedDB. Đo tốc độ ở clip đầu, nếu chậm thì tự hạ xuống 480p và ghi lại mức đã dùng vào metadata | P0 |
| **FR-C06** | Hiển thị tiến độ phiên và màn hình cảm ơn khi hoàn tất | P1 |

**Tiêu chí tự loại clip tại trình duyệt (FR-C04):**

| Điều kiện | Xử lý |
|---|---|
| > 20% khung hình mất cả hai tay | Từ chối, yêu cầu quay lại |
| Số khung hình hợp lệ < 20 | Từ chối |
| Ký hiệu động nhưng phương sai landmark dưới ngưỡng | Cảnh báo "hình như bạn chưa cử động", cho phép giữ hoặc quay lại |
| Không phát hiện được pose thân trên ở > 30% khung hình | Từ chối |

**Điều phối phân bổ:** khi một người mở link mời, backend cấp cho họ nhóm 10 ký hiệu **đang có ít mẫu hợp lệ nhất** trong toàn dataset. Không có bước này, các ký hiệu đầu danh sách sẽ thừa mẫu còn cuối danh sách thiếu.

**Quyết định: recorder hỗ trợ Chrome trên Android (FR-C07).** Đây là ngoại lệ duy nhất so với ràng buộc chỉ-desktop ở C-03, và nó đáng giá vì số người mời được quyết định trực tiếp chất lượng dataset — mà nhiều tình nguyện viên chỉ có điện thoại. Chi phí ước tính 2–3 ngày.

Hai điều kiện đi kèm, **bắt buộc**:

| Điều kiện | Lý do |
|---|---|
| **Máy phải được dựng cố định**, không cầm tay | Camera rung làm toàn bộ landmark trôi theo, và chuẩn hoá theo vai không cứu được vì cả khung hình cùng dịch chuyển. Recorder kiểm tra bằng phương sai vị trí vai và từ chối nếu vượt ngưỡng (FR-C03) |
| **Kiểm tra codec khi khởi động** | Không phải thiết bị Android nào cũng ghi được VP9. Dùng `MediaRecorder.isTypeSupported` rồi lùi dần VP9 → VP8 → H.264, và ghi codec đã dùng vào metadata |

**iOS không được hỗ trợ.** Safari có nhiều khác biệt về `MediaRecorder` và codec, và nhóm không đủ thời gian kiểm thử. Thiết bị iOS hiển thị thông báo rõ ràng đề nghị dùng máy tính hoặc điện thoại Android — không để người dùng đi tới cuối phiên rồi mới hỏng.

### 3.4 Quản trị

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| **FR-D01** | Hàng đợi duyệt clip có trạng thái `NEEDS_REVIEW`: xem video, chấp nhận hoặc loại, ghi lý do | P0 |
| **FR-D02** | Bảng thống kê dataset: số mẫu theo nhãn, số người tham gia, phân bố theo metadata, tỉ lệ loại. Là nguồn dữ liệu cho FR-A03 và cho báo cáo | P0 |
| **FR-D03** | Quản lý từ vựng: thêm/sửa ký hiệu **và cụm giao tiếp**, video mẫu, mô tả, nguồn từ điển. **Không cho lưu nếu trường nguồn để trống** (§4.1.1) | P1 |
| **FR-D04** | Quản lý phiên bản model: tải lên file `.onnx` kèm metrics, xem lịch sử, kích hoạt một phiên bản | P1 |

### 3.5 Ngoài phạm vi (không làm)

Bảng xếp hạng · kết bạn · bình luận · thông báo đẩy · ứng dụng di động native · giao diện đa ngôn ngữ · kiến trúc microservices · hàng đợi tin nhắn (Kafka/RabbitMQ) · **endpoint inference phía server**.

Mỗi mục trên đều hấp dẫn khi họp nhóm và đều lấy đi thời gian đáng lẽ dành cho phần AI — phần duy nhất tạo nên giá trị học thuật của đồ án.

---

## 4. Yêu cầu về dữ liệu

### 4.1 Từ vựng

**50 ký hiệu + 1 lớp `idle` = 51 lớp.** Danh sách đầy đủ ở [Phụ lục A](#phụ-lục-a--danh-sách-50-ký-hiệu).

Lớp `idle` là bắt buộc, không phải phụ trợ: nó là cơ chế duy nhất cho phép chế độ Dịch tự xác định điểm bắt đầu và kết thúc của một ký hiệu. Dữ liệu `idle` phải được thu thập nghiêm túc như các lớp khác.

Từ vựng trộn cả ký hiệu tĩnh (nhóm số đếm) và động (các nhóm còn lại) một cách có chủ đích, để chứng minh model xử lý được cả hai và để phân tích trong báo cáo xem loại nào bị nhầm nhiều hơn.

### 4.1.1 Biến thể vùng miền — quyết định nền tảng

VSL không phải một hệ thống thống nhất. Việt Nam có ba biến thể ký hiệu bản địa gắn với ba cộng đồng người Điếc: **Hà Nội, Hải Phòng và Thành phố Hồ Chí Minh**, cùng một biến thể miền Trung ít được ghi nhận hơn. Mức trùng lặp giữa chúng chỉ **hơn 50% từ vựng cốt lõi** — nghĩa là gần một nửa số ký hiệu có thể khác nhau giữa hai miền.

Từ 2020, Việt Nam có nỗ lực chuẩn hoá quốc gia (Thông tư 17/2020/TT-BGDĐT quy định bảng chữ cái ký hiệu), theo đó ba biến thể trên được xem là **phương ngữ** của một VSL thống nhất.

**Quyết định: dùng chuẩn quốc gia theo danh mục QIPEDC làm chuẩn duy nhất cho toàn bộ 50 ký hiệu.**

Hệ quả bắt buộc kèm theo:

| Yêu cầu | Nội dung |
|---|---|
| Ghi nhận vùng miền | Bảng `participants` bổ sung trường `region` cho **mọi** người quay, không riêng người thạo VSL |
| Không trộn nguồn | Một ký hiệu chỉ lấy từ một nguồn. Không lấy "xin chào" theo Hà Nội rồi "cảm ơn" theo TP.HCM |
| Báo cáo phạm vi | Nêu rõ model được kiểm chứng trên biến thể nào, tương ứng với vùng miền của những người thực tế đã tham gia (§11, L-8) |

Bỏ qua điều này sẽ dẫn tới một thất bại rất khó chẩn đoán: model đạt số đẹp trên tập test, nhưng khi đem cho một người Điếc ở miền khác dùng thì sai gần một nửa — và nhóm sẽ đi tìm lỗi ở model trong khi lỗi nằm ở chỗ hai bên đang dùng hai thứ tiếng khác nhau.

### 4.1.2 Nguyên tắc dẫn nguồn (áp dụng cho toàn bộ nội dung giảng dạy)

> **Ứng dụng không được khẳng định bất kỳ điều gì về VSL mà nó không dẫn được nguồn.**

Mỗi ký hiệu và mỗi cụm giao tiếp bắt buộc có trường `dictionary_source` ghi rõ nguồn tra cứu. Không tra được thì không đưa vào — không có ngoại lệ, không có "tạm để đó rồi kiểm tra sau".

Nguyên tắc này tồn tại vì **hậu quả của việc sai không đối xứng giữa hai chế độ**. Nhận dạng sai ở chế độ Dịch thì người dùng thấy ngay và bỏ qua. Dạy sai ở chế độ Học thì người học mang cái sai đó đi giao tiếp với người khiếm thính thật, và họ không có cách nào biết mình đang sai. Chế độ Học chịu trách nhiệm nặng hơn chế độ Dịch, dù về mặt kỹ thuật nó dễ hơn.

Đây cũng là câu trả lời cho câu hỏi của hội đồng: "làm sao biết ký hiệu các bạn dạy là VSL đúng?"

### 4.1.3 Video mẫu: nguồn gốc và giấy phép

Chế độ Học cần video mẫu cho 50 ký hiệu và các cụm giao tiếp. Đây là vấn đề pháp lý chứ không chỉ kỹ thuật, và dễ bị bỏ sót cho đến khi sản phẩm đã chạy.

| Phương án | Ưu | Nhược |
|---|---|---|
| **Liên kết/nhúng thẳng từ trang từ điển** | Không đụng bản quyền, không tốn lưu trữ | Phụ thuộc trang ngoài. Trang đổi đường dẫn hoặc chặn nhúng là chế độ Học chết. Không dùng offline được |
| **Sao chép về R2** | Ổn định, chủ động, chạy offline | **Phải kiểm tra giấy phép của từ điển.** Sao chép và tái phân phối video của bên khác có thể vi phạm bản quyền, kể cả với mục đích học thuật phi lợi nhuận |
| **Tự quay video mẫu với người thạo VSL** ⭐ | Sạch hoàn toàn về bản quyền · chủ động · đồng bộ phong cách với FR-B08 · biến "có tham vấn cộng đồng" thành sự thật | Tốn ~1–2 buổi và phụ thuộc A-02 |

**Quyết định: phương án thứ ba — tự quay video mẫu với người thạo VSL, đối chiếu QIPEDC để xác nhận tính đúng đắn.**

Từ điển đóng vai trò nguồn kiểm chứng (`dictionary_source`), người thạo VSL đóng vai trò người thực hiện (`verified_by`). Cách này giải quyết cùng lúc **năm** vấn đề vốn phải xử lý riêng: bản quyền video mẫu, tính xác thực của nội dung dạy, video cụm cho FR-B08, tính nhất quán về biến thể vùng miền (§4.1.1), và khả năng chạy offline của chế độ Học.

Điều khoản sử dụng của QIPEDC không được công bố rõ ràng ở dạng máy đọc được, nên **mặc định coi là không được phép sao chép và tái phân phối video của họ**. Tự quay né hẳn câu hỏi này thay vì phải đi xin phép và chờ trả lời.

**Phương án dự phòng nếu không mời được người thạo VSL** (xem A-02): nhúng/liên kết thẳng tới QIPEDC, **không tải bản sao về R2**. Chấp nhận rằng chế độ Học cần mạng và có thể hỏng nếu QIPEDC đổi đường dẫn; ghi hạn chế này vào báo cáo. Trong tình huống đó FR-B08 bị loại (không có video cụm và không ai xác nhận trật tự).

### 4.2 Giao thức thu thập

**Ba nhóm người quay, ba vai trò khác nhau:**

| Nhóm | Số người | Khối lượng | Vai trò trong dataset |
|---|---|---|---|
| Thành viên nhóm | 4–5 | 50 ký hiệu × 8 lần | Huấn luyện — giữ ≤ 40% tổng số mẫu |
| Tình nguyện viên không biết VSL | 12–15 | 50 × 5, chia nhiều phiên | Huấn luyện + validation |
| **Người biết VSL thật** | **2–3** | 50 × 3 (~15 phút/người) | **Chỉ dùng làm tập test. Tuyệt đối không đưa vào huấn luyện.** |

Ngoài ra mỗi người quay 20–30 clip `idle`: ngồi yên, gãi đầu, uống nước, chỉnh tóc, nói chuyện.

**Mục tiêu:** ~6.500–8.000 clip ký hiệu (chưa kể ~500 clip `idle`), trong đó **người ngoài nhóm chiếm ≥ 60%**.

Tính toán ở cận dưới: nhóm 5 người × 50 × 8 = 2.000 · tình nguyện viên 15 người × 50 × 5 = 3.750 · người thạo VSL 3 người × 50 × 3 = 450. Tổng 6.200 clip ký hiệu, tỉ lệ người ngoài 68%.

**Yêu cầu đối với người quay:** không cần biết VSL — họ bắt chước video mẫu phát ngay bên cạnh. Chỉ cần webcam, Chrome hoặc Edge, phòng đủ sáng, ngồi cách máy 1–1,5m thấy được từ hông trở lên. Mỗi phiên gói trong 8–10 phút; dài hơn thì tỉ lệ bỏ dở tăng mạnh.

**Chủ động mời cho đa dạng:** cao/thấp, gầy/đậm, nam/nữ, thuận trái/thuận phải, có/không đeo kính, các tông da khác nhau, tay áo dài che cổ tay, nền gọn và nền lộn xộn. Các yếu tố như đeo nhẫn, sơn móng tay hay tay áo dài ảnh hưởng thật đến chất lượng landmark của MediaPipe, và một dataset chứa sẵn các trường hợp đó là dataset trung thực hơn.

### 4.3 Định dạng lưu trữ

Mỗi clip sinh ra **hai đối tượng trên R2** và **một dòng trong bảng `clips`**.

**Landmark (bắt buộc, dùng để huấn luyện):**

| Thuộc tính | Giá trị |
|---|---|
| Nội dung | **Toàn bộ** landmark thô: 33 điểm pose + 21×2 điểm tay. Không cắt subset |
| Mỗi điểm | `x`, `y`, `z` (+ `visibility` cho pose) |
| Kèm theo | **Dấu thời gian từng khung hình** (bắt buộc) |
| Định dạng | Float32 nhị phân + header JSON mô tả shape |
| Kích thước | ~40KB sau nén |

Lưu **landmark đầy đủ chứ không phải subset đã chọn** là điều cho phép nhóm đổi ý về tập đặc trưng mà không phải mời ai quay lại.

Dấu thời gian là bắt buộc vì máy tình nguyện viên chạy 12fps hay 30fps là chuyện hên xui, và cùng một chuỗi 30 khung hình ở hai tốc độ đó là hai ký hiệu khác nhau về mặt thời gian.

**Video (bảo hiểm, dùng để trích lại và kiểm tra bằng mắt):**

| Thuộc tính | Giá trị |
|---|---|
| Độ phân giải | 1280×720 @ 30fps, VP9, cap ~2 Mbps → ~750KB/clip 3 giây |
| Hạ cấp tự động | 640×480 khi đường truyền chậm (~300KB), ghi mức đã dùng vào metadata |
| Tổng dung lượng ước tính | ~6GB cho 8.000 clip — nằm trong hạn mức 10GB của R2 free tier |

**Lưu ý quan trọng:** độ phân giải cấp cho MediaPipe và độ phân giải video lưu là hai chuyện tách biệt. Landmark dùng để huấn luyện được trích **ngay lúc quay** từ luồng camera gốc, nên luôn cho MediaPipe ăn độ phân giải cao nhất webcam cấp được, bất kể video được lưu ở mức nào.

**Trần thực tế không phải dung lượng R2 mà là đường truyền của tình nguyện viên.** Một người quay 300 clip ở 720p phải tải lên ~225MB. Cơ chế hàng đợi nền và tự hạ chất lượng ở FR-C05 tồn tại vì lý do này.

### 4.4 Kiểm soát chất lượng hai tầng

| Tầng | Câu hỏi trả lời | Cách làm |
|---|---|---|
| **Trình duyệt** (FR-C04) | "Clip này có hỏng không?" | Đủ sáng, thấy tay, có cử động, đủ số khung hình |
| **Server** (module `quality`) | "Clip này có **bất thường** so với phần còn lại không?" | Thời lượng lệch > 3 độ lệch chuẩn so với trung bình của chính ký hiệu đó; quỹ đạo khác biệt bất thường so với các mẫu cùng nhãn |

Tầng thứ hai không phải làm lại việc của tầng thứ nhất: nó trả lời một câu hỏi khác, cần thống kê toàn cục mà chỉ server mới có. Đây cũng là nơi sinh ra số liệu nhất quán, kiểm tra lại được cho dataset card.

Trạng thái clip: `PENDING` → `ACCEPTED` | `REJECTED` | `NEEDS_REVIEW`. Chỉ clip `ACCEPTED` được đưa vào huấn luyện.

### 4.5 Đạo đức và đồng thuận

| Mã | Yêu cầu |
|---|---|
| DR-E01 | Phiếu đồng ý ba quyền độc lập (FR-C01), lưu lại thời điểm và nội dung phiên bản phiếu đã ký |
| DR-E02 | Định danh người quay chỉ là mã ẩn danh `P01`–`P25`. Không lưu tên, email, hay bất kỳ thông tin nhận dạng nào |
| DR-E03 | Chỉ video của người đã đồng ý quyền (c) mới được chiếu khi bảo vệ |
| DR-E04 | Chỉ dữ liệu của người đã đồng ý quyền (b) mới được công bố; nếu công bố, chỉ công bố landmark, không công bố video |
| DR-E05 | Dataset card công bố kèm dataset: quy trình thu thập, phân bố nhân khẩu, hạn chế đã biết |

---

## 5. Yêu cầu phần AI

### 5.1 Nguyên tắc chống train/serve skew

Rủi ro kỹ thuật lớn nhất của dự án không phải chọn LSTM hay CNN, mà là **tiền xử lý ở Python (lúc huấn luyện) lệch với tiền xử lý ở JavaScript (lúc suy luận)**. Chỉ cần sai thứ tự trục, quên chia theo độ rộng vai, hay xử lý khung hình mất tay khác nhau, model sẽ đạt 95% trong notebook và thất bại trên sân khấu.

**Giải pháp: toàn bộ tiền xử lý được nướng vào trong ONNX graph.**

Mọi phép chuẩn hoá được viết thành phép toán tensor trong `forward()` của model PyTorch, nên khi xuất ONNX chúng trở thành các op nằm trong graph. JavaScript **không thực hiện bất kỳ phép tiền xử lý nào** — nó chỉ gom landmark thô từ MediaPipe vào bộ đệm và đưa vào model.

Hệ quả: chỉ tồn tại một nguồn sự thật duy nhất. Skew bằng không do thiết kế, không do kỷ luật.

### 5.2 Giao diện ONNX

**Ba tensor đầu vào, hình dạng cố định:**

| Tên | Kiểu | Hình dạng | Nội dung |
|---|---|---|---|
| `landmarks` | float32 | `[1, 60, 55, 3]` | Toạ độ thô của 55 điểm × 60 khung hình gần nhất |
| `mask` | float32 | `[1, 60, 3]` | Có/không phát hiện: pose, tay trái, tay phải |
| `timestamps` | float32 | `[1, 60]` | Thời điểm tương đối của từng khung hình (giây) |

**Đầu ra:**

| Tên | Kiểu | Hình dạng |
|---|---|---|
| `logits` | float32 | `[1, 51]` |

55 điểm = 42 điểm tay (21×2) + 13 điểm thân trên (mũi, 2 mắt, 2 tai, 2 vai, 2 khuỷu, 2 cổ tay, 2 hông).

Các điểm trên khuôn mặt được giữ lại vì **vị trí của tay so với khuôn mặt mang nghĩa** trong ngôn ngữ ký hiệu — "ăn" thực hiện gần miệng, "nghĩ" gần trán.

JavaScript giữ bộ đệm vòng 2 giây. Nếu máy chậm và chưa đủ 60 khung hình, phần thiếu được đệm và đánh dấu `mask = 0`.

**Hai loại `mask = 0` phải được phân biệt trong graph:**

| Loại | Nghĩa | Xử lý đúng |
|---|---|---|
| **Ô đệm** | Khung hình chưa từng tồn tại (máy chạy 15fps nên 2 giây chỉ có 30 khung) | **Loại khỏi phép nội suy ở bước 5.** Không forward-fill |
| **Mất phát hiện** | Khung hình có tồn tại nhưng MediaPipe không thấy tay | Forward-fill ở bước 1 |

Dùng chung một `mask` cho hai trường hợp mà xử lý giống nhau sẽ khiến máy chậm sinh ra chuỗi bị kéo dài giả tạo — ký hiệu trông như thực hiện chậm hơn thực tế. Cách phân biệt: ô đệm có `timestamp` không hợp lệ (đặt bằng `NaN` hoặc giá trị âm), khung mất phát hiện có `timestamp` hợp lệ.

### 5.3 Chuỗi tiền xử lý trong graph

| Bước | Phép toán |
|---|---|
| 1 | Điền khung hình thiếu bằng giá trị hợp lệ gần nhất trước đó (forward-fill theo `mask`) |
| 2 | Dịch gốc toạ độ về trung điểm hai vai, tính theo từng khung hình |
| 3 | Chia tỉ lệ theo khoảng cách hai vai; dùng trung vị trên các khung hình hợp lệ để tránh giật, kẹp dưới để tránh chia cho 0 |
| 4 | Xoay chuẩn hoá để trục vai nằm ngang (xoay 2D trong mặt phẳng xy) — chống nghiêng người |
| 5 | Nội suy theo `timestamps` về 32 mốc thời gian cách đều trong cửa sổ 2 giây |
| 6 | Tính kênh vận tốc: hiệu giữa các khung hình liên tiếp |
| 7 | Ghép thành tensor `[1, 32, 333]` = 165 toạ độ + 165 vận tốc + 3 kênh mask (pose · tay trái · tay phải) |

Bước 4 và bước 6 đáng lưu ý: chuẩn hoá xoay giúp model bớt nhạy với tư thế ngồi nghiêng, còn kênh vận tốc là thứ giúp phân biệt ký hiệu tĩnh với ký hiệu động — thông tin mà toạ độ thuần không thể hiện rõ.

### 5.4 Kiến trúc model — huấn luyện ba, chọn một

| # | Model | Mô tả | Vai trò |
|---|---|---|---|
| 0 | **Hồi quy logistic** | Trên `mean` + `std` của đặc trưng theo thời gian | Baseline. Chứng minh model chuỗi thực sự cần thiết |
| 1 | **1D-CNN (TCN)** | 4 khối Conv1d theo trục thời gian, kênh 128→256, BatchNorm, ReLU, kết nối tắt, global average pooling, FC → 51 | Ứng viên chính |
| 2 | **BiLSTM** | 2 tầng × 128 hidden, gộp bằng attention | Ứng viên đối chứng |

Model 1 và 2 đều ~0,3–0,6 triệu tham số. Việc huấn luyện cả ba và so sánh là một điểm cộng trong báo cáo với chi phí thấp, vì chúng dùng chung toàn bộ pipeline dữ liệu.

Model được chọn là model có độ chính xác cao nhất trên tập validation **chia theo người**.

### 5.5 Tăng cường dữ liệu

| Phép | Tham số |
|---|---|
| Nhiễu Gauss trên toạ độ | σ nhỏ, tỉ lệ theo độ rộng vai |
| Co giãn tỉ lệ ngẫu nhiên | ±10% |
| Xoay ngẫu nhiên quanh trục z | ±10° |
| Co giãn thời gian (time warping) | 0,8×–1,2× |
| Cắt thời gian ngẫu nhiên | Dịch cửa sổ trong clip |
| Bỏ khung hình ngẫu nhiên | Mô phỏng mất tay khi suy luận |
| **Lật gương trái–phải** | Đổi nhãn tay trái ↔ tay phải, **giữ nguyên nhãn lớp** |

Phép lật gương đáng được giải thích trong báo cáo: trong ngôn ngữ ký hiệu, người thuận tay trái thực hiện ký hiệu ở dạng đối xứng gương và **vẫn mang cùng ý nghĩa**. Vì vậy lật gương là phép tăng cường hợp lệ về mặt ngôn ngữ học, không phải thủ thuật kỹ thuật — và nó đồng thời làm model bớt thiên lệch về người thuận tay phải.

### 5.6 Chia tập dữ liệu

**Chia theo người (subject-independent), tuyệt đối không chia ngẫu nhiên.**

Chia ngẫu nhiên 8.000 clip sẽ cho độ chính xác ~99% hoàn toàn giả, vì cùng một người thực hiện cùng một ký hiệu sẽ xuất hiện ở cả tập train lẫn tập test.

| Tập | Thành phần |
|---|---|
Người thạo VSL được tách ra trước và **luôn nằm trọn trong Test B**. Phần còn lại (~16–20 người: 4–5 thành viên nhóm + 12–15 tình nguyện viên) mới đem chia:

| Tập | Thành phần | Số người thực tế |
|---|---|---|
| **Train** | ~70% — **toàn bộ thành viên nhóm bắt buộc nằm ở đây** | 11–14 người |
| **Validation** | ~15%, chỉ tình nguyện viên — chọn model và siêu tham số | 2–3 người |
| **Test A (chính)** | ~15%, chỉ tình nguyện viên, **không đụng tới cho đến lần đánh giá cuối cùng** | 2–3 người |
| **Test B (thạo VSL)** | Toàn bộ dữ liệu của người thạo VSL — **chỉ tồn tại ở nhánh A (§2.6)** | 2–3 người |

**Hai điểm phải nêu trong báo cáo, không được lờ đi:**

**Thành viên nhóm luôn ở tập train.** Họ là nhóm quen thiết bị và quen ký hiệu nhất, nên để họ vào tập test sẽ làm đẹp số liệu một cách giả tạo. Chỉ số "accuracy trên thành viên nhóm so với người ngoài" ở §5.7 vì vậy so **thành viên nhóm (đã có trong train)** với **Test A (chưa từng thấy)** — nó đo mức độ overfit, và chênh lệch lớn là điều **được dự đoán trước**, không phải phát hiện bất ngờ.

**Test A chỉ có 2–3 người là rất ít.** Độ chính xác đo trên ngần đó người có phương sai lớn — đổi một người có thể làm con số nhảy vài điểm phần trăm. Vì vậy báo cáo phải công bố **accuracy riêng của từng người trong Test A** kèm con số trung bình, không được chỉ đưa một số duy nhất. Nếu cỡ mẫu cho phép, dùng thêm k-fold theo người (leave-one-subject-out) trên tập train+validation để có ước lượng ổn định hơn.

### 5.7 Chỉ số đánh giá

| Chỉ số | Mục đích |
|---|---|
| Top-1, Top-3 accuracy | Số liệu chính |
| Ma trận nhầm lẫn | Chỉ ra các cặp ký hiệu bị nhầm |
| **Accuracy theo từng người** trong tập test | Cho thấy phương sai giữa người — bằng chứng định lượng về bias |
| **Accuracy trên thành viên nhóm so với người ngoài** | Đo trực tiếp mức độ overfit vào nhóm |
| **Accuracy Test A so với Test B** | Đo khoảng cách giữa người mới tập và người ký thạo |
| Accuracy theo nhóm metadata | Thuận trái/phải, có/không biết VSL, nhóm tuổi |
| Tỉ lệ báo nhầm của lớp `idle` | Số lần phát từ sai trong 60 giây ngồi yên |
| Độ trễ suy luận trên trình duyệt | ms mỗi cửa sổ |
| Kích thước model | MB sau lượng tử hoá |

Các chỉ số in đậm là nội dung trả lời trực tiếp cho câu hỏi về bias mà hội đồng gần như chắc chắn sẽ đặt ra. Chúng biến một hạn chế thành một phát hiện có số liệu.

### 5.8 Xuất ONNX và quản lý phiên bản

| Mã | Yêu cầu |
|---|---|
| AI-E01 | Xuất ONNX opset 17, kiểm tra bằng `onnxruntime` phía Python trước. Xác nhận phiên bản `onnxruntime-web` đang dùng hỗ trợ opset này (ONNX Runtime tương thích ngược từ opset 7 trở lên, nhưng nên kiểm tra thay vì giả định) |
| AI-E02 | Lượng tử hoá động int8; chấp nhận nếu accuracy tụt ≤ 1 điểm phần trăm |
| AI-E03 | Mỗi phiên bản model kèm **hash của danh sách nhãn**. Frontend đối chiếu hash này với bảng nhãn nó đang có; lệch thì báo lỗi rõ ràng và từ chối chạy |
| AI-E04 | Metrics đầy đủ được nộp cùng model lên `modelregistry` |

Yêu cầu AI-E03 tồn tại để chặn một lỗi im lặng cụ thể: khi nhóm thêm một ký hiệu, thứ tự chỉ số nhãn xê dịch, và ứng dụng sẽ hiển thị "cảm ơn" khi người dùng ký "bệnh viện" — sai hoàn toàn, không có dấu hiệu báo lỗi, và rất khó lần ra.

Nguồn sự thật cho danh sách nhãn là `shared/labels.json`, từ đó sinh ra `labels.py` và `labels.ts` bằng script.

### 5.9 Tiêu chí chấp nhận model

| Mã | Tiêu chí | Ngưỡng |
|---|---|---|
| AC-01 | Top-1 accuracy trên **Test A** | ≥ 85% |
| AC-02 | Top-3 accuracy trên **Test A** | ≥ 95% |
| AC-03 | Recall của ký hiệu kém nhất | ≥ 60% |
| AC-04 | Tỉ lệ báo nhầm khi ngồi yên | ≤ 1 lần / 60 giây |
| AC-05 | Độ trễ suy luận trên laptop tầm trung | ≤ 50ms/cửa sổ |
| AC-06 | Thông lượng toàn pipeline | ≥ 5 dự đoán/giây (khớp bước trượt 6 khung hình ở FR-A02) |
| AC-07 | Kích thước file `.onnx` sau lượng tử hoá | ≤ 5MB |
| AC-08 | Sai lệch logits giữa PyTorch và ONNX Runtime Web trên 20 mẫu chuẩn | < 1e-3 |

**Phân biệt hai loại tiêu chí trong bảng trên:**

| Loại | Mã | Ý nghĩa |
|---|---|---|
| **Cổng chặn cứng** | AC-08 | Sai lệch PyTorch ↔ ONNX Runtime Web là lỗi đúng/sai. Không đạt thì model **không được phát hành**, vì con số đo trong notebook không còn nói lên điều gì về sản phẩm |
| **Mục tiêu thiết kế** | AC-01…AC-07 | Là thước đo để nhóm biết mình đang ở đâu, **không phải cổng chặn**. Không đạt thì vẫn hoàn thiện sản phẩm và báo cáo số liệu thật (xem R-3) |

Sự phân biệt này quan trọng: nếu coi AC-01 (≥85%) là cổng chặn, nhóm sẽ có động cơ làm đẹp con số bằng cách chia tập dễ hơn hoặc bỏ bớt ký hiệu khó. Đó chính xác là thứ §5.6 được thiết kế để ngăn.

**Test B không có ngưỡng.** Kết quả trên tập này là một phát hiện cần báo cáo trung thực, không phải một bài kiểm tra cần vượt qua. Nếu độ chính xác tụt mạnh, đó chính là nội dung phân tích giá trị nhất của đồ án.

---

## 6. Yêu cầu phi chức năng

### 6.1 Hiệu năng

| Mã | Yêu cầu |
|---|---|
| NFR-P01 | Trích landmark đạt ≥ 20fps trên laptop tầm trung (CPU tích hợp) |
| NFR-P02 | Suy luận model chạy trong Web Worker, không chặn luồng giao diện |
| NFR-P03 | Tải lần đầu (model + WASM + JS) ≤ 10MB, có thanh tiến trình |
| NFR-P04 | Sau lần đầu, model và runtime được service worker cache; chế độ Dịch hoạt động offline |
| NFR-P05 | API backend phản hồi p95 < 500ms cho các endpoint không phải upload |

### 6.2 Bảo mật và riêng tư

| Mã | Yêu cầu |
|---|---|
| NFR-S01 | Mật khẩu băm bằng BCrypt |
| NFR-S02 | JWT có thời hạn; endpoint quản trị yêu cầu vai trò ADMIN |
| NFR-S03 | Video và landmark ở chế độ Học và Dịch **không bao giờ** được gửi đi đâu |
| NFR-S04 | Video tải lên đi thẳng từ trình duyệt lên R2 qua presigned URL, **không đi qua backend** |
| NFR-S05 | Presigned URL chỉ cho phép ghi, có thời hạn ngắn, gắn với đúng một khoá đối tượng |
| NFR-S06 | Bucket R2 không công khai; truy cập đọc cũng qua presigned URL |
| NFR-S07 | Toàn bộ giao tiếp qua HTTPS |

Yêu cầu NFR-S04 vừa là quyết định bảo mật vừa là quyết định kiến trúc: để 8.000 clip 720p chảy qua JVM sẽ vừa nghẽn băng thông vừa gây nguy cơ tràn bộ nhớ trên máy free tier, mà không đổi lại lợi ích nào.

### 6.3 Khả dụng và tương thích

| Mã | Yêu cầu |
|---|---|
| NFR-U01 | Toàn bộ giao diện bằng tiếng Việt |
| NFR-U02 | Chế độ Học và Dịch: Chrome/Edge mới trên desktop. Recorder: thêm Chrome/Android (FR-C07). Mọi tổ hợp khác — đặc biệt iOS — hiển thị cảnh báo **ngay màn hình đầu tiên**, không để người dùng đi tới cuối rồi mới hỏng |
| NFR-U03 | Khi bị từ chối quyền camera, hiển thị hướng dẫn khắc phục cụ thể |
| NFR-U04 | Chế độ Dịch hoạt động độc lập với backend — không đăng nhập, không gọi API sau lần tải đầu |

NFR-U04 vừa là tính năng vừa là bảo hiểm cho buổi bảo vệ.

### 6.4 Khả bảo trì

| Mã | Yêu cầu |
|---|---|
| NFR-M01 | `shared/labels.json` là nguồn sự thật duy nhất cho danh sách nhãn; `labels.py` và `labels.ts` được sinh tự động |
| NFR-M02 | Backend là monolith chia module, mỗi module một package với ranh giới rõ; không microservices |
| NFR-M03 | Môi trường phát triển dựng được bằng `docker compose` (Postgres + backend) |
| NFR-M04 | Pipeline Python chạy lại được từ đầu bằng một lệnh, có seed cố định |

---

## 7. Giao diện ngoài

### 7.1 Module backend

| Module | Trách nhiệm |
|---|---|
| `auth` | Đăng ký, đăng nhập, JWT, ba vai trò LEARNER / CONTRIBUTOR / ADMIN |
| `vocabulary` | 50 ký hiệu **và các cụm giao tiếp**: từ, nhóm, mô tả, video mẫu, nguồn từ điển, chỉ số nhãn, chuỗi ký hiệu thành phần của cụm |
| `learning` | Lịch sử luyện tập, điểm, tiến độ theo ký hiệu, ôn tập giãn cách Leitner |
| `collection` | Người quay ẩn danh, phiếu đồng ý, phiên quay, điều phối phân bổ, metadata clip |
| `quality` | Worker `@Async`: hậu kiểm clip, gán trạng thái |
| `modelregistry` | Phiên bản model, metrics, hash nhãn, cờ kích hoạt |
| `stats` | Số liệu tổng hợp cho trang minh bạch và cho báo cáo |

Xử lý bất đồng bộ dùng `@Async` của Spring với bảng hàng đợi trong Postgres. Không dùng message broker ngoài — quy mô không cần và nó sẽ ăn thời gian của phần AI.

### 7.2 REST API

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập, trả JWT |
| GET | `/api/signs` | Danh sách 50 ký hiệu kèm nhóm và video mẫu |
| GET | `/api/signs/{id}` | Chi tiết một ký hiệu |
| GET | `/api/phrases` | Danh sách cụm giao tiếp đã xác nhận nguồn (FR-B08) |
| GET | `/api/phrases/{id}` | Chi tiết một cụm: video mẫu, chuỗi ký hiệu thành phần theo thứ tự, nguồn |
| GET | `/api/model/active` | Phiên bản model đang dùng: URL tải, hash nhãn, mô tả tensor đầu vào |
| POST | `/api/practice/attempts` | Ghi nhận một lần luyện tập |
| GET | `/api/practice/progress` | Tiến độ của người dùng hiện tại |
| POST | `/api/collection/consent` | Ghi nhận phiếu đồng ý, tạo mã người quay ẩn danh |
| POST | `/api/collection/sessions` | Mở phiên quay, **trả về nhóm ký hiệu đang thiếu mẫu nhất** |
| POST | `/api/collection/clips/upload-url` | Cấp presigned URL để tải video và landmark lên R2 |
| POST | `/api/collection/clips` | Xác nhận đã tải lên + gửi metadata |
| GET | `/api/admin/clips?status=NEEDS_REVIEW` | Hàng đợi duyệt |
| PATCH | `/api/admin/clips/{id}` | Chấp nhận hoặc loại clip |
| GET | `/api/admin/stats` | Thống kê dataset |
| POST | `/api/admin/models` | Tải lên phiên bản model mới |
| PATCH | `/api/admin/models/{id}/activate` | Kích hoạt một phiên bản |

### 7.3 Lược đồ cơ sở dữ liệu

| Bảng | Các cột chính |
|---|---|
| `users` | id, email, password_hash, role, created_at |
| `signs` | id, gloss, group, description, reference_video_url, **dictionary_source**, type (STATIC/DYNAMIC), label_index |
| `phrases` | id, text_vi, description, reference_video_url, **dictionary_source**, verified_by, verifier_region |
| `phrase_signs` | phrase_id, sign_id — **tập hợp ký hiệu thành phần, không mang thứ tự** |
| `phrase_orders` | phrase_id, **sign_id_sequence** (một trật tự hợp lệ đã được xác nhận), verified_by. Một cụm có thể có **nhiều dòng** |
| `participants` | id, **code** (P01…), handedness, knows_vsl, age_group, is_team_member, **region** (§4.1.1), created_at |
| `consents` | participant_id, use_in_project, publish_dataset, show_at_defense, consent_version, signed_at |
| `recording_sessions` | id, participant_id, assigned_sign_ids, started_at, completed_at |
| `clips` | id, session_id, sign_id, r2_video_key, r2_landmark_key, frame_count, avg_fps, resolution, **quality_status**, quality_metrics (jsonb), created_at |
| `practice_attempts` | id, user_id, sign_id **(nullable)**, phrase_id **(nullable)**, score, predicted_label, confidence, model_version_id, created_at |
| `user_sign_progress` | user_id, sign_id, leitner_box, best_score, last_practiced_at |
| `model_versions` | id, semver, r2_key, **labels_hash**, metrics (jsonb), is_active, created_at |
| `processing_jobs` | id, clip_id, type, status, attempts, created_at |

Bảng `participants` **không có khoá ngoại tới `users`**. Người quay là hoàn toàn ẩn danh; kể cả thành viên nhóm cũng chỉ được ghi nhận bằng cờ `is_team_member`.

### 7.4 Bố cục lưu trữ R2

```
vsl-data/
├── clips/{participant_code}/{clip_id}.webm        # video dữ liệu thu thập
├── landmarks/{participant_code}/{clip_id}.bin     # Float32 nhị phân
├── reference/signs/{sign_id}.mp4                  # video mẫu cho chế độ Học
├── reference/phrases/{phrase_id}.mp4              # video mẫu cụm giao tiếp
└── models/{semver}/model.onnx + metrics.json      # phiên bản model
```

Thư mục `reference/` là thư mục **duy nhất** được phép đọc công khai (qua Cloudflare Pages hoặc presigned GET dài hạn), vì video mẫu cần phát cho mọi người học. Toàn bộ phần còn lại giữ riêng tư theo NFR-S06.

### 7.5 Triển khai

| Thành phần | Nơi đặt |
|---|---|
| Frontend | Cloudflare Pages (tĩnh, miễn phí, không ngủ đông) |
| Backend | **Azure for Students** (khuyến nghị) — $100 credit, đăng ký bằng email trường, không cần thẻ tín dụng, hiệu lực 12 tháng |
| Cơ sở dữ liệu | PostgreSQL cùng máy chủ backend |
| Object storage | Cloudflare R2 |

**Vì sao Azure chứ không phải Oracle Always Free.** Cả hai đều không ngủ đông theo kiểu 15 phút, nhưng chúng hỏng theo hai cách khác nhau, và cách của Oracle nguy hiểm hơn cho đồ án này:

| | Azure for Students | Oracle Cloud Always Free |
|---|---|---|
| Cách hỏng | Hết $100 credit | **Máy ảo bị thu hồi khi để trống quá lâu** — Oracle terminate instance sau ~7 ngày liên tục CPU/mạng/RAM dưới ngưỡng thấp |
| Rủi ro thực tế với đồ án | Thấp — 12 tuần dùng không hết $100 cho một VM nhỏ | **Cao** — backend đồ án nằm im giữa các đợt thu dữ liệu, đúng hồ sơ bị thu hồi |
| Hết hiệu lực | Sau 12 tháng | Vĩnh viễn, nếu không bị thu hồi |

Chọn Oracle vẫn được, nhưng phải có việc chạy định kỳ để máy không rơi vào trạng thái nhàn rỗi, và phải sao lưu cơ sở dữ liệu đều đặn.

> ⚠️ **Điều khoản gói miễn phí thay đổi liên tục.** Các con số trên phản ánh thông tin tra cứu tại thời điểm viết tài liệu và **phải được kiểm tra lại khi thực sự đăng ký** (tuần 1–2). Đừng lấy tài liệu này làm căn cứ cuối cùng cho quyết định hạ tầng.

Yêu cầu "không ngủ đông" không phải chuyện thẩm mỹ: nhiều gói miễn phí ngủ sau ~15 phút không hoạt động và mất gần một phút để tỉnh dậy. Tình nguyện viên mở link mời, thấy màn hình trắng 50 giây, sẽ đóng tab — và nhóm sẽ không bao giờ biết đã mất bao nhiêu người vì lý do đó.

---

## 8. Kiểm thử và tiêu chí nghiệm thu

| Mã | Loại kiểm thử | Nội dung |
|---|---|---|
| T-01 | Unit — Python | Từng phép trong chuỗi tiền xử lý, đối chiếu với cài đặt tham chiếu bằng NumPy |
| T-02 | **Golden test đầu-cuối** | 20 mẫu cố định chạy qua PyTorch và qua ONNX Runtime Web thật trong trình duyệt; sai lệch logits < 1e-3. Chạy trong CI |
| T-03 | Unit — logic kiểm chất lượng | Đưa chuỗi landmark giả (mất tay, quá ngắn, đứng yên) và khẳng định chúng bị từ chối đúng |
| T-04 | Unit — backend | Logic điều phối phân bổ, chấm điểm, chuyển bậc Leitner |
| T-05 | Integration — backend | Vòng đời clip từ presigned URL đến trạng thái cuối |
| T-06 | E2E — Playwright | Webcam giả bằng bộ ba cờ Chrome: `--use-fake-device-for-media-stream` · `--use-fake-ui-for-media-stream` · `--use-file-for-fake-video-capture=<file>.y4m`. **File phải là định dạng Y4M 4:2:0** — Chrome không nhận mp4/webm và không nhận Y4M 4:2:2. Chạy hết luồng Dịch và luồng đóng góp dữ liệu |
| T-07 | Hồi quy độ chính xác | Script đánh giá chạy trên tập test cố định, ghi kết quả ra file, so sánh giữa các lần huấn luyện |
| T-08 | Kiểm thử tải nhẹ | 5 người quay đồng thời, xác nhận hàng đợi tải lên không mất clip |

T-02 là bài kiểm thử quan trọng nhất trong toàn bộ dự án. Nó là thứ duy nhất chứng minh model chạy trên sân khấu giống hệt model đã đo trong notebook. Phải viết nó **ngay khi có model đầu tiên**, không đợi đến cuối.

---

## 9. Kế hoạch triển khai

### 9.1 Phân công

| Số người | Mảng phụ trách |
|---|---|
| 2 | Backend Spring Boot: auth, vocabulary, learning, collection, tích hợp R2 |
| 1–2 | Frontend React: MediaPipe, ONNX Runtime Web, chế độ Học và Dịch |
| 1 | Pipeline Python: dataset, huấn luyện, đánh giá, xuất ONNX |
| **Cả nhóm** | **Thu thập dữ liệu (tuần 4–6) — không ai đứng ngoài việc này** |

### 9.2 Lịch trình 12 tuần

| Tuần | Nội dung | Cột mốc |
|---|---|---|
| 1 | Chốt 50 ký hiệu + nguồn từ điển. Dựng monorepo. Spike: MediaPipe + ONNX Runtime Web chạy được model giả trong trình duyệt | Xác nhận công nghệ khả thi |
| 2 | Khung backend (Spring Boot + Postgres + R2 + auth). Khung frontend. Lược đồ CSDL | Đăng nhập chạy được |
| 3 | Recorder hoàn chỉnh (FR-C01…C05). Nhóm quay thử và sửa lỗi | **Recorder sẵn sàng** |
| 4 | Nhóm quay dữ liệu nòng cốt (2 buổi). Song song: pipeline dataset Python | ~2.000 clip |
| 5 | Mời tình nguyện viên đợt 1 (8–10 người). Module `learning`. Huấn luyện baseline trên dữ liệu nhóm | Baseline có số |
| 6 | Tình nguyện viên đợt 2 + người biết VSL. Chốt dataset. **Hoàn tất backend cho cụm giao tiếp** (bảng `phrases`, `phrase_signs`, endpoint) — phải xong TRƯỚC khi đóng băng | **Đóng băng phạm vi backend** · **Đóng dataset** |
| 7 | Huấn luyện 3 model, so sánh, chọn. Xuất ONNX + **golden test T-02** | Model được chọn |
| 8 | Tích hợp model vào frontend. Chế độ Dịch chạy thật | **Demo được lần đầu** |
| 9 | Chế độ Học đầy đủ (FR-B01…B05). Quản trị FR-D01, D02 | Sản phẩm đủ chức năng P0 |
| 10 | Cụm giao tiếp (FR-B08). Trang minh bạch dataset. Đánh giá đầy đủ, đo accuracy theo từng người | Có toàn bộ số liệu cho báo cáo |
| 11 | Tối ưu hiệu năng, sửa lỗi, viết báo cáo, **quay video demo dự phòng** | Báo cáo bản nháp |
| 12 | Đệm và tập bảo vệ | Nộp |

**Tuần 12 là đệm thật, không phải tuần làm việc.** Mọi đồ án đều trượt lịch; tuần này tồn tại để hấp thụ điều đó.

### 9.3 Hai cam kết cứng

**Đóng băng phạm vi backend từ cuối tuần 6.** Sau mốc này chỉ sửa lỗi, không thêm chức năng.

Hệ quả cần chú ý: FR-B08 nằm ở tuần 10 nhưng **phần backend của nó phải hoàn thành trong tuần 6**. Sau khi đóng băng, tuần 10 chỉ còn việc frontend và nhập nội dung cụm đã được xác nhận nguồn. Nếu tuần 6 chưa kịp dựng bảng `phrases`, coi như FR-B08 bị loại — không mở lại phạm vi backend để cứu một yêu cầu P1. Lý do: Spring Boot có sức hút riêng, làm mãi cũng ra việc, và nguy cơ thật là đến tuần 8 nhóm ngẩng lên thì `auth` đã có refresh token xoay vòng mà model vẫn là bản huấn luyện thử từ tuần 5. Phần AI mới là phần hội đồng chấm.

**Luôn có video demo ghi sẵn từ tuần 11.** Không phải để thay thế demo trực tiếp mà để tồn tại song song với nó.

---

## 10. Rủi ro và phương án dự phòng

| # | Rủi ro | Dấu hiệu sớm | Phương án |
|---|---|---|---|
| R-1 | **Không mời đủ người quay** | Đến hết tuần 5 có < 8 người ngoài | Cắt từ vựng xuống 30 ký hiệu, giữ nguyên số mẫu mỗi ký hiệu. Ghi rõ trong báo cáo |
| R-2 | **Model overfit vào nhóm** | Chênh lệch accuracy nhóm/người ngoài > 20 điểm | Đây là kết quả, không phải lỗi. Báo cáo thẳng kèm số liệu và phân tích nguyên nhân. Đã được thiết kế để đo từ đầu |
| R-3 | **Accuracy trên Test A < 70%** | Kết quả tuần 7 | Vẫn hoàn thiện sản phẩm. Chuyển trọng tâm báo cáo sang phân tích nguyên nhân: ký hiệu nào khó, vì sao, cần bao nhiêu dữ liệu nữa |
| R-4 | **Train/serve skew** | Golden test T-02 sai lệch lớn | Đã chặn bằng thiết kế (§5.1). T-02 phát hiện ngay tuần 7 chứ không phải trên sân khấu |
| R-5 | **Backend nuốt mất phần AI** | Tuần 8 mà model vẫn là bản thử | Đóng băng phạm vi backend từ tuần 6 (§9.3) |
| R-6 | **Máy tình nguyện viên quá yếu** | fps < 15 ở bước kiểm tra thiết bị | Recorder cảnh báo và ghi fps thực vào metadata; nội suy theo timestamp trong graph xử lý phần còn lại |
| R-7 | **Mất backend giữa kỳ** — hết credit (Azure) hoặc bị thu hồi máy ảo do nhàn rỗi (Oracle) | Cảnh báo từ nhà cung cấp; hoặc backend đột nhiên không phản hồi | Sao lưu Postgres định kỳ ra R2 ngay từ tuần 2. Với Oracle: thêm việc chạy định kỳ chống nhàn rỗi. Chế độ Dịch không phụ thuộc backend (NFR-U04) nên demo vẫn an toàn |
| R-8 | **Demo sân khấu hỏng** (camera, ánh sáng, wifi) | — | Chế độ Dịch chạy offline (NFR-U04) + video demo ghi sẵn (§9.3) |
| R-9 | **Giấy phép video mẫu** — QIPEDC không cho sao chép, và nhánh B lại buộc phải nhúng từ họ | Khảo sát điều khoản trong tuần 1 | Đã chọn tự quay làm phương án chính (§4.1.3) nên rủi ro chỉ còn ở nhánh B. Nếu cả sao chép lẫn nhúng đều không được phép, chế độ Học phải dùng mô tả bằng chữ và hình vẽ tĩnh thay cho video |
| R-10 | **Tình nguyện viên chỉ có iPhone** (Android đã được hỗ trợ qua FR-C07) | Tỉ lệ thoát ở màn hình cảnh báo iOS | Cho mượn laptop nhóm hoặc tổ chức buổi quay tập trung tại trường |
| R-11 | **Người tham gia thuộc nhiều biến thể vùng miền khác nhau** (§4.1.1) — hai người ký cùng một từ theo hai cách hoàn toàn khác | Ma trận nhầm lẫn cho thấy một ký hiệu có hai cụm tách biệt; hoặc `quality` báo quỹ đạo bất thường hàng loạt ở cùng một nhãn | Video mẫu là chuẩn chung nên phần lớn người bắt chước sẽ hội tụ. Với người thạo VSL, ghi `region` và phân tích riêng thay vì trộn chung |

**Về việc demo bằng thành viên nhóm:** nếu vì lý do sân khấu mà người demo là thành viên nhóm, phải nói rõ ngay lúc đó rằng người này có mặt trong tập huấn luyện, và độ chính xác trên người lạ thấp hơn — kèm con số cụ thể. Chủ động nêu điều này biến một điểm yếu tiềm tàng thành minh chứng cho sự nghiêm túc về phương pháp.

---

## 11. Hạn chế đã biết

Các hạn chế dưới đây **phải được nêu chủ động trong báo cáo và khi bảo vệ**, không đợi hội đồng hỏi.

**L-1. Hệ thống nhận dạng ký hiệu, không dịch câu.** VSL thật có hàng nghìn ký hiệu, cấu trúc ngữ pháp riêng, và dùng biểu cảm khuôn mặt cùng hướng thân người như thành phần mang nghĩa. Hệ thống này nhận dạng 50 ký hiệu rời rạc và nối thành chuỗi token — nó không dịch VSL.

Việc không làm dịch câu là quyết định có cơ sở, không phải cắt xén vì thiếu thời gian. Bốn rào cản kỹ thuật, xếp theo mức độ nghiêm trọng:

1. **Ngữ pháp VSL khác ngữ pháp tiếng Việt.** Ngôn ngữ ký hiệu có cú pháp riêng, thường đưa trạng ngữ thời gian lên đầu và tổ chức theo kiểu chủ đề–bình luận. Ghép các gloss theo đúng thứ tự nhận được sẽ cho ra câu tiếng Việt sai ngữ pháp. Muốn đúng phải thêm một tầng chuyển đổi cú pháp, tức là chồng thêm một bài toán dịch máy lên bài toán nhận dạng.
2. **Cần loại dữ liệu khác.** Nhận dạng câu liên tục cần clip cả câu gán nhãn theo chuỗi, huấn luyện bằng CTC hoặc seq2seq — một bộ dữ liệu thứ hai, thu từ đầu, lớn hơn nhiều.
3. **Coarticulation.** Khi ký liên tục, mỗi ký hiệu bị biến dạng bởi ký hiệu đứng trước và sau nó. Dữ liệu từ rời không chứa hiện tượng này.
4. **Phải do người ký thạo quay**, mà đó chính là nguồn nhóm hạn chế nhất.

**L-2. Người quay chủ yếu là người mới tập, không phải người khiếm thính.** Người thạo ký nhanh hơn, biên độ nhỏ hơn, mượt hơn, và các ký hiệu dính vào nhau (coarticulation). Vì vậy:

- Chế độ **Học** khớp đúng đối tượng — người dùng cũng là người mới tập, cũng đang bắt chước video, độ lệch phân bố gần bằng không.
- Chế độ **Dịch** thì không — nó được giới thiệu là để giao tiếp với người khiếm thính, mà đó lại là nhóm model ít được thấy nhất.

Test B (§5.6) tồn tại để **định lượng** khoảng cách này thay vì chỉ thừa nhận nó.

**L-3. Không xử lý biểu cảm khuôn mặt.** Trong ngôn ngữ ký hiệu, biểu cảm và cử động đầu là thành phần ngữ pháp (phân biệt câu hỏi với câu kể, mức độ, phủ định). Hệ thống bỏ qua hoàn toàn tầng thông tin này.

**L-4. Chấm điểm dựa trên bộ phân loại 51 lớp.** Model không có khái niệm "động tác này không phải ký hiệu nào cả" ngoài lớp `idle`, nên một động tác ngoài tập nhãn vẫn có thể nhận điểm cao. FR-B07 (DTW) khắc phục nếu kịp triển khai.

**L-5. Điều kiện quay bị giới hạn.** Toàn bộ dữ liệu quay bằng webcam, trong nhà, người ngồi đối diện camera, một người trong khung hình. Không đại diện cho điều kiện ngoài trời, ánh sáng ngược, góc nghiêng, hay nhiều người.

**L-6. Cỡ mẫu nhỏ theo chuẩn học thuật.** ~20 người là rất ít so với các bộ dữ liệu ngôn ngữ ký hiệu công bố quốc tế (thường hàng trăm người ký). Mọi con số nên được đọc như kết quả sơ bộ.

**L-7. Cụm giao tiếp được dạy ở dạng từ điển, không phải dạng nói tự nhiên.** Ký hiệu học rời là *dạng từ điển* (citation form) — làm chậm, rõ, đầy đủ, đứng độc lập. Trong hội thoại thật chúng bị rút gọn, nối liền và đổi vị trí trong không gian theo ngữ cảnh. Người học đi qua FR-B08 sẽ ký được cụm ở dạng ghép các từ điển lại, tương tự như đọc nối các từ phát âm rời — người bản ngữ hiểu được, nhưng đó không phải cách họ nói.

Hệ quả: sản phẩm là **bước khởi đầu, không phải giáo trình thay thế**. Giao diện chế độ Học phải hiển thị thường trực dòng: *"Ứng dụng dạy ký hiệu ở dạng từ điển. Để giao tiếp tự nhiên, hãy học thêm trực tiếp từ người khiếm thính hoặc giáo viên VSL."*

**L-8. Chỉ kiểm chứng trên một biến thể vùng miền.** Việt Nam có ba biến thể ký hiệu bản địa (Hà Nội, Hải Phòng, TP.HCM) chỉ trùng nhau **hơn 50% từ vựng cốt lõi**. Hệ thống dùng chuẩn quốc gia theo danh mục QIPEDC, nhưng chỉ thực sự được kiểm chứng trên biến thể của những người đã tham gia thu thập. Người Điếc ở vùng khác có thể ký nhiều từ theo cách hệ thống chưa từng thấy.

Đây là hạn chế cần nêu **trước** khi nói về giá trị xã hội của sản phẩm, không phải sau. Báo cáo phải ghi rõ vùng miền của toàn bộ người tham gia (trường `participants.region`).

**L-9. So sánh với các công bố khác cần thận trọng.** Đã có nghiên cứu nhận dạng VSL tại Việt Nam công bố độ chính xác trên 95%, thậm chí 98%. Trước khi đối chiếu, phải kiểm tra hai điều: **quy mô dữ liệu** (nhiều công bố dùng khoảng 1.000 clip, ít hơn bộ dữ liệu của đồ án này) và quan trọng hơn, **cách chia tập** — chia ngẫu nhiên theo clip cho ra con số cao hơn hẳn chia theo người (§5.6). Nếu bảng so sánh trong báo cáo không nêu được cách chia tập của từng công bố thì đó là bảng so sánh không có ý nghĩa, và nên nói rõ điều đó thay vì đặt các con số cạnh nhau.

---

## Phụ lục A — Danh sách 50 ký hiệu

**Quyết định: nhóm số đếm dừng ở 1–5.** Ba lý do, lý do thứ ba mới là lý do quyết định:

1. Số đếm là ký hiệu **tĩnh** và khá giống nhau về hình tay — chúng vừa dễ với model vừa ít hữu dụng trong hội thoại, nên chiếm 10 trong 50 chỗ là lãng phí.
2. Năm ký hiệu tĩnh đã đủ để chứng minh model xử lý được cả hai loại và để phân tích trong báo cáo.
3. **Trong VSL, số từ đặt sau danh từ**, ngược với tiếng Việt (§4.1.1, Phụ lục B). Nghĩa là muốn dùng số trong câu cho đúng thì phải xử lý một quy tắc ngữ pháp mà đồ án này cố ý không đụng tới. Giữ số đếm ở mức tối thiểu, dùng như ký hiệu độc lập, và **không đưa số vào cụm giao tiếp nào**.

| # | Nhóm | Ký hiệu | Loại |
|---|---|---|---|
| 1–10 | **Chào hỏi & xã giao** | xin chào · tạm biệt · cảm ơn · xin lỗi · làm ơn · vâng · không · tên · khỏe · hiểu | Động |
| 11–18 | **Đại từ & người thân** | tôi · bạn · bố · mẹ · anh · chị · em · gia đình | Động |
| 19–22 | **Từ để hỏi & tình thái** | gì · ở đâu · muốn · cần | Động |
| 23–27 | **Số đếm** | một · hai · ba · bốn · năm | Tĩnh |
| 28–37 | **Nhu cầu thiết yếu** | ăn · uống · nước · ngủ · giúp đỡ · đau · bệnh viện · nhà vệ sinh · tiền · đi | Động |
| 38–44 | **Cảm xúc & tính từ** | vui · buồn · mệt · đói · khát · tốt · thích | Động |
| 45–50 | **Thời gian** | hôm nay · ngày mai · hôm qua · sáng · chiều · tối | Động |
| — | **Lớp đặc biệt** | `idle` — không thực hiện ký hiệu nào | — |

**Nhóm "Từ để hỏi & tình thái" được thêm vào để phục vụ FR-B08.** Không có *gì*, *ở đâu*, *muốn*, *cần* thì hầu như không dựng được cụm giao tiếp nào có ích — người học chỉ liệt kê được danh từ mà không hỏi hay bày tỏ nhu cầu được. Bốn ký hiệu này thay cho *bạn bè* (đã có *bạn*), *xấu* (đã có *tốt*, ít dùng trong hội thoại cơ bản), *trưa* và *bây giờ* (đã có *hôm nay*).

Mỗi ký hiệu khi nhập vào bảng `signs` bắt buộc kèm `dictionary_source` trỏ tới mục tra cứu cụ thể trong từ điển VSL đã chọn.

---

## Phụ lục B — Cụm giao tiếp cơ bản (FR-B08)

**Bảng dưới liệt kê nội dung cụm và tập ký hiệu thành phần — cố ý KHÔNG ghi trật tự.**

Trật tự là thứ duy nhất phải do người thạo VSL cung cấp, và nó được lưu vào bảng `phrase_orders` (có thể nhiều trật tự hợp lệ cho cùng một cụm). Tài liệu này không đoán thay họ.

Ba dữ kiện ngôn ngữ học chi phối thiết kế phần này:

| Dữ kiện | Hệ quả |
|---|---|
| VSL (ít nhất là biến thể TP.HCM) dùng trật tự **chủ ngữ – tân ngữ – động từ (SOV)**, khác SVO của tiếng Việt nói | Không được lấy trật tự tiếng Việt làm mặc định. "Tôi uống nước" nhiều khả năng là `TÔI · NƯỚC · UỐNG` |
| **Số từ đặt sau danh từ**, ngược với tiếng Việt | Không đưa ký hiệu số vào cụm nào ở giai đoạn này |
| Trật tự **không hoàn toàn thống nhất** — cùng một nội dung có thể sắp xếp nhiều cách hợp lệ | Chấm điểm phải khoan dung với trật tự (xem FR-B08). Giới hạn cụm ở 3 ký hiệu để hạn chế số biến thể |

| # | Nội dung | Tập ký hiệu thành phần | Số ký hiệu | Tình huống dùng |
|---|---|---|---|---|
| 1 | Cảm ơn bạn | {CẢM ƠN, BẠN} | 2 | Xã giao |
| 2 | Nhà vệ sinh ở đâu? | {NHÀ VỆ SINH, Ở ĐÂU} | 2 | Hỏi đường |
| 3 | Bệnh viện ở đâu? | {BỆNH VIỆN, Ở ĐÂU} | 2 | Khẩn cấp |
| 4 | Tôi không hiểu | {TÔI, KHÔNG, HIỂU} | 3 | **Câu quan trọng nhất với người mới học** |
| 5 | Bạn tên gì? | {BẠN, TÊN, GÌ} | 3 | Làm quen |
| 6 | Bạn khỏe không? | {BẠN, KHỎE, KHÔNG} | 3 | Mở đầu hội thoại |
| 7 | Tôi cần giúp đỡ | {TÔI, CẦN, GIÚP ĐỠ} | 3 | Khẩn cấp |
| 8 | Tôi uống nước | {TÔI, NƯỚC, UỐNG} | 3 | Bày tỏ nhu cầu |

Nhóm nên bắt đầu từ bốn cụm hai ký hiệu và cụm số 4 — chúng ngắn nhất, ít biến thể trật tự nhất, và có giá trị sử dụng cao nhất. Bốn cụm còn lại làm sau nếu kịp.

**Không được đưa bất kỳ dòng nào vào sản phẩm trước khi có ít nhất một trật tự được người thạo VSL xác nhận.** Cụm nào không xác nhận được thì loại bỏ, không tự suy luận.

**Điều kiện triển khai:**

| Yêu cầu | Ghi chú |
|---|---|
| Mọi ký hiệu thành phần nằm trong 50 ký hiệu | Đã thoả với danh sách trên |
| Có video mẫu của **cả cụm** | Ưu tiên lấy từ từ điển. Nếu từ điển chỉ có ký hiệu rời, **nhờ 2–3 người thạo VSL quay mẫu cụm** — mất ~10 phút và cho video mẫu xác thực hơn hẳn |
| Ghi `dictionary_source` và `verified_by` cho từng cụm | Bắt buộc theo §4.1.1 |
| Không thêm lớp cho model, không thu thêm dữ liệu | Chấm bằng bộ giải mã chuỗi có sẵn ở FR-A02 |

Việc nhờ người thạo VSL quay mẫu cụm còn có lợi phụ: nó cho 2–3 người đó một vai trò thực chất trong dự án ngoài việc cung cấp dữ liệu Test B, và làm phần "có tham vấn người trong cộng đồng" trong báo cáo trở nên có thật thay vì hình thức.

---

## Các quyết định đã chốt

Tài liệu này không còn điểm bỏ ngỏ. Tám quyết định dưới đây đã được đưa ra và ghi vào các chương tương ứng; thay đổi chúng là thay đổi thiết kế, không phải điền vào chỗ trống.

| # | Quyết định | Nơi ghi | Lý do quyết định |
|---|---|---|---|
| 1 | **Biến thể vùng miền: chuẩn quốc gia theo danh mục QIPEDC**, ghi `region` cho mọi người tham gia | §4.1.1 | Ba biến thể VSL chỉ trùng nhau hơn 50% từ vựng cốt lõi. Không chốt thì model hỏng theo cách rất khó chẩn đoán |
| 2 | **Từ điển nguồn: QIPEDC** (`qipedc.moet.gov.vn/dictionary`), đối chiếu phụ `nnkh.thaiphong.net` | §1.4 | Bộ GD&ĐT quản lý, ~4.000 từ có video, thu từ ba miền, có căn cứ pháp lý là Thông tư 17/2020/TT-BGDĐT |
| 3 | **Video mẫu: tự quay với người thạo VSL**, đối chiếu QIPEDC | §4.1.3 | Giải quyết cùng lúc bản quyền, tính xác thực, video cụm, nhất quán vùng miền, và khả năng chạy offline |
| 4 | **Số đếm dừng ở 1–5** | Phụ lục A | Ký hiệu tĩnh, gần giống nhau, ít dùng trong hội thoại — và trong VSL số từ đặt sau danh từ, một quy tắc đồ án cố ý không đụng tới |
| 5 | **Trật tự cụm: không mã hoá cứng.** Lưu nhiều trật tự hợp lệ, chấm khoan dung 80% thành phần / 20% trật tự | FR-B08, Phụ lục B, bảng `phrase_orders` | Trật tự VSL không hoàn toàn thống nhất; chấm theo một trật tự duy nhất sẽ đánh trượt người ký đúng |
| 6 | **Recorder hỗ trợ Chrome/Android** (FR-C07), bắt buộc dựng máy cố định. iOS không hỗ trợ | §3.3, C-03 | Số người mời được quyết định chất lượng dataset, mà nhiều tình nguyện viên chỉ có điện thoại |
| 7 | **Backend đặt tại Azure for Students** | §7.5 | Oracle Always Free thu hồi máy ảo khi nhàn rỗi — đúng hồ sơ của một backend đồ án |
| 8 | **Người thạo VSL: nhánh quyết định có hạn chót hết tuần 4** | §2.6 | Ba hạng mục cùng phụ thuộc vào nó. Có hạn chót và hai nhánh rõ ràng thì không hạng mục nào bị treo |

## Mốc kiểm chứng bắt buộc

Đây là những việc **phải đi xác minh**, không phải quyết định. Chúng có thể bác bỏ giả định và buộc đổi kế hoạch, nên phải làm sớm.

| Tuần | Việc | Nếu kết quả xấu |
|---|---|---|
| 1 | Tra thử **cả 50 ký hiệu** trên QIPEDC, xác nhận có video (A-03) | Thay ký hiệu không tra được bằng ký hiệu khác cùng nhóm, giữ tổng số 50 |
| 1 | Bắt đầu liên hệ tìm người thạo VSL (§2.6) — việc chờ lâu nhất dự án | Theo dõi tới hạn chót tuần 4 rồi rẽ nhánh B |
| 1 | Spike MediaPipe trên web: Hand + Pose chạy song song đạt bao nhiêu fps; `HolisticLandmarker` có trong gói web không (C-06) | Giảm độ phân giải đầu vào cho MediaPipe, hoặc hạ ngưỡng fps ở FR-C03 |
| 1–2 | Đăng ký Azure for Students và **kiểm tra lại điều khoản gói miễn phí tại thời điểm đó** (§7.5) | Chuyển sang Oracle kèm việc chạy định kỳ chống nhàn rỗi |
| 2 | Xác nhận `onnxruntime-web` đang dùng hỗ trợ opset dự định (AI-E01) | Hạ opset khi xuất model |
| 2 | Thử `MediaRecorder` trên vài máy Android thật, xác nhận chuỗi lùi codec (FR-C07) | Ghi ở VP8 hoặc H.264 cho toàn bộ thiết bị di động |
| **4** | **Chốt nhánh A hay B** (§2.6) | Không có "chờ thêm" — quá hạn là mặc định rẽ nhánh B |
