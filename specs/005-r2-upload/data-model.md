# Data Model & Schema Specification: R2 Presigned Upload

**Feature**: 005-r2-upload  
**Date**: 2026-08-18  

## 1. DTO Schemas

### `UploadUrlRequest`
```json
{
  "sessionId": 456,
  "participantCode": "P05",
  "signId": 12,
  "fileType": "video/webm",
  "target": "VIDEO"
}
```

- **Constraints**:
  - `participantCode`: NON-NULL, matches pattern `^P\d+$`
  - `fileType`: Allowed values `video/webm`, `video/mp4`, `application/octet-stream`
  - `target`: Enum `VIDEO`, `LANDMARK`

---

### `UploadUrlResponse`
```json
{
  "uploadUrl": "https://<account_id>.r2.cloudflarestorage.com/vsl-data/clips/P05/clip_789.webm?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "r2Key": "clips/P05/clip_789.webm",
  "expiresInSeconds": 900
}
```

---

## 2. R2 Object Key Pattern Rules

| Target Type | Path Format | Example Key |
|---|---|---|
| Video Clip | `clips/{participant_code}/{clip_id}.webm` | `clips/P05/clip_789.webm` |
| Binary Landmark | `landmarks/{participant_code}/{clip_id}.bin` | `landmarks/P05/clip_789.bin` |
| Reference Sign | `reference/signs/{sign_id}.mp4` | `reference/signs/sign_12.mp4` |
| Reference Phrase | `reference/phrases/{phrase_id}.mp4` | `reference/phrases/phrase_03.mp4` |
