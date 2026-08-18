# OpenAPI Contract: Collection Presigned Upload API

**Feature**: 005-r2-upload  
**Base Path**: `/api/collection`  

---

## Endpoints

### `POST /api/collection/clips/upload-url`
- **Summary**: Request S3 Presigned PUT URL for direct browser R2 upload.
- **Request Body**: `UploadUrlRequest`
- **Responses**:
  - `200 OK`: Returns `UploadUrlResponse` containing `uploadUrl` and `r2Key`.
  - `400 Bad Request`: Invalid participant code or missing session parameter.
  - `401 Unauthorized`: Unauthenticated request.
  - `500 Internal Server Error`: S3Presigner signing error.

---

### `GET /api/admin/clips/{clipId}/view-url` (ADMIN Only)
- **Summary**: Generate Presigned GET URL for viewing private clip in review queue.
- **Responses**:
  - `200 OK`: `{ "viewUrl": "https://...", "expiresInSeconds": 900 }`
  - `403 Forbidden`: Non-ADMIN access attempt.
