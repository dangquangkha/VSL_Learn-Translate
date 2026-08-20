# Implementation Plan: Admin Services (Model Registry, Quality Control & Dataset Statistics)

**Feature Branch**: `011-admin-registry-stats`
**Created**: 2026-08-19
**Updated**: 2026-08-20 — Khớp spec v3 và implementation P5-1/P5-2 đã verify
**Owner**: Đức (P5)
**Spec**: [`specs/011-admin-registry-stats/spec.md`](spec.md)

---

## 1. Overview

P5 triển khai theo từng cổng: P5-1 `modelregistry` và P5-2 `stats` là phạm vi đã hoàn tất; `quality`, admin vocabulary và frontend vẫn là các giai đoạn sau trong `tasks.md`. Backend tuân thủ lược đồ SRS §7.3, API verb SRS §7.2 và contract chi tiết của spec v3.

### Architecture Diagram
```
Client / FE                              Backend Spring Boot (P5)                     Storage
 ┌──────────────┐                         ┌──────────────────────────┐               ┌────────────┐
│ Public/FE    │─GET /api/model/active──► │  ModelRegistryController │──────────────►│ PostgreSQL │
 │ (P2 consume) │                         │  ModelRegistryService    │               │ model_     │
 └──────────────┘                         └──────────────────────────┘               │  versions  │
 ┌──────────────┐                         ┌──────────────────────────┐               │            │
 │ Public       │─GET /api/stats/public──►│  PublicStatsController   │               │ clips      │
 └──────────────┘                         │  DatasetStatsService     │──────────────►│ (quality_  │
 ┌──────────────┐                         └──────────────────────────┘               │  status,   │
 │ Admin        │─PATCH /api/admin/**────►│  AdminModelController    │               │  quality_  │
 │ Dashboard    │                         │  AdminQualityController  │               │  metrics)  │
 └──────────────┘                         │  AdminStatsController    │               │            │
                                          └──────────────────────────┘               │ processing │
                                                     │                               │  _jobs     │
                                              @Async Worker ────────────────────────►│            │
                                              (QualityCheckWorker)                   └────────────┘
                                                     │                               ┌────────────┐
                                                     └──────────────────────────────►│ Cloudflare │
                                                                                     │ R2 Storage │
                                                                                     └────────────┘
```

---

## 2. Conventions & Reuse

- **Mẫu code**: Tuân theo cấu trúc `com.vsl.auth` → Controller / DTO / Entity / Repository / Service.
- **Migration**: Tiếp nối `V1__init_users_schema.sql`, `V2__seed_admin_user.sql` → đánh số `V3__`, `V4__`…
- **Tên bảng**: Đúng SRS §7.3 — `model_versions` (không phải `model_version`), `clips` (không phải `recording_clips`), `processing_jobs`.
- **API verb**: Đúng SRS §7.2 — `PATCH` cho activate và review clip, không phải `POST`.
- **SecurityConfig**: Thêm permit cho `/api/model/active` và `/api/stats/public`.
- **R2 path**: `models/{semver}/model.onnx` + `metrics.json` (SRS §7.4).

---

## 3. Step-by-Step Execution

### Step 1: Database Migrations
- `V3__model_versions_and_processing_jobs.sql`: Tạo đủ 11 trường `model_versions`, JSONB validation metadata, unique semver/object key, ràng buộc một active model và `processing_jobs` foundation.
- `V4__clips_quality_columns.sql`: `ALTER TABLE clips ADD COLUMN IF NOT EXISTS quality_status ...` + `quality_metrics JSONB` (chỉ chạy nếu P3 chưa tạo).

### Step 2: Update SecurityConfig
- Sửa `SecurityConfig.java`: thêm `.requestMatchers("/api/model/active", "/api/stats/public").permitAll()`.

### Step 3: Model Registry Module (`com.vsl.modelregistry`)
- Entity/repository `ModelVersion` — map đủ schema v3, paginated newest-first history và global pessimistic activation lock.
- `LabelCatalog` + `OnnxModelInspector` — canonical label hash, protobuf structure, Opset 17 và exact tensor contract; không chạy inference.
- `ModelMetricsValidator` — schema/range, subject-independent split, T-02 evidence và activation gates.
- `ModelRegistryService` + private R2 storage — canonical object keys, SHA-256 tự tính, rollback cleanup, duplicate/race protection, HEAD check và presigned GET 15 phút.
- Controllers — public `GET /api/model/active`; ADMIN upload/history/activate.

### Step 4: Quality Module (`com.vsl.quality`)
- Entity `ProcessingJob.java` — map bảng `processing_jobs`.
- Worker `QualityCheckWorker.java` — `@Async`, logic: frame count ≥ 20, landmark > 80%, pose > 70%, duration z-score, trajectory outlier.
- Service `QualityService.java` — cập nhật `clips.quality_status` + `clips.quality_metrics`.
- Controller `AdminQualityController.java` — `GET /api/admin/clips?status=NEEDS_REVIEW`, `PATCH /api/admin/clips/{id}`.

### Step 5: Stats Module (`com.vsl.stats`)
- DTOs `PublicStatsDTO.java`, `AdminStatsDTO.java` đúng public/admin contract.
- JDBC repository lấy consent hiệu lực mới nhất: public dùng `publish_dataset`, admin dùng `use_in_project`; join `clips.sign_id` sang `signs.label_index`.
- `DatasetStatsService` tính đúng công thức, trả đủ 51 labels, lọc/gán alias per-subject model metrics và fail closed bằng 503.
- Controllers — public `GET /api/stats/public`; ADMIN-only `GET /api/admin/stats`.

### Step 6: Admin Vocabulary Validation (FR-D03)
- Thêm validation `dictionary_source` non-empty trong endpoint admin vocabulary (wrap P4's module hoặc tạo `AdminVocabularyController`).

### Step 7: Verification & TIENDO.html
- Chạy `mvn clean verify`, full Spring context/JDBC tests và PostgreSQL Flyway integration test.
- Chỉ cập nhật `TIENDO.html` (P5-1, P5-2 → `done`) sau khi build/package và tests đều xanh.

---

## 4. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Xung đột Flyway migration number với P3/P4 | Kiểm tra `db/migration/` trước khi commit. Dùng timestamp-based nếu cần. |
| Bảng `clips` chưa tồn tại khi P5 chạy migration | Dùng `IF NOT EXISTS` / `IF EXISTS`. Phối hợp với P3 để chốt thứ tự migration. |
| Quality outlier detection cần đủ mẫu | Bỏ qua tầng thống kê (z-score, trajectory) nếu số mẫu cùng nhãn < 10. Chỉ áp dụng tầng kỹ thuật. |
| `GET /api/model/active` bị gọi nhiều | `@Cacheable` + `@CacheEvict` khi activate model mới. |
