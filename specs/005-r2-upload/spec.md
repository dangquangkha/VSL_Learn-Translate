# Feature Specification: Presigned URL Upload & Cloudflare R2 Storage

**Feature Branch**: `005-r2-upload`  
**Created**: 2026-08-18  
**Status**: Draft  
**Owner**: AI Agent (Antigravity / Codex)  
**Input**: User description: "Spec 04: Presigned URL Upload & R2 Storage (spec-04-r2-upload.md) - Cấp quyền upload trực tiếp từ Browser lên Cloudflare R2 qua S3 Presigned URL (Bypass Spring Boot server)."  

---

## 1. Context & Goal

- **Business Context**: Trong quy trình thu thập dữ liệu ký hiệu VSL (FR-C), việc truyền tải hàng nghìn video clip WebM/MP4 (720p/480p) và file nhị phân landmark qua máy chủ backend Spring Boot sẽ gây nghẽn băng thông, nguy cơ tràn bộ nhớ JVM và tăng chi phí hạ tầng. Tuân thủ tuyệt đối **Hiến pháp Dự án Principle IV** và **NFR-S04**, video và landmark phải được tải trực tiếp từ trình duyệt lên Cloudflare R2 qua Presigned URL mà không đi qua server backend.
- **Feature Goal**: Xây dựng endpoint REST `/api/collection/clips/upload-url` trên Spring Boot để tạo và cấp S3 Presigned PutObject URL có quyền ghi (WRITE ONLY), thời gian hết hạn 15 phút, và cấu trúc đường dẫn khóa lưu trữ (R2 object key) theo mã ẩn danh `participant_code`.
- **Success Metrics**: 
  - 100% luồng tải video/landmark dữ liệu giao dịch trực tiếp giữa trình duyệt và Cloudflare R2 (0 byte video data đi qua Spring Boot proxy).
  - Thời gian tạo và cấp Presigned URL trên backend P95 < 100ms.
  - Presigned URL có thời hạn tối đa 15 phút (900 giây) và chỉ cho phép duy nhất thao tác HTTP `PUT`.
  - Toàn bộ R2 Bucket bảo mật riêng tư (`private`), không cho phép truy cập đọc/ghi công khai không có chữ ký.
- **Technical Context**: 
  - Backend: Java 21 / Spring Boot 3, AWS SDK for Java v2 (`S3Presigner`, `software.amazon.awssdk.services.s3`).
  - Storage: Cloudflare R2 (S3-compatible Object Storage API).
  - Client: Web Browser (Fetch API / `MediaRecorder` direct S3 PUT upload).

---

## 2. Actors & Roles

| Actor | Description | Permissions |
|---|---|---|
| **Contributor Browser** | Trình duyệt client thực hiện phiên quay dữ liệu | Quyền xin cấp Presigned Upload URL và thực hiện HTTP PUT video/landmark trực tiếp lên Cloudflare R2 |
| **Backend Collection Service** | Spring Boot Service quản lý thu thập dữ liệu | Quyền đọc cấu hình R2 credentials (`$R2_ACCESS_KEY`, `$R2_SECRET_KEY`), khởi tạo `S3Presigner` và ký cấp URL tạm thời |
| **Cloudflare R2 Storage** | S3-compatible Object Storage chứa video và landmark | Kiểm tra chữ ký S3 Presigned Signature, chấp nhận ghi file hợp lệ và chặn các thao tác quá hạn/sai khóa |
| **ADMIN Reviewer** | Quản trị viên hệ thống | Quyền xin cấp Presigned GET URL ngắn hạn để xem lại clip dữ liệu trong hàng đợi duyệt |

**Actors Out of Scope**: Khách vãng lai ở chế độ Học và Dịch (không phát sinh upload dữ liệu lên R2).

---

## 3. Functional Requirements (EARS Notation)

### 3.1 Core Logic & Behavior
- **FR-001 (Ubiquitous)**: THE Collection Backend Service SHALL use AWS SDK v2 `S3Presigner` configured with Cloudflare R2 S3 endpoint, region `auto`, and environment credentials (`$R2_ACCESS_KEY`, `$R2_SECRET_KEY`).
- **FR-002 (Event-driven)**: WHEN a client sends a valid POST request to `/api/collection/clips/upload-url` with `participantCode`, `signId`, and `fileType` (`video/webm` or `application/octet-stream`), THE Service SHALL generate an S3 Presigned PUT URL restricted to HTTP `PUT` operation, a 15-minute expiration (900 seconds), and binding the exact `Content-Type` header into the S3 PutObjectRequest signature.
- **FR-003 (Ubiquitous)**: THE Service SHALL construct R2 object keys strictly adhering to the path structure:
  - Video clips: `clips/{participant_code}/{clip_id}.webm`
  - Binary landmarks: `landmarks/{participant_code}/{clip_id}.bin`
- **FR-004 (Event-driven)**: WHEN the client uploads binary payload via HTTP `PUT` to the valid Presigned URL, THE Cloudflare R2 storage SHALL store the payload at the designated object key and return HTTP 200 OK directly to the browser.
- **FR-005 (Event-driven)**: WHEN an ADMIN user requests to view a clip for quality review, THE Service SHALL generate a Presigned GET URL valid for 15 minutes to allow secure stream playback from private R2 bucket.

