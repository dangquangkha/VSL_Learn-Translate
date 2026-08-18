# Feature Specification: Authentication & Authorization Service

**Feature Branch**: `004-auth-service`  
**Created**: 2026-08-18  
**Status**: Draft  
**Owner**: AI Agent (Antigravity / Codex)  
**Input**: User description: "Spec 03: Authentication & Authorization Service (spec-03-auth-service.md)"  

---

## 1. Context & Goal

- **Business Context**: Toàn bộ hệ thống VSL Learn & Translate hỗ trợ cá nhân hóa tiến độ luyện tập (chế độ Học), theo dõi lịch sử Leitner, phân quyền người dùng và quản trị hệ thống. Cần một dịch vụ Xác thực & Phân quyền tin cậy, bảo mật để quản lý tài khoản và cấp quyền cho 3 vai trò (`LEARNER`, `CONTRIBUTOR`, `ADMIN`).
- **Feature Goal**: Cung cấp cơ chế đăng ký, đăng nhập email/mật khẩu, cấp và xác thực JWT token, mã hóa mật khẩu bằng BCrypt, và phân quyền người dùng (Role-Based Access Control - RBAC) bảo vệ các endpoint hệ thống.
- **Success Metrics**: 
  - Thời gian phản hồi P95 cho API đăng ký/đăng nhập < 200ms.
  - 100% mật khẩu người dùng được băm mã hóa BCrypt với cost factor = 12 trước khi lưu CSDL.
  - JWT token được ký an toàn với thuật toán HMAC-SHA256, thời gian hết hạn cố định 24 giờ.
  - 100% endpoint quản trị `/api/admin/**` chặn các request không có quyền `ADMIN`.
- **Technical Context**: 
  - Framework: Spring Boot 3 / Java 21, Spring Security 6, Spring Data JPA.
  - Database: PostgreSQL (bảng `users`).
  - Auth Protocol: REST API, JSON Web Token (JWT) Bearer Token header (`Authorization: Bearer <token>`).

---

## 2. Actors & Roles

| Actor | Description | Permissions |
|---|---|---|
| **Guest (Unauthenticated)** | Người dùng chưa đăng nhập | Quyền đăng ký tài khoản mới, đăng nhập, truy cập chế độ Dịch và trang công khai. KHÔNG có quyền truy cập API riêng tư. |
| **LEARNER** | Người học VSL đã xác thực | Quyền lưu và xem tiến độ học tập cá nhân, thực hiện bài luyện tập, quản lý tài khoản cá nhân. |
| **CONTRIBUTOR** | Người đóng góp dữ liệu ẩn danh | Được truy cập luồng quay dữ liệu qua mã phiên/link mời. KHÔNG yêu cầu tài khoản `users`. |
| **ADMIN** | Quản trị viên hệ thống | Quyền duyệt clip dữ liệu (`/api/admin/clips`), quản lý từ vựng & cụm từ (`/api/admin/vocabulary`), tải và kích hoạt model ONNX (`/api/admin/models`), xem thống kê hệ thống. |
| **Spring Security Filter** | Bộ lọc tự động kiểm tra JWT | Quyền giải mã Token, trích xuất User Identity & Role, thiết lập Security Context cho request. |

**Actors Out of Scope**: Hệ thống không hỗ trợ đăng nhập qua bên thứ ba (OAuth2/Google/Facebook) hoặc hệ thống phân quyền đa cấp tổ chức (Multi-tenant Enterprise RBAC) trong phạm vi này.

---

## 3. Functional Requirements (EARS Notation)

### 3.1 Core Logic & Behavior
- **FR-001 (Ubiquitous)**: THE Auth Service SHALL store user account passwords exclusively as BCrypt salted hashes with a cost factor of 12.
- **FR-002 (Event-driven)**: WHEN a guest submits valid registration credentials (email, password), THE Auth Service SHALL create a new `users` record with role `LEARNER` and return HTTP 201 Created.
- **FR-003 (Event-driven)**: WHEN a user submits valid login credentials (email, password), THE Auth Service SHALL generate a signed JWT bearer token containing `user_id`, `email`, `role`, `issued_at`, and `expires_at` (24-hour lifetime) and return HTTP 200 OK.
- **FR-004 (Ubiquitous)**: THE Spring Security filter SHALL intercept incoming requests to protected endpoints, validate the signature and expiration of the JWT in the `Authorization: Bearer <token>` header, and set the security context.
- **FR-005 (State-driven)**: WHILE a request attempts to access an endpoint matching `/api/admin/**`, THE Security Filter SHALL authorize access ONLY IF the authenticated user role is strictly `ADMIN`.
- **FR-006 (State-driven)**: WHILE a request attempts to access protected endpoints under `/api/practice/**` or `/api/learning/**`, THE Security Filter SHALL authorize access IF the authenticated user role is `LEARNER` or `ADMIN`.
- **FR-012 (Ubiquitous)**: THE Auth Service database migration SHALL include a seed script to bootstrap the initial ADMIN account with a BCrypt hashed password derived from environment variables.

