# Feature Specification: Core Labels & Generator Pipeline

**Feature Branch**: `002-featurename-labels-pipeline`  
**Created**: 2026-08-18  
**Status**: Draft  
**Owner**: AI Agent (Antigravity / Codex)  
**Input**: User description: "Spec 01: Core Labels & Generator Pipeline (spec-01-labels-pipeline.md) - Formal Spec"  

---

## 1. Context & Goal *(mandatory)*

- **Business Context**: Trong hệ thống AI nhận dạng Ngôn ngữ Ký hiệu Việt Nam (VSL), sự sai lệch thứ tự index hoặc số lượng nhãn giữa mô hình huấn luyện (Python/PyTorch) và thành phần suy luận trên trình duyệt (Frontend JS/TS + ONNX Runtime Web) sẽ dẫn đến việc nhận dạng sai hoàn toàn ký hiệu hoặc gây ra đổ vỡ runtime hệ thống. Do đó, cần có giải pháp duy nhất làm nguồn sự thật (Single Source of Truth) kết hợp với cơ chế xác thực toàn vẹn bằng mã hash cryptographic.
- **Feature Goal**: Xây dựng `shared/labels.json` chứa chính xác 51 lớp VSL (50 ký hiệu + 1 lớp `idle`), phát triển bộ công cụ tự động sinh code TypeScript/Python tương ứng, và tích hợp kiểm tra mã hash (MD5/SHA256) tại cả PyTorch ONNX graph export và ONNX Runtime Web client initialization.
- **Success Metrics**: 
  - 100% mã nguồn Frontend (`labels.ts`) và AI Pipeline (`labels.py`) được sinh tự động từ `shared/labels.json` không qua chỉnh sửa thủ công.
  - Zero Training/Serving Skew liên quan đến nhãn: Thời gian phát hiện lỗi lệch hash nhãn tại client < 10ms trong giai đoạn khởi tạo mô hình.
  - 0% sự cố không tương thích index giữa PyTorch model và ONNX Runtime Web.
- **Technical Context**: 
  - File định dạng JSON: `shared/labels.json`.
  - Generator script: Python script (`scripts/generate_labels.py`).
  - Target sinh mã: `frontend/src/generated/labels.ts` và `ai_pipeline/generated/labels.py`.
  - Client Runtime: ONNX Runtime Web kết hợp MediaPipe Tasks Vision.

---

## 2. Actors & Roles *(mandatory)*

| Actor | Description | Permissions |
|---|---|---|
| AI Developer / Engineer | Kỹ sư AI cập nhật hoặc thay đổi từ điển danh sách nhãn VSL | Được phép chỉnh sửa `shared/labels.json` và chạy script tự động sinh code |
| Generator Script | Tiến trình tự động hóa kiểm tra tính hợp lệ và xuất code nguồn `labels.ts`, `labels.py` | Quyền đọc `shared/labels.json` và ghi đè các file generated |
| Client ONNX Engine | Trình duyệt Client tải mô hình ONNX và khởi tạo ONNX Runtime Web | Quyền đọc metadata của model ONNX, đối chiếu hash với `labels.ts` và từ chối chạy nếu hash mismatch |
| Backend Server | Service Spring Boot Monolith | Khởi tạo thông tin tĩnh nếu cần, không tham gia suy luận AI |

**Actors Out of Scope**: 
- Người dùng cuối (End-User): Không có quyền can thiệp hay thay đổi danh sách nhãn.

---

## 3. Functional Requirements (EARS Notation) *(mandatory)*

### 3.1 Core Logic & Behavior
- **FR-001 (Ubiquitous)**: THE system SHALL maintain `shared/labels.json` as the Single Source of Truth for all 51 class labels (50 VSL sign classes + 1 `idle` class).
- **FR-002 (Ubiquitous)**: THE system SHALL auto-generate `labels.ts` for Frontend and `labels.py` for AI Pipeline from `shared/labels.json` using the generator script.
- **FR-003 (Event-driven)**: WHEN the label generator script is executed, THE system SHALL compute the cryptographic hash (SHA256 and MD5) of `shared/labels.json` and embed it into the generated TypeScript and Python artifacts.
- **FR-004 (Event-driven)**: WHEN exporting the PyTorch model to ONNX format (Opset 17), THE system SHALL embed the label hash string into the ONNX model graph metadata props.
- **FR-005 (State-driven)**: WHILE parsing `shared/labels.json`, THE system SHALL enforce that the class array contains exactly 51 unique entries and that the `idle` class is located at index 0.

