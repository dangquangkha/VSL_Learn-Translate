# Phase 0 Research: Presigned URL Upload & Cloudflare R2 Storage

**Feature**: 005-r2-upload  
**Date**: 2026-08-18  

## Research Decisions & Technical Architecture

### 1. AWS SDK v2 S3Presigner Integration for Cloudflare R2

- **Decision**: Use `software.amazon.awssdk:s3` v2.x with `S3Presigner` configured for Cloudflare R2 S3-compatible API.
- **Rationale**: Official AWS SDK v2 provides native async and presigning capabilities for S3-compatible object stores (Cloudflare R2, MinIO, Ceph).
- **Configuration**:
  - Endpoint URI: `https://<account_id>.r2.cloudflarestorage.com`
  - Region: `Region.of("auto")` or `Region.US_EAST_1`
  - Credentials: `StaticCredentialsProvider.create(AwsBasicCredentials.create(r2AccessKey, r2SecretKey))`
  - Path-style vs Virtual-hosted style: Cloudflare R2 supports path-style addressing (`bucket/key`).

---

### 2. S3 Signature & Content-Type Binding

- **Decision**: Bind `contentType` (`video/webm` or `application/octet-stream`) explicitly in `PutObjectRequest.builder().contentType(fileType).build()`.
- **Rationale**: Mandated by `FR-002` clarification. If the client attempts to upload a different MIME type or omit the `Content-Type` HTTP header during `PUT`, Cloudflare R2 rejects the request with HTTP 403 SignatureMismatch.

---

### 3. Presigned GET URL for ADMIN Reviewer

- **Decision**: Implement `GetObjectPresignRequest` in `R2StorageService.generateGetUrl(r2Key)` with a 15-minute expiration window.
- **Rationale**: Keeps the R2 bucket strictly private (`NFR-N03`), preventing public unauthorized video scraping while enabling secure streaming in the Admin clip review queue.
