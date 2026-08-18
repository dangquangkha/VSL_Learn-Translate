# Quickstart & Validation Guide: Presigned R2 Upload

**Feature**: 005-r2-upload  
**Date**: 2026-08-18  

## 1. Environment Setup

Set Cloudflare R2 credentials in environment:

```bash
export R2_ACCOUNT_ID="your_cloudflare_account_id"
export R2_ACCESS_KEY="your_r2_access_key"
export R2_SECRET_KEY="your_r2_secret_key"
export R2_BUCKET_NAME="vsl-data"
```

---

## 2. Request Presigned Upload URL

```bash
curl -X POST http://localhost:8080/api/collection/clips/upload-url \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 12,
    "participantCode": "P05",
    "signId": 3,
    "fileType": "video/webm",
    "target": "VIDEO"
  }'
```

---

## 3. Direct Browser HTTP PUT Upload Validation

Using the returned `uploadUrl` from step 2, upload sample video file directly to R2:

```bash
curl -X PUT "<RETURNED_UPLOAD_URL>" \
  -H "Content-Type: video/webm" \
  --data-binary "@sample_clip.webm"
```

**Pass Criteria**:
- HTTP response status code `200 OK`.
- 0 bytes transferred through backend JVM.