### 3.2 Error Handling & Edge Cases (Unwanted Patterns) *(Mandatory >= 30% of total FRs)*
- **FR-006 (Unwanted)**: WHERE the label hash in ONNX model metadata does not match the embedded hash in `labels.ts`, THE client SHALL reject model initialization and output a detailed error log.
- **FR-007 (Unwanted)**: WHERE `shared/labels.json` contains duplicate label names, non-sequential indices, or missing required fields, THE generator script SHALL abort execution with code non-zero and display validation errors.
- **FR-008 (Unwanted)**: WHERE `shared/labels.json` contains total classes count not equal to 51, THE generator script SHALL terminate execution immediately and flag a structural validation failure.
- **FR-009 (Unwanted)**: WHERE generated files (`labels.ts` or `labels.py`) undergo manual modifications without updating `shared/labels.json`, THE build/CI pipeline SHALL detect dirty generated files and fail the build step.

---

## 4. Non-Functional Requirements *(mandatory)*

- **NFR-001 (Performance)**: Thời gian thực thi của generator script < 1000ms. Thời gian kiểm tra hash tại Client ONNX Engine < 10ms.
- **NFR-002 (Security)**: Mã SHA256/MD5 hash của file `shared/labels.json` phải được tính toán từ nội dung định dạng chuẩn hóa (normalized UTF-8, deterministically sorted/formatted JSON) để đảm bảo không bị ảnh hưởng bởi line endings (LF/CRLF).
- **NFR-003 (Resource Envelope)**: Dung lượng file `labels.json`, `labels.ts` và `labels.py` không quá 50KB mỗi file.

---

## 5. Data Model & Schema *(mandatory)*

- **Entity / DTO**: `LabelSchema` (`shared/labels.json`)
- **Fields & Constraints**:
  - `version`: `string`, Required (Semantic versioning, e.g. "1.0.0")
  - `sha256`: `string`, Auto-generated hex string (64 characters)
  - `md5`: `string`, Auto-generated hex string (32 characters)
  - `total_classes`: `integer`, Must be strictly equal to 51
  - `labels`: `Array<LabelItem>`, Must have length 51
    - `id`: `integer` (0 to 50, 0 reserved for `idle`)
    - `code`: `string` (unique slug, e.g., "idle", "xin_chao")
    - `display_name_vi`: `string` (Tên hiển thị tiếng Việt)
    - `dictionary_source`: `string` (Nguồn từ điển xác minh, e.g., "QIPEDC")

---

## 6. Acceptance Criteria (Given-When-Then BDD) *(mandatory)*

- [ ] **AC-001**: **Given** file `shared/labels.json` hợp lệ chứa 51 lớp, **When** chạy generator script, **Then** hệ thống sinh thành công `labels.ts` và `labels.py` chứa đầy đủ 51 lớp cùng mã SHA256/MD5 hash chính xác.
- [ ] **AC-002**: **Given** file `shared/labels.json` bị chỉnh sửa dẫn đến sai lệch hash, **When** ONNX Runtime Web khởi tạo mô hình ONNX cũ có hash không khớp với `labels.ts`, **Then** client phải ngay lập tức ném ngoại lệ (reject initialization) và hủy luồng suy luận AI.
- [ ] **AC-003**: **Given** file `shared/labels.json` bị sửa đổi có 50 hoặc 52 lớp (khác 51 lớp) hoặc thiếu lớp `idle` ở vị trí index 0, **When** chạy generator script, **Then** script lập tức dừng lại với mã lỗi non-zero và hiển thị chi tiết nguyên nhân lỗi.
- [ ] **AC-004**: **Given** luồng CI/CD build project, **When** người dùng tự ý sửa file `labels.ts` hoặc `labels.py` thủ công, **Then** bước kiểm tra toàn vẹn phát hiện sự khác biệt và báo lỗi build.

---

## 7. Out of Scope *(mandatory)*

- **OOS-001**: Không thực hiện huấn luyện mô hình PyTorch trong phạm vi Spec này.
- **OOS-002**: Không tạo giao diện UI quản lý danh sách nhãn động trên Web Admin.
- **Boundary Constraints for AI Agent**:
  - KHÔNG mở bất kỳ endpoint `/predict` nào trên Spring Boot Backend.
  - KHÔNG thay đổi vị trí index 0 (`idle`) của danh sách nhãn.

---

## 8. Open Questions & Assumptions

- **Assumptions**: 
  - `shared/labels.json` được định dạng UTF-8 chuẩn.
  - Mọi môi trường phát triển (Windows, Linux, macOS) đều đồng bộ xuống dòng dạng LF trước khi tính toán mã hash để tránh lỗi mã hóa CRLF trên Windows.
- **Open Questions**: Không có. Spec đã được làm rõ hoàn toàn dựa trên yêu cầu cốt lõi và Hiến pháp dự án.

