# Tasks: Admin Services (Model Registry, Quality Control & Dataset Statistics)

**Feature Branch**: `011-admin-registry-stats`
**Created**: 2026-08-19
**Updated**: 2026-08-20 — Đồng bộ Model Registry + Stats theo spec v3 và bằng chứng test
**Owner**: Đức (P5)
**Spec**: [`spec.md`](spec.md) · **Plan**: [`plan.md`](plan.md)

---

## Giai đoạn ① — Backend Foundation (P5-1 & P5-2)

> Không bị chặn bởi ai. Bắt đầu ngay.

### 1. Database Migration

- [X] **T-1.1**: Tạo `V3__model_versions_and_processing_jobs.sql`
  - `model_versions` có đủ 11 trường FR-001: UUID id, semver, private r2_key, labels/artifact hash, input signature, metrics, release eligibility, validation results, active và created_at
  - Unique semver/r2_key, partial unique index một model active và CHECK active → release_eligible
  - Bảng `processing_jobs` (id, clip_id, type, status, attempts, created_at)
  - Flyway V1→V3 và constraints đã chạy thật trên PostgreSQL 16 bằng `PostgresMigrationIT`
- [ ] **T-1.2**: Tạo `V4__clips_quality_columns.sql`
  - `ALTER TABLE clips ADD COLUMN IF NOT EXISTS quality_status VARCHAR(32) NOT NULL DEFAULT 'PENDING'`
  - `ALTER TABLE clips ADD COLUMN IF NOT EXISTS quality_metrics JSONB`
  - Index trên `quality_status`
  - *Lưu ý*: Phối hợp với P3 (An) — nếu P3 đã tạo bảng `clips` với các cột này thì bỏ qua.

### 2. Model Registry Backend (`P5-1`)

- [X] **T-2.1**: Entity + repository Model Registry
  - JSONB mappings, UUID, newest-first history, global pessimistic activation lock và DB constraints
- [X] **T-2.2**: DTO `ActiveModelDTO` và `ModelAdminDTO`
  - Public DTO không lộ metrics, participant code, object key hoặc credential
- [X] **T-2.3**: Canonical `LabelCatalog` + `OnnxModelInspector`
  - Canonical hash byte-for-byte theo Python `json.dumps`; xác nhận hash hiện tại `927342…bf2f`
  - Parse protobuf cấu trúc ONNX, Opset 17, metadata `label_hash` và tensor contract; không có runtime inference
- [X] **T-2.4**: `ModelMetricsValidator`
  - Schema/range, T-02 hard gate, subject-independent split, participant metadata và release gates
- [X] **T-2.5**: R2 private artifact storage + `ModelRegistryService`
  - Canonical keys `models/{semver}/model.onnx|metrics.json`, SHA-256 tự tính, rollback cleanup, duplicate/race protection, HEAD check và presigned GET 15 phút
- [X] **T-2.6**: Model Registry API
  - Public `GET /api/model/active`; admin multipart upload, paginated history và atomic activation
- [X] **T-2.7**: Model Registry tests
  - Canonical labels, ONNX contract, metadata/T-02/split, cleanup/activation, RBAC/error contract, full Spring context và PostgreSQL migration

### 3. Dataset Statistics Backend (`P5-2`)

- [X] **T-3.1**: DTO public/admin đúng contract FR-013..FR-015
- [X] **T-3.2**: Consent-scoped JDBC repository
  - Consent hiệu lực mới nhất; public dùng `publish_dataset`, admin dùng `use_in_project`
  - Join `clips.sign_id → signs.label_index`; aggregate status, contributor và bốn chiều metadata
- [X] **T-3.3**: `DatasetStatsService`
  - Công thức chuẩn, đủ 51 labels kể cả zero/idle, fail-closed 503 thay zero giả
  - Lọc per-subject model metrics theo publish consent, alias TEST-A/B và weighted aggregates
- [X] **T-3.4**: Public/admin controllers
  - `GET /api/stats/public` public; `GET /api/admin/stats` ADMIN-only
- [X] **T-3.5**: Stats tests
  - Unit consent/privacy/formula + JDBC fixture thực thi query latest-consent cho hai scope

### 4. Update Security Config

- [X] **T-4.1**: Security + stable error contract
  - Public routes permit-all; `/api/admin/**` yêu cầu ADMIN; 401/403 có code/correlationId
  - JWT/R2 secrets bắt buộc từ configuration, không còn dummy fallback

### 5. Cổng hoàn tất

- [X] **T-5.1**: Chỉ cập nhật `TIENDO.html` P5-1/P5-2 → `done` sau khi clean verify/package cuối cùng xanh

---

## Giai đoạn ② — FE Admin Dashboard (`P5-3`, chờ FE Shell của P2)

- [ ] **T-6.1**: FE Admin Dashboard — bảng thống kê, biểu đồ clips per class
- [ ] **T-6.2**: FE Quản lý phiên bản model — upload, xem lịch sử, nút kích hoạt

---

## Giai đoạn ③ — Quality Backend + FE (`P5-4`, `P5-5`)

### 7. Quality Control Backend (`P5-4`)

- [ ] **T-7.1**: Entity `ProcessingJob.java` tại `com.vsl.quality.entity`
- [ ] **T-7.2**: Worker `QualityCheckWorker.java` (`@Async`)
  - Tầng kỹ thuật: frame_count ≥ 20, landmark_presence > 80%, pose_presence > 70%
  - Tầng thống kê: duration z-score > 3σ so với mean cùng sign_id, trajectory outlier detection
  - Fallback: nếu mẫu cùng nhãn < 10 thì bỏ qua tầng thống kê
- [ ] **T-7.3**: Service `QualityService.java` — cập nhật `clips.quality_status` + `quality_metrics`
- [ ] **T-7.4**: Controller `AdminQualityController.java`
  - `GET /api/admin/clips?status=NEEDS_REVIEW` (paginated)
  - `PATCH /api/admin/clips/{id}` (ADMIN duyệt/từ chối)

### 8. FE Quality & Model Management (`P5-5`, chờ FE Shell)

- [ ] **T-8.1**: FE hàng đợi duyệt clip — xem video, chấp nhận/loại, ghi lý do
- [ ] **T-8.2**: FE quản lý phiên bản model — lịch sử, kích hoạt

---

## Giai đoạn ④ — Transparency Page (`P5-6`, chờ FE Shell + số liệu P1)

- [ ] **T-9.1**: FE trang minh bạch dataset — biểu đồ phân bố, số liệu tổng quan, metadata distribution
- [ ] **T-9.2**: Admin vocabulary validation (FR-D03) — thêm endpoint wrapper bắt buộc `dictionary_source`

---

## Giai đoạn ⑤ — Tích hợp

- [ ] **T-10.1**: Đưa số liệu thật từ P1 (accuracy per person) lên trang minh bạch
- [ ] **T-10.2**: Chạy toàn bộ luồng end-to-end: upload model → activate → `/api/model/active` trả đúng → FE nạp
