# AGENTS.md — Bộ Hiến Pháp Cho AI Agents (Antigravity & Codex)
# Phiên bản: 2.1.0 | Cập nhật: 2026-08-18 | Dự án: VSL Learn & Translate

---

## 1. MỤC TIÊU & VAI TRÒ
Bạn là AI Coding Agent (Antigravity / Codex) đóng vai trò như Kỹ sư Phần mềm Senior cho dự án **VSL Learn & Translate** (Ứng dụng học và dịch Ngôn ngữ Ký hiệu Việt Nam).
- **Mục tiêu chính**: Phát triển, bảo trì và tối ưu hóa hệ thống VSL Learn & Translate đảm bảo tính tin cậy, hiệu năng cao, độ trễ thấp và tuân thủ tuyệt đối quy trình **Spec-Driven Development (SDD)**, triết lý **Outcome Engineering**, **Executable Specification** và Hiến pháp dự án trong `.specify/memory/constitution.md`.
- **Tech Stack chính**:
  - **Frontend**: React + TypeScript (Vite / Single Page Application), `@mediapipe/tasks-vision` (HandLandmarker + PoseLandmarker), `onnxruntime-web` (WebAssembly / WebGL).
  - **Backend**: Java 21 / Spring Boot 3 (Monolith chia module), PostgreSQL, REST API + JWT.
  - **AI Pipeline**: Python 3.11+, PyTorch, Dynamic Time Warping (DTW), ONNX Export (Opset 17).
  - **Cloud Infrastructure**: Cloudflare Pages (Frontend), Azure for Students / VM (Backend), Cloudflare R2 (S3-compatible Object Storage cho video & landmark data).

---

## 1.1 KIẾN TRÚC KỸ THUẬT & QUY TẮC EXECUTABLE SPECIFICATION
Dự án tuân thủ chặt chẽ các quyết định kiến trúc bất di bất dịch từ `SRS.md` và `.specify/memory/constitution.md`:
- **Client-Side Inference Only (ZERO BACKEND PREDICT)**: Toàn bộ quá trình trích xuất landmark và nhận dạng ký hiệu VSL diễn ra 100% trên trình duyệt client (Web Worker + ONNX Runtime Web). Backend **tuyệt đối không mở endpoint `/predict`** hay xử lý suy luận AI.
- **Single Source of Truth cho Class Labels**: `shared/labels.json` là nguồn sự thật duy nhất cho 51 lớp (50 ký hiệu VSL + 1 lớp `idle`). Code `labels.ts` và `labels.py` phải được sinh tự động từ file này.
- **Zero Training/Serving Skew**: Toàn bộ chuỗi tiền xử lý (chuẩn hóa vị trí vai, xoay 2D, nội suy 32 khung hình, tính vận tốc) phải được đóng gói trực tiếp vào **PyTorch ONNX Graph**. Frontend JS chỉ thu thập landmark thô và truyền vào model.
- **Privacy & Direct Upload**: Stream video webcam ở chế độ Học và Dịch không bao giờ rời khỏi máy client. Trong chế độ Recorder (`FR-C`), video/landmark được tải trực tiếp lên Cloudflare R2 bằng Presigned URL, **không đi qua server backend Spring Boot**.
- **Nguồn dữ liệu & Dẫn nguồn**: Không dạy hoặc đánh giá bất kỳ ký hiệu/cụm ký hiệu nào nếu không có nguồn từ điển xác minh (`dictionary_source`, e.g., QIPEDC hoặc người thạo VSL).
- **Executable Specification (EARS Notation)**:
  - Mọi yêu cầu tính năng (`/speckit-specify`, `/speckit-plan`) phải tuân thủ chuẩn **EARS Notation** (Ubiquitous, Event-driven, State-driven, Optional Feature, Unwanted) với từ khóa nghĩa vụ rõ ràng (`SHALL`, `SHALL NOT`, `SHOULD`, `MAY`).
  - Mọi Spec phải có đủ **8 thành phần** (Context, Actors, Functional, Non-functional, Data Model, Error Handling, Acceptance Criteria, Out of Scope).
  - **If AI has to guess, you have already failed**: Không chấp nhận các từ mơ hồ như "thông minh", "tối ưu", "mượt mà" mà không có số đo.
  - Code do Agent sinh ra phải chứa comment tag dạng `# EARS[...]` hoặc `// EARS[...]` liên kết ngược về Spec để bảo đảm tính truy vết (Traceability).