### 3.2 Error Handling & Edge Cases (Unwanted Patterns)
- **FR-006 (Unwanted)**: WHERE a Presigned URL has expired (beyond 15 minutes), THE Cloudflare R2 storage SHALL reject the upload request with HTTP 403 Forbidden (`RequestTimeTooSkewed` or `AccessDenied`).
- **FR-007 (Unwanted)**: WHERE an upload request uses an HTTP method other than `PUT` (e.g. `POST`, `DELETE`, `GET`), THE Cloudflare R2 storage SHALL reject the operation with HTTP 403 Forbidden.
- **FR-008 (Unwanted)**: WHERE an unauthenticated client attempts to request a presigned upload URL without a valid `participantCode` or active `recording_session`, THE Collection Service SHALL reject the request with HTTP 400 Bad Request or HTTP 401 Unauthorized.
- **FR-009 (Unwanted)**: WHERE Cloudflare R2 credentials or S3 endpoint configuration fails, THE Collection Service SHALL log the S3 exception without exposing secret keys and return HTTP 500 Internal Server Error.

---

## 4. Non-Functional Requirements

- **NFR-001 (Performance & Latency)**: Presigned URL signing time P95 < 100ms on backend. Zero video payload transit through backend JVM memory.
- **NFR-002 (Security & Expiration)**: Presigned URL expiration fixed at 15 minutes (900 seconds). Presigned URL grants WRITE ONLY for a single specific object key. Secrets (`$R2_ACCESS_KEY`, `$R2_SECRET_KEY`) MUST NOT be logged or returned to client.
- **NFR-003 (Resource Envelope & Storage)**: Cloudflare R2 Bucket configuration set to Private (No public read access). Reference videos served via designated path `/reference/**`.

---

## 5. Data Model & Schema

- **API Endpoint Payload**: `POST /api/collection/clips/upload-url`
- **Request DTO (`UploadUrlRequest`)**:
  ```json
  {
    "sessionId": 456,
    "participantCode": "P05",
    "signId": 12,
    "fileType": "video/webm",
    "target": "VIDEO"
  }
  ```
- **Response DTO (`UploadUrlResponse`)**:
  ```json
  {
    "uploadUrl": "https://<account_id>.r2.cloudflarestorage.com/vsl-data/clips/P05/clip_789.webm?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
    "r2Key": "clips/P05/clip_789.webm",
    "expiresInSeconds": 900
  }
  ```

---

## 6. Acceptance Criteria (Given-When-Then BDD)

- [ ] **AC-001**: **Given** phiên quay hợp lệ với mã `P05`, **When** gửi POST `/api/collection/clips/upload-url` cho file video, **Then** backend trả về HTTP 200 chứa Presigned URL đúng cấu trúc `clips/P05/{clip_id}.webm` và `expiresInSeconds = 900`.
- [ ] **AC-002**: **Given** Presigned PUT URL vừa tạo, **When** browser thực hiện HTTP PUT binary payload trực tiếp lên URL đó, **Then** R2 trả về HTTP 200 OK và file được lưu riêng tư trên R2.
- [ ] **AC-003**: **Given** Presigned PUT URL đã quá 15 phút, **When** browser gửi request PUT, **Then** R2 chặn và trả về HTTP 403 Forbidden.
- [ ] **AC-004**: **Given** Presigned PUT URL, **When** ai đó cố tình dùng HTTP GET để đọc file qua URL này, **Then** R2 từ chối với HTTP 403 Forbidden.

---

## 7. Out of Scope

- **OOS-001**: Không proxy upload file video/landmark qua Spring Boot application server (Tuân thủ Nguyên tắc Kiến trúc IV).
- **OOS-002**: Không mở công khai R2 Bucket cho phép truy cập đọc không qua xác thực (trừ thư mục video mẫu `/reference/**`).
- **Boundary Constraints for AI Agent**:
  - KHÔNG ghi log các biến môi trường `$R2_ACCESS_KEY` và `$R2_SECRET_KEY`.
  - KHÔNG thay đổi cấu trúc đường dẫn khóa R2 (`clips/{code}/{id}.webm` và `landmarks/{code}/{id}.bin`).

---

## Clarifications

### Session 2026-08-18
- Q: Would you like to clarify how CORS headers should be validated on the backend when constructing the S3 Presigned PUT Request object (e.g. enforcing matching Content-Type header binding)? → A: Bind explicit Content-Type header into the S3 PutObjectRequest signature (Option A).

## 8. Open Questions & Assumptions

- **Assumptions**: 
  - Cloudflare R2 bucket `vsl-data` đã được khởi tạo và cấu hình CORS cho phép origin frontend client thực hiện phương thức HTTP `PUT` và header `Content-Type`.
  - Chữ ký S3 v4 (AWS4-HMAC-SHA256) tương thích hoàn toàn 100% với S3-compatible API của Cloudflare R2.
- **Open Questions**: Khai báo không có.
