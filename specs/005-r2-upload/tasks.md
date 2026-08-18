# Tasks: Presigned URL Upload & Cloudflare R2 Storage

**Feature**: `005-r2-upload` | **Branch**: `005-r2-upload`  
**Input Documents**: [`spec.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/spec.md), [`plan.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/plan.md), [`research.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/research.md), [`data-model.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/data-model.md), [`r2_upload_api_contract.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/contracts/r2_upload_api_contract.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Goal**: Initialize Maven AWS SDK v2 dependencies and Spring Boot package layout for Cloudflare R2 storage integration.

- [X] T001 Initialize Java package layout under `backend/src/main/java/com/vsl/collection/`
- [X] T002 Configure AWS SDK v2 `software.amazon.awssdk:s3` dependencies in `backend/pom.xml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: R2 credentials configuration bean, S3Presigner bean initialization, and DTO definitions.

- [X] T003 [P] Implement R2 storage properties & `S3Presigner` configuration bean in `backend/src/main/java/com/vsl/collection/config/R2StorageConfig.java` (FR-001)
- [X] T004 [P] Create `UploadUrlRequest` and `UploadUrlResponse` DTOs in `backend/src/main/java/com/vsl/collection/dto/`

---

## Phase 3: User Story 1 - Presigned Upload PUT URL Generation (Priority: P1) 🎯 MVP

**Goal**: Implement `R2StorageService.generatePresignedUploadUrl()` generating 15-minute HTTP `PUT` presigned URLs with exact `Content-Type` signature binding and R2 object key formatting (`clips/{participant_code}/{clip_id}.webm` or `landmarks/{participant_code}/{clip_id}.bin`).

**Independent Test**: Request upload URL via `POST /api/collection/clips/upload-url`; execute direct HTTP `PUT` payload to returned URL and verify file exists in R2 bucket without proxying through Spring Boot memory.

### Implementation for User Story 1
- [X] T005 [P] [US1] Implement R2 key formatter utility (`clips/{code}/{id}.webm` & `landmarks/{code}/{id}.bin`) in `backend/src/main/java/com/vsl/collection/service/R2KeyFormatter.java` (FR-003)
- [X] T006 [US1] Implement `generatePresignedUploadUrl()` in `backend/src/main/java/com/vsl/collection/service/R2StorageService.java` with 15-min expiration and `Content-Type` signature header binding (FR-002, NFR-002)
- [X] T007 [US1] Implement `POST /api/collection/clips/upload-url` REST controller endpoint in `backend/src/main/java/com/vsl/collection/controller/CollectionUploadController.java` (FR-002, FR-008)
- [X] T008 [US1] Write unit tests for presigned upload URL generation in `backend/src/test/java/com/vsl/collection/R2StorageServiceTestRunner.java`

---

## Phase 4: User Story 2 - Admin Presigned GET Review Stream (Priority: P2)

**Goal**: Implement `R2StorageService.generatePresignedViewUrl()` for ADMIN clip review streaming from private R2 bucket.

**Independent Test**: Request view URL via `GET /api/admin/clips/{id}/view-url` as `ADMIN`; receive HTTP 200 containing valid 15-minute GET URL.

### Implementation for User Story 2
- [X] T009 [US2] Implement `generatePresignedViewUrl()` in `R2StorageService.java` with 15-minute expiration (FR-005)
- [X] T010 [US2] Implement `GET /api/admin/clips/{id}/view-url` endpoint in `CollectionUploadController.java` with ADMIN RBAC check (FR-005)

---

## Phase 5: Polish & Cross-Cutting Concerns

**Goal**: Error logging sanitization (preventing secret leak) and quickstart verification.

- [X] T011 Implement S3 Exception handling in `GlobalExceptionHandler.java` ensuring `$R2_ACCESS_KEY` and `$R2_SECRET_KEY` are never logged or returned (FR-009, NFR-002)
- [X] T012 Execute manual curl & direct browser HTTP `PUT` upload scenario in `specs/005-r2-upload/quickstart.md`

---

## Dependencies & Execution Order

1. **Phase 1 (Setup)**: Can start immediately.
2. **Phase 2 (Foundational)**: Depends on Phase 1. Tasks T003 and T004 can run in parallel.
3. **Phase 3 (User Story 1 - MVP)**: Depends on Phase 2.
4. **Phase 4 (User Story 2)**: Depends on Phase 3.
5. **Phase 5 (Polish)**: Depends on Phase 4.