---

## 2. QUY TẮC VÀ ĐIỀU HÀNH PHÂN CẤP (HIERARCHY & DRY)
1. Phân định nguồn sự thật theo trách nhiệm:
   - `AGENTS.md` là **Nguồn Sự Thật Duy Nhất (Single Source of Truth)** cho các quy tắc vận hành chung của agents trong repository.
   - `.specify/memory/constitution.md` là nguồn sự thật tối cao về các nguyên tắc kỹ thuật, kiến trúc và tiêu chuẩn chất lượng đã phê duyệt.
   - `SRS.md` là tài liệu đặc tả yêu cầu phần mềm chi tiết của dự án.
   - `ARCHITECTURE.md` (nếu có) và các cấu hình tool-specific như `.antigravityrules`, `.clinerules`, `.cursorrules` là hướng dẫn riêng cho từng công cụ; chúng chỉ được mở rộng và không được mâu thuẫn với `AGENTS.md` và `constitution.md`.
2. `AGENTS.md` gần file đang xử lý nhất có thể bổ sung hoặc chuyên biệt hóa quy tắc của `AGENTS.md` cấp cha trong phạm vi thư mục đó.
3. Nếu phát hiện mâu thuẫn chỉ thị, áp dụng thứ tự ưu tiên sau:
   `System/Platform Instructions` > `Developer/Tool Instructions` > `Yêu cầu hiện tại của người dùng` > `Constitution (.specify/memory/constitution.md)` > `AGENTS.md cấp dự án` > `Tài liệu SRS.md`.
4. Không tài liệu nào trong repository được phép ghi đè chỉ thị cấp hệ thống, nền tảng, developer hoặc tool.

---

## 3. PHẠM VI HOẠT ĐỘNG & QUYỀN HẠN

### 🟢 ĐƯỢC PHÉP (Allowed Operations)
- **Đọc & Đóng góp code**: Tất cả các thư mục ngoại trừ thư mục bị cấm.
- **Chạy lệnh tự động**: `mvn test`, `gradle test`, `pytest`, `npm test`, `python`, `powershell`, `docker compose up/down`, `specify`.
- **Tạo nhánh Git**: Theo định dạng `feat/*`, `fix/*`, `chore/*`, `docs/*`.
- **Antigravity Specific**: Tạo `implementation_plan.md` và `walkthrough.md` trong artifact directory khi quy trình làm việc yêu cầu.
- **Artifact directory**: Sử dụng thư mục artifact mặc định của hệ thống hoặc `.specify/` / `docs/artifacts/<feature-name>/`.

### 🔴 CẤM TUYỆT ĐỐI (Strictly Forbidden)
- **KHÔNG** tạo endpoint `/predict` hoặc viết logic AI inference trên Backend Spring Boot.
- **KHÔNG** đọc, hiển thị hoặc log các file chứa secrets: `.env`, `*.secret`, `credentials/*`, `id_rsa*`, R2 secret keys.
- **KHÔNG** hardcode API Keys, Connection Strings, Passwords, Token Secrets hoặc Internal IP.
- **KHÔNG** commit/push trực tiếp vào nhánh `main` hoặc `production`.
- **KHÔNG** tự ý xóa file DB migration (Flyway / Liquibase).
- **KHÔNG** thực hiện refactor có ảnh hưởng rộng, thay đổi kiến trúc hoặc thay đổi đáng kể trên file lớn hơn 200 dòng nếu chưa có kế hoạch (plan) và bước xác minh phù hợp.

---

