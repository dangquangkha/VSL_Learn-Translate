# Implementation Plan: Presigned URL Upload & Cloudflare R2 Storage

**Branch**: `005-r2-upload` | **Date**: 2026-08-18 | **Spec**: [spec.md](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/005-r2-upload/spec.md)

---

## Summary

Implement backend S3 Presigned URL generator using AWS SDK v2 `S3Presigner` configured for Cloudflare R2 object storage. Expose REST endpoint `/api/collection/clips/upload-url` to generate 15-minute HTTP `PUT` presigned upload URLs with exact `Content-Type` header signature binding, allowing client web browsers to upload video and binary landmark files directly to Cloudflare R2 without proxying through Spring Boot application memory.

---

## Technical Context

- **Language/Version**: Java 21 / Spring Boot 3.2+
- **Primary Dependencies**: `software.amazon.awssdk:s3`, `software.amazon.awssdk:sts` (AWS SDK v2.x)
- **Storage**: Cloudflare R2 (S3-compatible Object Storage API)
- **Testing**: JUnit 5, Mockito, Spring Boot Test
- **Target Platform**: Azure for Students VM / Cloudflare R2 Storage
- **Project Type**: Spring Boot Monolith Module (`backend/src/main/java/com/vsl/collection`)
- **Performance Goals**: P95 signing response time < 100ms on backend. Zero video data payload transit through backend JVM memory.
- **Constraints**: 15-minute expiration, WRITE ONLY `PUT` permissions, private R2 bucket security.

---

## Constitution Check

*GATE: All checks PASSED.*

| Constitution Principle | Compliance Status | Implementation Strategy |
|---|---|---|
| **IV. Privacy-First & Zero-Knowledge Video Stream** | PASS | Video payload uploaded directly from browser to R2 via Presigned URL; zero backend proxying. |
| **VII. Executable Spec & EARS Notation** | PASS | All 9 FRs tagged with EARS notation (`FR-001` to `FR-009`). |

---

## Project Structure

### Documentation (this feature)

```text
specs/005-r2-upload/
├── spec.md              # Feature Specification
├── plan.md              # Implementation Plan ($speckit-plan output)
├── research.md          # Phase 0 Research Findings
├── data-model.md        # Phase 1 Data Model & Schemas
├── quickstart.md        # Phase 1 Quickstart Validation Guide
├── contracts/           # Phase 1 OpenAPI API Contract
│   └── r2_upload_api_contract.md
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code Layout

```text
backend/
├── src/main/java/com/vsl/collection/
│   ├── config/
│   │   └── R2StorageConfig.java
│   ├── controller/
│   │   └── CollectionUploadController.java
│   ├── dto/
│   │   ├── UploadUrlRequest.java
│   │   └── UploadUrlResponse.java
│   └── service/
│       └── R2StorageService.java
└── src/test/java/com/vsl/collection/
    └── R2StorageServiceTest.java
```

---

## Complexity Tracking

> No constitution violations detected. Standard S3Presigner Cloudflare R2 direct upload pattern applied.
