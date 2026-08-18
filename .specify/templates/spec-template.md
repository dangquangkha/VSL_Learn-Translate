# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Owner**: [OWNER]  
**Input**: User description: "$ARGUMENTS"  

---

## 1. Context & Goal *(mandatory)*

- **Business Context**: [Tại sao tính năng này cần tồn tại? Người dùng gặp vấn đề gì?]
- **Feature Goal**: [Mục tiêu cụ thể của tính năng là gì?]
- **Success Metrics**: [Đo lường sự thành công bằng chỉ số cụ thể, ví dụ: P95 latency < 50ms, giảm error rate 80%]
- **Technical Context**: [Tech stack, service liên quan, dependencies]

---

## 2. Actors & Roles *(mandatory)*

| Actor | Description | Permissions |
|---|---|---|
| [User / Role 1] | [Mô tả actor] | [Quyền hạn chi tiết] |
| [System / Service] | [Automated background processes] | [Quyền ghi log, trigger job...] |

**Actors Out of Scope**: [Các role không thuộc phạm vi xử lý]

---

## 3. Functional Requirements (EARS Notation) *(mandatory)*

*Mọi yêu cầu chức năng phải được viết theo đúng 5 mẫu EARS (Ubiquitous, Event-driven, State-driven, Optional Feature, Unwanted) và sử dụng từ khóa nghĩa vụ (`SHALL`, `SHALL NOT`, `SHOULD`, `MAY`).*

### 3.1 Core Logic & Behavior
- **FR-001 (Ubiquitous)**: THE system SHALL [Hành vi nền tảng luôn áp dụng].
- **FR-002 (Event-driven)**: WHEN [sự kiện xảy ra], THE system SHALL [hành vi xử lý].
- **FR-003 (State-driven)**: WHILE [trạng thái tồn tại], THE system SHALL [hành vi duy trì].
- **FR-004 (Optional Feature)**: WHERE [feature/condition được bật], THE system SHALL [hành vi tương ứng].

### 3.2 Error Handling & Edge Cases (Unwanted Patterns) *(Mandatory $\ge 30\%$ of total FRs)*
- **FR-005 (Unwanted)**: WHERE [lỗi/điều không mong muốn 1 xảy ra], THE system SHALL [hành vi khắc phục, log và phản hồi].
- **FR-006 (Unwanted)**: WHERE [lỗi/điều không mong muốn 2 xảy ra], THE system SHALL [hành vi khắc phục, log và phản hồi].

---

## 4. Non-Functional Requirements *(mandatory)*

*Phải có số đo cụ thể. Tuyệt đối KHÔNG dùng các từ mơ hồ như "mượt mà", "nhanh", "tối ưu".*

- **NFR-001 (Performance)**: P95 response time < [X] ms, throughput $\ge$ [Y] rps.
- **NFR-002 (Security)**: Password hash bcrypt cost factor = 12, presigned URL expiry = 15 phút.
- **NFR-003 (Resource Envelope)**: Model size < 5MB (int8), Client RAM usage < 200MB.

---

## 5. Data Model & Schema *(mandatory)*

- **Entity / DTO**: [Tên Entity / DTO]
- **Fields & Constraints**:
  - `id`: Unique identifier
  - `[field_name]`: [type], [constraints e.g., NON-NULL, UNIQUE]

---

## 6. Acceptance Criteria (Given-When-Then BDD) *(mandatory)*

*Mỗi criterion là một test case ẩn có thể kiểm thử độc lập.*

- [ ] **AC-001**: **Given** [trạng thái ban đầu], **When** [hành động], **Then** [kết quả mong đợi].
- [ ] **AC-002**: **Given** [trạng thái ban đầu], **When** [hành động sai / lỗi], **Then** [kết quả báo lỗi chuẩn].

---

## 7. Out of Scope *(mandatory)*

*Ranh giới tuyệt đối — Những gì hệ thống KHÔNG làm trong sprint này.*

- **OOS-001**: [Tính năng/Luồng 1 bị loại trừ]
- **OOS-002**: [Tính năng/Luồng 2 bị loại trừ]
- **Boundary Constraints for AI Agent**:
  - KHÔNG tự động sửa DB schema hiện có.
  - KHÔNG tự thêm thư viện ngoài không được chỉ định trong Tech Context.

---

## 8. Open Questions & Assumptions

- **Assumptions**: [Các giả định hợp lý khi thiết kế]
- **Open Questions**: [Các câu hỏi cần làm rõ trước khi lock Spec]