### 3.2 Error Handling & Edge Cases (Unwanted Patterns)
- **FR-007 (Unwanted)**: WHERE a registration attempt provides an email address that already exists in the `users` table, THE Auth Service SHALL reject the request with HTTP 409 Conflict and error message `EMAIL_ALREADY_EXISTS`.
- **FR-008 (Unwanted)**: WHERE a login attempt provides an invalid email or incorrect password, THE Auth Service SHALL reject the request with HTTP 401 Unauthorized and a generic error message `INVALID_CREDENTIALS` (preventing account enumeration).
- **FR-009 (Unwanted)**: WHERE a request to a protected endpoint lacks an `Authorization` header or contains a malformed/expired JWT token, THE Security Filter SHALL reject the request with HTTP 401 Unauthorized.
- **FR-010 (Unwanted)**: WHERE a non-ADMIN user attempts to access an endpoint matching `/api/admin/**`, THE Security Filter SHALL reject the request with HTTP 403 Forbidden.
- **FR-011 (Unwanted)**: WHERE a registration request provides a password shorter than 8 characters or an invalid email format, THE Auth Service SHALL reject the request with HTTP 400 Bad Request and validation errors.

---

## 4. Non-Functional Requirements

- **NFR-001 (Performance & Latency)**: Password verification and JWT generation P95 response time < 200ms under standard server load.
- **NFR-002 (Security)**: Password hash cost factor BCrypt = 12. JWT signature algorithm HMAC-SHA256 with key length $\ge 256$ bits (`$JWT_SECRET` environment variable). Token expiration fixed at 24 hours.
- **NFR-003 (Compliance & Privacy)**: Zero plaintext password logging. Failed authentication logs MUST NOT record password strings or secret keys.

---

## 5. Data Model & Schema

- **Entity / Table**: `users`
- **Fields & Constraints**:
  - `id`: `BIGINT`, Primary Key, Auto-increment / Identity.
  - `email`: `VARCHAR(255)`, NON-NULL, UNIQUE, Indexed.
  - `password_hash`: `VARCHAR(255)`, NON-NULL (BCrypt hash string).
  - `role`: `VARCHAR(32)`, NON-NULL (Enum values: `LEARNER`, `ADMIN`, `CONTRIBUTOR`).
  - `created_at`: `TIMESTAMP WITH TIME ZONE`, NON-NULL, Default `CURRENT_TIMESTAMP`.
  - `updated_at`: `TIMESTAMP WITH TIME ZONE`, NON-NULL, Default `CURRENT_TIMESTAMP`.

- **DTO Schemas**:
  - `RegisterRequest`: `{ "email": "string", "password": "string" }`
  - `LoginRequest`: `{ "email": "string", "password": "string" }`
  - `AuthResponse`: `{ "token": "string", "type": "Bearer", "userId": 123, "email": "user@example.com", "role": "LEARNER", "expiresIn": 86400 }`

---

## 6. Acceptance Criteria (Given-When-Then BDD)

- [ ] **AC-001**: **Given** email chưa tồn tại trong hệ thống, **When** gửi request POST `/api/auth/register` với email hợp lệ và mật khẩu $\ge 8$ ký tự, **Then** tài khoản được tạo thành công với role `LEARNER`, mật khẩu lưu CSDL ở dạng BCrypt hash, và trả về HTTP 201 Created.
- [ ] **AC-002**: **Given** tài khoản đã tồn tại, **When** gửi request POST `/api/auth/login` với email và mật khẩu đúng, **Then** hệ thống trả về HTTP 200 OK chứa JWT Bearer token hợp lệ thời hạn 24 giờ.
- [ ] **AC-003**: **Given** tài khoản đã tồn tại, **When** gửi request POST `/api/auth/login` với sai mật khẩu, **Then** hệ thống trả về HTTP 401 Unauthorized với thông điệp `INVALID_CREDENTIALS`.
- [ ] **AC-004**: **Given** người dùng đăng nhập với role `LEARNER`, **When** gửi request GET `/api/admin/stats` kèm JWT token, **Then** hệ thống chặn với HTTP 403 Forbidden.
- [ ] **AC-005**: **Given** người dùng đăng nhập với role `ADMIN`, **When** gửi request GET `/api/admin/stats` kèm JWT token, **Then** hệ thống chấp nhận và trả về HTTP 200 OK.

---

## 7. Out of Scope

- **OOS-001**: Không hỗ trợ Refresh Token xoay vòng (Rotational Refresh Token) hoặc Đăng xuất hủy Session phía Server (Stateless JWT architecture; Token hủy bằng cách hết hạn 24h hoặc client xóa Token).
- **OOS-002**: Không hỗ trợ tính năng Quên mật khẩu / Reset password qua Email trong giai đoạn này.
- **OOS-003**: Không hỗ trợ Đăng nhập mạng xã hội (OAuth2 Google/Facebook).
- **Boundary Constraints for AI Agent**:
  - KHÔNG hardcode secret key JWT trong code (`$JWT_SECRET` phải nạp từ biến môi trường).
  - KHÔNG thay đổi cấu trúc mã hóa BCrypt cost factor = 12.

---

## Clarifications

### Session 2026-08-18
- Q: Would you like to clarify how initial administrative (`ADMIN`) users should be bootstrapped into the system for environment deployment? → A: Seed initial `ADMIN` user via Flyway database migration using `$INITIAL_ADMIN_PASSWORD` (Option A).

## 8. Open Questions & Assumptions

- **Assumptions**: 
  - Frontend lưu trữ JWT Token trong memory hoặc LocalStorage/SessionStorage và tự động đính kèm header `Authorization: Bearer <token>` khi gọi API.
  - Tài khoản `ADMIN` ban đầu được khởi tạo thông qua SQL Seed script / Database migration (Flyway).
- **Open Questions**: Khai báo không có.