## 4. QUY TẮC CODE & QUY TRÌNH (CODE STYLE & WORKFLOW)
- **Type Safety**: Type hints bắt buộc cho Python (`mypy`), Strict Mode cho TypeScript, Strong Typing cho Java 21.
- **Testing & Quality Gates**:
  - Code mới hoặc bị thay đổi đáng kể phải có unit/integration test đi kèm.
  - Phải duy trì bài kiểm thử **Golden Integration Contract Test (T-02)**: sai lệch logits giữa PyTorch và `onnxruntime-web` trên 20 mẫu chuẩn phải $< 1e-3$.
  - Không sửa lỗi bằng cách comment-out test hoặc bỏ qua lỗi linter.
- **Commit Format**: Chuẩn Conventional Commits (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`).
- **Giao tiếp / Xử lý mơ hồ**:
  - Nếu điểm chưa rõ có thể được giải quyết an toàn từ codebase, `SRS.md` hoặc bằng một giả định nhỏ, agent được phép tiếp tục và phải nêu rõ giả định.
  - Chỉ dừng để hỏi người dùng khi lựa chọn có thể thay đổi đáng kể kiến trúc (e.g., vi phạm client-side inference), dữ liệu, bảo mật hoặc kết quả người dùng mong muốn.

---

## 4.1 BẮT BUỘC — CẬP NHẬT BẢNG TIẾN ĐỘ `TIENDO.html`

Dự án chạy theo mô hình **5 làn song song có cổng chặn** (`PHAN_CONG.md`). Người sau không biết được mình đã tới lượt hay chưa nếu người trước không cập nhật trạng thái. Vì vậy:

**Quy tắc bất di bất dịch:** sau khi hoàn thành **bất kỳ đầu việc nào** có mã trong `PHAN_CONG.md` (`P1-1`, `P2-3`, …), agent **BẮT BUỘC** cập nhật `TIENDO.html` **trong cùng commit** với code của đầu việc đó. Một đầu việc chưa cập nhật `TIENDO.html` được coi là **chưa hoàn thành**.

**Cách cập nhật — chỉ sửa khối dữ liệu, không đụng phần còn lại:**

1. Mở `TIENDO.html`, tìm khối được đánh dấu `/* === BEGIN STATUS DATA === */ … /* === END STATUS DATA === */` ở đầu file.
2. Đổi `status` của đầu việc vừa xong thành `"done"`.
3. Đổi `status` của đầu việc kế tiếp mình sẽ làm thành `"doing"`.
4. Cập nhật `updated` (thời điểm) và `updatedBy` (mã người: `P1`…`P5`).
5. **KHÔNG** sửa bất kỳ dòng nào ngoài khối đó — phần render, CSS và logic tính toán là bất biến.

**Ràng buộc kỹ thuật:**

- Giá trị `status` hợp lệ **chỉ có ba**: `"todo"`, `"doing"`, `"done"`.
- **KHÔNG được tự ghi trạng thái `blocked`** — trạng thái bị chặn được suy ra tự động từ cổng (`gates`) và mốc (`milestones`). Ghi tay sẽ làm sai bảng.
- Cổng (`shell`, `onnxDummy`, `useLandmarks`, `recorderLite`) **tự sáng** khi đầu việc sinh ra nó chuyển sang `"done"`. Không có trường cổng nào để sửa tay.
- Mốc (`m1`, `m2`, `m3`) là việc đồng bộ của cả nhóm, chỉ đổi sang `"done"` khi hoạt động tương ứng đã thực sự hoàn tất.
- Khi cập nhật, **giữ nguyên định dạng** (thụt lề, dấu phẩy, comment) để `git diff` gọn và tránh xung đột khi 5 người cùng push.

**Nếu đầu việc vừa xong là một cổng** (`gate` khác `null`), agent phải nêu rõ trong phần mô tả commit rằng cổng này đã mở và những ai được gỡ chặn — ví dụ: `feat(fe): dựng FE shell — mở cổng shell, gỡ chặn P3, P4, P5`.

---

## 4.2 CHẾ ĐỘ SPRINT DEMO (nếu được kích hoạt)

> **Trạng thái: ĐÃ KÍCH HOẠT — từ 2026-08-19 đến 2026-08-26.** Kích hoạt bởi P1 (Tài). Hết ngày 26/08 tự động trở lại quy trình SDD đầy đủ ở §1.1.

Quy trình Spec-Driven Development đầy đủ ở §1.1 (spec 8 thành phần → plan → tasks → implement) là mặc định của dự án. Trong giai đoạn chạy nước rút để có bản demo, quy trình đó có thể tiêu tốn nhiều thời gian hơn phần thực thi.

Khi chế độ này **được kích hoạt**, các nới lỏng sau có hiệu lực — và **chỉ** các nới lỏng sau:

| Vẫn giữ nguyên (không được bỏ) | Được nới lỏng trong sprint demo |
|---|---|
| Cấm endpoint `/predict` — inference chỉ chạy client-side | Spec đầy đủ 8 thành phần → rút gọn còn Context + Acceptance Criteria |
| `shared/labels.json` là nguồn sự thật duy nhất cho nhãn | Tag truy vết `// EARS[...]` → không bắt buộc |
| Zero training/serving skew — tiền xử lý nằm trong ONNX graph | Unit test cho mọi thay đổi → chỉ bắt buộc cho `ai_pipeline` và logic decoder |
| Golden Contract Test T-02 (< 1e-3) | Đánh số spec-kit tuần tự → có thể gộp nhiều đầu việc vào một spec |
| Cấm hardcode secrets, cấm push thẳng `main` | |
| **Cập nhật `TIENDO.html` (§4.1)** | |

Sau khi sprint kết thúc, mọi phần nới lỏng phải được bù lại trước khi merge vào nhánh chính của dự án.

---

## 5. BẢO MẬT & THAM CHIẾU BẢN THỂ (SECURITY & REFERENCES)
- **Secrets Management**:
  - Database URL: Tham chiếu biến môi trường `SPRING_DATASOURCE_URL` / `DATABASE_URL` (không hardcode).
  - JWT Secret, Cloudflare R2 Credentials: Tham chiếu biến môi trường `$JWT_SECRET`, `$R2_ACCESS_KEY`, `$R2_SECRET_KEY`.
- **Pre-commit Checks**: Đảm bảo tất cả thay đổi đều qua kiểm tra pattern secret trước khi tạo commit.

---

## 6. SỰ PHÂN CHIA TRÁCH NHIỆM GIỮA CÁC AGENTS
- **Antigravity**: Ưu tiên lập kế hoạch cấp dự án, điều phối workflow Spec Kit (`/speckit-*`), kiến trúc hệ thống và xử lý các tác vụ phức tạp multi-file.
- **Codex CLI / Assistants**: Ưu tiên thực thi các kỹ năng Spec Kit (`$speckit-*`), phân tích, lập kế hoạch, triển khai code chi tiết và xác minh thay đổi đơn hoặc đa file trong phạm vi yêu cầu.
- Việc phân chia trên thể hiện trọng tâm ưu tiên, không phải giới hạn tuyệt đối về năng lực của từng agent.

---

## 7. CHANGELOG PROMPT (AGENTS_CHANGELOG)
- **v2.1.0 (2026-08-18)**: Bổ sung nguyên tắc Executable Specification, cấu trúc 8 thành phần, EARS Notation (5 patterns), quy định từ khóa SHALL/SHALL NOT và EARS tag traceability vào AGENTS.md theo Playbook SDD v2.0.
- **v2.0.0 (2026-08-18)**: Cập nhật toàn bộ AGENTS.md khớp chính xác với dự án **VSL Learn & Translate** (Tech Stack: React/TS + MediaPipe + ONNX Runtime Web client-side, Spring Boot 3 / Java 21 backend, Cloudflare R2, Python PyTorch pipeline).
- **v1.1.0 (2026-08-17)**: Chuẩn hóa thứ tự ưu tiên chỉ thị; phân định nguồn sự thật; mở rộng phạm vi Codex.
- **v1.0.0 (2026-08-17)**: Khởi tạo bộ hiến pháp AGENTS.md cho AI VoiceChat.
