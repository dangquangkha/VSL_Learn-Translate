# Feature Specification: Admin Model Registry, Data Quality & Dataset Statistics

**Feature Branch**: 011-admin-registry-stats
**Created**: 2026-08-19
**Last Updated**: 2026-08-20
**Status**: In Progress — P5-1/P5-2 implemented and verified; Quality/FE remain
**Input**: SRS FR-D01 đến FR-D04, DR-E04 đến DR-E06, NFR-P05, NFR-S02, NFR-S04, NFR-S06; Spec 010 P1 Foundation.

---

## 1. Context

### 1.1 Problem Statement

VSL Learn & Translate cần một luồng quản trị khép kín để:

1. đăng ký, kiểm tra, kích hoạt và truy xuất lịch sử model ONNX dùng cho suy luận phía trình duyệt;
2. kiểm tra chất lượng clip thu thập và cho phép ADMIN duyệt thủ công các trường hợp bất thường;
3. xuất thống kê dataset nhất quán, có định nghĩa đo lường rõ ràng và tôn trọng consent;
4. quản lý nội dung từ vựng có nguồn dẫn xác minh;
5. cung cấp dữ liệu cho Admin Dashboard và trang Dataset Transparency.

Hiện tại các hợp đồng giữa shared/labels.json, ONNX metadata, Model Registry, R2 và Stats chưa đủ chặt để ngăn model sai nhãn, URL object public, số liệu giả bằng 0 hoặc rò rỉ dữ liệu của người chưa đồng ý công bố.

### 1.2 Business Value

- ADMIN biết chính xác model nào đang được client sử dụng và có thể rollback bằng thao tác kích hoạt phiên bản cũ.
- Nhóm AI chỉ nhận clip đã qua quality gate và có consent phù hợp.
- Người xem trang minh bạch dataset nhận số liệu có định nghĩa và phạm vi consent rõ ràng.
- Dự án giữ nguyên nguyên tắc Client-Side Inference Only: backend quản lý artifact, không thực hiện dự đoán.

### 1.3 Success Metrics

- 100% model được đăng ký có ONNX label_hash trùng canonical hash của shared/labels.json.
- Tại mọi thời điểm có nhiều nhất một model active.
- 100% endpoint /api/admin/** trả 401 cho request chưa xác thực và 403 cho người dùng không có role ADMIN.
- 100% clip hoàn tất được đưa vào quality job và kết thúc ở ACCEPTED, NEEDS_REVIEW hoặc trạng thái lỗi có thể quan sát; không bị bỏ quên im lặng.
- 100% số liệu public chỉ dùng participant có publish_dataset = true và không chứa mã participant hay dữ liệu cấp hàng.
- GET /api/model/active đạt p95 dưới 50 ms trong điều kiện tải quy định tại NFR-001.

### 1.4 Scope Boundary

Tính năng này quản lý metadata và quyền truy cập artifact ONNX, nhưng SHALL NOT chạy ONNX inference trên backend và SHALL NOT mở endpoint /predict. Model, video và landmark vẫn nằm trong bucket R2 private; client chỉ nhận presigned URL có thời hạn.

---

## 2. Actors

| Actor | Role | Goals |
|---|---|---|
| Guest / Frontend Model Client | Người dùng chưa đăng nhập hoặc SPA | Lấy metadata model active và URL tải model có thời hạn để suy luận trên trình duyệt |
| ADMIN | Quản trị viên có role ADMIN | Upload, xem lịch sử, kích hoạt model; duyệt clip; xem thống kê chi tiết; quản lý từ vựng |
| Collection Service | Nguồn sự kiện backend | Phát sự kiện logic khi clip đã hoàn tất upload và metadata đã được ghi nhận |
| Quality Worker | Tiến trình nền | Kiểm tra kỹ thuật và phát hiện ngoại lệ của clip mà không chạy nhận dạng ký hiệu |
| Training Dataset Exporter | Pipeline AI offline | Chỉ lấy clip đã ACCEPTED và có use_in_project = true |
| Public Transparency Client | Trang minh bạch dataset | Đọc thống kê tổng hợp chỉ từ dữ liệu được đồng ý công bố |

### Out-of-scope Actors

- Learner và Contributor không được gọi endpoint quản trị.
- Backend inference service không tồn tại trong feature này.
- Người dùng bên ngoài không được truy cập trực tiếp object key R2 private.

---

## 3. Functional Requirements

### 3.1 Model Registry

- **FR-001 (Ubiquitous)**: THE Model Registry SHALL lưu cho mỗi model các trường id, semver, r2_key, labels_hash, artifact_sha256, input_signature, metrics, release_eligible, validation_results, is_active và created_at; semver SHALL là duy nhất.

- **FR-002 (Event-driven)**: WHEN an ADMIN gửi POST /api/admin/models với một file model.onnx, semver và metrics hợp lệ, THE Model Registry SHALL:
  1. kiểm tra artifact theo FR-003, FR-007, subject-independent split rules và hard gate T-02 trong metrics mà không chạy inference;
  2. tự tính SHA-256 của artifact;
  3. upload artifact và normalized metrics vào bucket R2 private tại models/{semver}/model.onnx và models/{semver}/metrics.json;
  4. tính release_eligible cùng validation_results; tạo model_versions record ở trạng thái inactive;
  5. trả HTTP 201 cùng metadata đã lưu.

- **FR-003 (Ubiquitous)**: THE Model Registry SHALL tự tính canonical labels hash từ shared/labels.json theo mục 5.4 và SHALL chỉ chấp nhận artifact có ONNX metadata label_hash trùng chính xác hash đó. Giá trị hash do caller gửi lên SHALL NOT được dùng làm bằng chứng hợp lệ.

- **FR-004 (State-driven)**: WHILE an ADMIN xem GET /api/admin/models?page={page}&size={size}, THE Model Registry SHALL trả lịch sử model phân trang, sắp xếp created_at giảm dần, gồm trạng thái active, release eligibility, validation results, metrics, labels hash, artifact hash, input signature và thời điểm tạo; response SHALL NOT chứa R2 credential hoặc raw object URL.

- **FR-005 (Event-driven)**: WHEN an ADMIN gọi PATCH /api/admin/models/{id}/activate cho model có release_eligible = true, labels_hash còn trùng canonical hash hiện tại, top1AccuracyTestA >= 0.85, browserLatencyMs <= 50, modelSizeBytes <= 5 MiB, goldenSampleCount = 20, goldenMaxLogitDiff < 0.001 và R2 object còn tồn tại, THE Model Registry SHALL trong một transaction:
  1. đặt tất cả model khác thành inactive;
  2. đặt model đích thành active;
  3. vô hiệu cache metadata model active;
  4. trả HTTP 200.

  Gọi lại trên model đã active SHALL thành công và không tạo trạng thái phụ.

- **FR-006 (State-driven)**: WHILE một client gọi GET /api/model/active và active record còn tương thích canonical labels hash cùng FR-007 hiện tại, THE Model Registry SHALL trả metadata gồm id, semver, labelsHash, artifactSha256, inputSignature, downloadUrl và downloadUrlExpiresAt. downloadUrl SHALL là presigned GET URL có hạn 15 phút cho object R2 private; response SHALL NOT chứa metrics nội bộ, participant code, r2_key hoặc credential. WHEN Frontend Model Client tải artifact, THE client SHALL kiểm tra raw artifact SHA-256 và embedded label_hash trước khi tạo ONNX session, và SHALL từ chối load nếu một trong hai hash sai.

- **FR-007 (Ubiquitous)**: THE Model Registry SHALL chỉ chấp nhận ONNX Opset 17 có chính xác hợp đồng tensor sau:

| Direction | Name | Dtype | Shape | Meaning |
|---|---|---|---|---|
| Input | landmarks | float32 | [1, 60, 75, 4] | 42 hand + 33 pose landmarks; mỗi điểm là x, y, z, visibility/presence |
| Input | mask | float32 | [1, 60, 3] | validity của left hand, right hand và pose theo từng frame |
| Input | timestamps | float32 | [1, 60] | timestamp giây, đơn điệu không giảm |
| Output | logits | float32 | [1, 51] | logits theo đúng thứ tự shared/labels.json |

Backend SHALL chỉ kiểm tra cấu trúc/metadata artifact và SHALL NOT gọi model để dự đoán.

### 3.2 Data Quality

- **FR-008 (Event-driven)**: WHEN một clip chuyển sang trạng thái upload hoàn tất, THE Quality Worker SHALL tạo processing_job và thực hiện bất đồng bộ:
  1. integrity checks: landmark object tồn tại, parse được, frame count trong file khớp clips.frame_count, sign_id tồn tại và timestamp đơn điệu không giảm;
  2. server-side statistical checks theo mục 5.5 nếu có đủ reference population;
  3. đặt clip thành ACCEPTED khi mọi check áp dụng đều pass;
  4. đặt clip thành NEEDS_REVIEW khi một check fail;
  5. lưu từng check, input count, threshold, observed value, detector version và thời điểm vào quality_metrics.

  Quality Worker SHALL NOT lặp lại kiểm tra ánh sáng, bố cục, FPS hoặc pose/hand coverage thuộc Recorder và SHALL NOT chạy sign recognition.

- **FR-009 (State-driven)**: WHILE có dưới 10 clip ACCEPTED cùng sign_id để làm reference population, THE Quality Worker SHALL bỏ qua duration và trajectory outlier checks, ghi statisticalCheck = SKIPPED_INSUFFICIENT_SAMPLE, và quyết định chỉ từ integrity checks.

- **FR-010 (Optional Feature)**: WHILE an ADMIN gọi GET /api/admin/clips?status=NEEDS_REVIEW&page={page}&size={size}, THE Quality Service SHALL trả danh sách phân trang gồm sign, participant code, frame count, quality_metrics và presigned GET URLs có hạn 15 phút cho video/landmark private. WHERE query có một hay nhiều filter tùy chọn signId, participantCode, from hoặc to, THE Quality Service SHALL áp dụng tất cả filter được cung cấp trước khi phân trang; filter bị bỏ trống SHALL không giới hạn kết quả.

- **FR-011 (Event-driven)**: WHEN an ADMIN gọi PATCH /api/admin/clips/{id} với quyết định ACCEPTED hoặc REJECTED, THE Quality Service SHALL chỉ cho phép chuyển từ NEEDS_REVIEW, lưu reviewer id, reviewed_at và rejection_reason khi REJECTED, rồi trả clip đã cập nhật.

- **FR-012 (Ubiquitous)**: THE Training Dataset Exporter SHALL chỉ đưa clip có quality_status = ACCEPTED và participant có consent hiệu lực use_in_project = true vào training manifest; manifest SHALL NOT chứa video của participant không đủ consent.

### 3.3 Dataset Statistics & Transparency

- **FR-013 (Ubiquitous)**: THE Stats Service SHALL dùng duy nhất các định nghĩa sau:

| Metric | Definition |
|---|---|
| eligible public participant | participant có consent hiệu lực mới nhất với publish_dataset = true |
| eligible internal participant | participant có consent hiệu lực mới nhất với use_in_project = true |
| selected scope | public dùng eligible public participant; admin internal dùng eligible internal participant |
| totalClips | số clip trong selected scope ở mọi quality_status |
| acceptedClips | số clip ACCEPTED trong selected scope |
| rejectedClips | số clip REJECTED trong selected scope |
| needsReviewClips | số clip NEEDS_REVIEW trong selected scope |
| pendingClips | số clip có quality_status = PENDING trong selected scope |
| totalContributors | số participant distinct trong selected scope có ít nhất một clip ACCEPTED |
| totalClasses | số phần tử hợp lệ trong shared/labels.json; giá trị hiện tại là 51, gồm idle |
| averageClipsPerContributor | acceptedClips / totalContributors; bằng 0 khi totalContributors = 0 |
| rejectionRate | rejectedClips / (acceptedClips + rejectedClips); bằng 0 khi mẫu số = 0 |
| clipsPerClass | số clip ACCEPTED theo từng label; trả đủ cả 51 label, kể cả count = 0 |

- **FR-014 (State-driven)**: WHILE một client gọi GET /api/stats/public, THE Stats Service SHALL trả:
  1. các metric FR-013;
  2. phân bố một chiều region, handedness, knows_vsl và age_group của eligible public participant có ít nhất một clip ACCEPTED;
  3. activeModelEvaluation gồm benchmark không gắn participant, accuracy theo từng người Test A/Test B đủ publish_dataset consent, aggregate accuracy được tính lại chỉ từ những người này và knownLimitations.

  Accuracy theo từng người SHALL chỉ dùng public alias dạng TEST-A-01 hoặc TEST-B-01 được tạo riêng cho response, SHALL NOT trả participant code/id nội bộ. Aggregate top-1/top-3 theo split SHALL là trung bình có trọng số sampleCount của các per-subject entries đủ consent. Response SHALL có publishedTestSubjectCount và withheldTestSubjectCount; modelEvaluationStatus SHALL là AVAILABLE khi không có entry bị giữ lại, PARTIAL_PUBLISH_CONSENT khi còn cả entry công bố được và bị giữ lại, hoặc NO_PUBLISHABLE_TEST_METRICS khi không có entry công bố được. Trạng thái cuối SHALL dùng accuracy fields = null, không phải 0. Response SHALL NOT chứa session id, clip id, object key, URL hoặc tổ hợp cross-tab có thể liên kết ngược một hàng collection. Nếu chưa có model active, activeModelEvaluation SHALL là null và modelEvaluationStatus SHALL là NO_ACTIVE_MODEL; dataset stats còn lại vẫn SHALL được trả.

- **FR-015 (State-driven)**: WHILE an ADMIN gọi GET /api/admin/stats, THE Stats Service SHALL trả:
  1. toàn bộ aggregate của FR-013 cho phạm vi nội bộ;
  2. phân bố metadata participant;
  3. tiến độ contributor gồm participant code, accepted count, target count và completion percentage;
  4. rejection rate theo sign;
  5. model metrics history theo semver, gồm per-subject accuracy với participant code nội bộ.

  Mỗi response SHALL kèm generatedAt và scope để caller phân biệt PUBLIC_CONSENTED với ADMIN_INTERNAL.

### 3.4 Vocabulary & Frontend Consumption

- **FR-016 (Event-driven)**: WHEN an ADMIN tạo hoặc cập nhật sign, phrase, phrase_signs hoặc phrase_orders, THE Vocabulary Service SHALL yêu cầu dictionary_source không rỗng cho nội dung được dạy/đánh giá; mọi sign id tham chiếu SHALL tồn tại và mỗi sign_id_sequence SHALL có verified_by.

- **FR-017 (State-driven)**: WHILE an ADMIN sử dụng Admin Dashboard, THE frontend SHALL cho phép xem stats, lọc review queue, gửi quyết định review, upload model, xem model history và kích hoạt model; mọi lỗi API SHALL hiển thị error code và thông điệp có thể hành động.

- **FR-018 (State-driven)**: WHILE một người dùng mở Dataset Transparency page, THE frontend SHALL render dữ liệu từ GET /api/stats/public, hiển thị thời điểm generatedAt và diễn giải ngắn cho averageClipsPerContributor cùng rejectionRate theo định nghĩa FR-013; frontend SHALL NOT suy diễn số liệu bị thiếu thành 0.

### 3.5 Unwanted Behaviour & Error Handling

> Nhóm Unwanted gồm 10/28 yêu cầu chức năng, tương đương 35.7%.

- **FR-019 (Unwanted)**: IF request tới /api/admin/** không có authentication hợp lệ, THEN THE Backend SHALL trả 401; IF caller đã xác thực nhưng không có role ADMIN, THEN THE Backend SHALL trả 403. Cả hai trường hợp SHALL không thay đổi dữ liệu và không cấp presigned URL.

- **FR-020 (Unwanted)**: IF semver hoặc metrics schema/range không hợp lệ, THEN THE Model Registry SHALL trả 400 với code INVALID_MODEL_METADATA. IF model file thiếu, rỗng, lớn hơn 5 MiB, không phải ONNX parseable, sai Opset hoặc sai tensor contract FR-007, THEN THE Model Registry SHALL trả 400 với code INVALID_MODEL_ARTIFACT. IF goldenSampleCount khác 20 hoặc goldenMaxLogitDiff >= 0.001, THEN THE Model Registry SHALL trả 400 với code GOLDEN_CONTRACT_FAILED. IF subjectSplitAssignments vi phạm subject-independent split rules, THEN THE Model Registry SHALL trả 400 với code EVALUATION_SPLIT_INVALID. Mọi trường hợp SHALL không để lại DB record hay R2 object mồ côi.

- **FR-021 (Unwanted)**: IF ONNX metadata thiếu label_hash hoặc label_hash khác canonical hash, THEN THE Model Registry SHALL trả 400 với code LABELS_HASH_MISMATCH, kèm expectedHash và actualHash khi actualHash không chứa dữ liệu nhạy cảm, và SHALL không lưu artifact.

- **FR-022 (Unwanted)**: IF semver đã tồn tại, THEN THE Model Registry SHALL trả 409 với code MODEL_VERSION_EXISTS và SHALL không ghi đè artifact hiện có.

- **FR-023 (Unwanted)**: IF ADMIN kích hoạt model không tồn tại hoặc model chưa vượt validation, THEN THE Model Registry SHALL lần lượt trả 404 MODEL_NOT_FOUND hoặc 409 MODEL_NOT_ACTIVATABLE và SHALL giữ nguyên model active hiện tại.

- **FR-024 (Unwanted)**: IF chưa có model active khi client gọi GET /api/model/active, THEN THE Model Registry SHALL trả 404 với code NO_ACTIVE_MODEL. IF active record có labels hash hoặc input signature không còn tương thích contract hiện tại, THEN THE Model Registry SHALL trả 409 với code ACTIVE_MODEL_INCOMPATIBLE. Cả hai trường hợp SHALL NOT trả metadata giả, metrics hoặc URL tải.

- **FR-025 (Unwanted)**: IF R2 upload, presign hoặc object verification thất bại, THEN THE Backend SHALL trả 503 với code MODEL_STORAGE_UNAVAILABLE hoặc CLIP_STORAGE_UNAVAILABLE phù hợp ngữ cảnh, SHALL rollback DB mutation liên quan và SHALL dọn artifact mới upload nếu transaction đăng ký model thất bại.

- **FR-026 (Unwanted)**: IF Stats Service không thể truy vấn schema/dữ liệu cần thiết hoặc phát hiện scope public chứa participant không đủ publish_dataset consent, THEN THE Stats Service SHALL trả 503 với code STATS_UNAVAILABLE, ghi log correlation id không chứa PII, và SHALL NOT trả bộ số 0 giả.

- **FR-027 (Unwanted)**: IF quyết định review có status ngoài ACCEPTED/REJECTED, clip không ở NEEDS_REVIEW, hoặc REJECTED thiếu rejection_reason, THEN THE Quality Service SHALL trả 400 INVALID_REVIEW_DECISION hoặc 409 INVALID_QUALITY_TRANSITION và SHALL không sửa clip.

- **FR-028 (Unwanted)**: IF vocabulary mutation thiếu dictionary_source, tham chiếu sign không tồn tại hoặc phrase order thiếu verified_by, THEN THE Vocabulary Service SHALL trả 400 với code INVALID_VOCABULARY_SOURCE hoặc INVALID_PHRASE_ORDER và SHALL rollback toàn bộ mutation.

---

## 4. Non-Functional Requirements

- **NFR-001 — Performance**: GET /api/model/active SHALL đạt p95 < 50 ms và các endpoint GET không upload SHALL đạt p95 < 500 ms khi chạy 20 requests/second trong 5 phút sau 1 phút warm-up, với fixture tối thiểu 6.200 clips, 25 participants, 20 model versions và database/R2 metadata service hoạt động bình thường. Thời gian client tải file ONNX từ R2 không tính vào latency endpoint.

- **NFR-002 — Security**: 100% endpoint /api/admin/** SHALL yêu cầu role ADMIN. Bucket chứa models, videos và landmarks SHALL private. Presigned URL SHALL hết hạn sau 15 phút hoặc sớm hơn và SHALL không bị ghi vào application log.

- **NFR-003 — Privacy**: Public stats SHALL chỉ dùng publish_dataset = true, không chứa internal identifier cấp hàng và không log participant code. Per-subject test accuracy public SHALL dùng alias không liên kết được với participant code bên ngoài response. Training export SHALL chỉ dùng use_in_project = true. Không endpoint nào trong feature này SHALL trả R2 credential.

- **NFR-004 — Integrity**: Database SHALL đảm bảo semver duy nhất và nhiều nhất một is_active = true. Kích hoạt model SHALL atomic. Hash comparison SHALL là so sánh chính xác 64 ký tự hex lowercase. T-02 trên đúng 20 golden samples với goldenMaxLogitDiff < 0.001 SHALL chặn registration khi fail. Top-1 Test A >= 0.85, browser latency <= 50 ms và model size <= 5 MiB SHALL là activation gates; model thấp hơn accuracy/latency gate MAY được lưu inactive để báo cáo trung thực nhưng SHALL NOT được kích hoạt.

- **NFR-005 — Reliability**: Quality job SHALL retry tối đa 3 lần với backoff khi lỗi tạm thời; sau lần cuối, job SHALL là FAILED, clip SHALL là NEEDS_REVIEW và quality_metrics SHALL lưu mã lỗi không chứa secret. Ít nhất 95% clip có landmark file <= 10 MiB SHALL có quality decision trong 60 giây.

- **NFR-006 — Observability**: Mỗi lỗi 5xx SHALL có correlationId; metrics SHALL theo dõi model upload success/failure, activation, active-model latency, quality-job latency/failure và stats latency. Log SHALL không chứa presigned URL, credential, raw video hoặc raw landmark payload.

- **NFR-007 — Compatibility**: API JSON SHALL dùng UTF-8, timestamp ISO-8601 UTC và version-compatible additive fields. Model contract SHALL giữ Opset 17 và ba input của FR-007 cho đến khi có spec thay thế được phê duyệt.

- **NFR-008 — Traceability**: Mỗi FR và NFR SHALL có ít nhất một automated test hoặc contract test liên kết bằng mã yêu cầu; code thay đổi sau sprint demo SHALL dùng comment EARS[FR-xxx] hoặc EARS[NFR-xxx] theo Constitution.

---

## 5. Data Model & Interface Contracts

### 5.1 Persistent Entities

#### model_versions

| Field | Type / Constraint | Meaning |
|---|---|---|
| id | UUID, PK | Model version id |
| semver | VARCHAR, UNIQUE, NOT NULL | Semantic version |
| r2_key | VARCHAR, UNIQUE, NOT NULL | Private object key; không trả ở public API |
| labels_hash | CHAR(64), NOT NULL | Canonical shared labels SHA-256 |
| artifact_sha256 | CHAR(64), NOT NULL | SHA-256 của raw ONNX bytes |
| input_signature | JSONB, NOT NULL | Snapshot contract FR-007 |
| metrics | JSONB, NOT NULL | Evaluation metrics |
| release_eligible | BOOLEAN, NOT NULL | Kết quả các activation gates hiện hành |
| validation_results | JSONB, NOT NULL | Pass/fail và observed value cho từng gate |
| is_active | BOOLEAN, NOT NULL DEFAULT false | Chỉ tối đa một record true |
| created_at | TIMESTAMPTZ, NOT NULL | Creation timestamp UTC |

Database SHALL có unique semver, partial unique constraint/index cho is_active = true và check constraint NOT is_active OR release_eligible.

validation_results SHALL có rulesetVersion, evaluatedAt và các check labelsHash, tensorContract, evaluationSplit, goldenContract, top1TestA, browserLatency và modelSize. Mỗi check SHALL có status PASS/FAIL, observed và required. release_eligible SHALL chỉ true khi mọi activation gate đang áp dụng đều PASS; activation SHALL đánh giá lại các giá trị có thể drift như canonical labels hash và R2 object existence.

#### processing_jobs

| Field | Type / Constraint | Meaning |
|---|---|---|
| id | UUID, PK | Job id |
| clip_id | UUID, FK clips(id), NOT NULL | Clip được kiểm tra |
| status | PENDING, RUNNING, COMPLETED, FAILED | Job state |
| attempts | INTEGER 0..3 | Số lần chạy |
| error_code | VARCHAR, nullable | Sanitized terminal error |
| created_at / updated_at | TIMESTAMPTZ | Audit timestamps |

Mỗi clip SHALL có nhiều nhất một processing_job chưa terminal.

#### clips.quality_metrics

quality_metrics JSONB SHALL chứa tối thiểu:

- detectorVersion;
- integrity.objectExists, parseable, storedFrameCount, declaredFrameCount, signExists, timestampsMonotonic;
- statistical.referenceCount, durationZScore, trajectoryZScore, statisticalCheck;
- decisionSource = AUTOMATED hoặc ADMIN;
- reviewerId, reviewedAt và rejectionReason khi có.

### 5.2 Model API Contracts

POST /api/admin/models dùng multipart/form-data:

| Part | Required | Validation |
|---|---|---|
| model | yes | model.onnx, > 0 và <= 5 MiB |
| semver | yes | Semantic Versioning x.y.z, không trùng |
| metrics | yes | JSON object; accuracy fields trong [0,1], latency >= 0, quantization không rỗng |

Metrics tối thiểu SHALL theo contract:

| Field | Required | Validation / Meaning |
|---|---|---|
| top1AccuracyTestA | yes | number trong [0,1] |
| top3AccuracyTestA | yes | number trong [0,1] |
| top1AccuracyTestB | no | number trong [0,1]; null/absent khi dự án đi theo nhánh không có Test B |
| worstClassRecall | yes | number trong [0,1] |
| idleFalsePositivesPer60s | yes | number >= 0 |
| browserLatencyMs | yes | number >= 0; đo bằng onnxruntime-web trên thiết bị được mô tả |
| throughputPredictionsPerSecond | yes | number >= 0 |
| quantization | yes | non-empty string |
| goldenSampleCount | yes | integer đúng bằng 20 |
| goldenMaxLogitDiff | yes | number >= 0 và bắt buộc < 0.001 |
| benchmarkEnvironment | yes | object có browser, browserVersion, os, cpu, wasmThreads và measuredAt UTC |
| datasetManifestSha256 | yes | 64 lowercase hex của immutable dataset manifest |
| splitManifestSha256 | yes | 64 lowercase hex của immutable subject split manifest |
| trainingCodeCommit | yes | Git commit SHA của training/export code |
| trainedAt | yes | ISO-8601 UTC |
| subjectSplitAssignments | yes | array gồm participantCode và split TRAIN/VAL/TEST_A/TEST_B |
| perSubjectAccuracy | yes | array gồm participantCode, split TEST_A/TEST_B, top1Accuracy [0,1], top3Accuracy [0,1], sampleCount > 0 |
| accuracyByMetadata | yes | aggregate một chiều theo handedness, knowsVsl, ageGroup và region |
| knownLimitations | yes | non-empty string array |

modelSizeBytes SHALL được backend tính từ artifact, không tin giá trị caller. Registry SHALL kiểm tra top3AccuracyTestA >= top1AccuracyTestA; mọi participantCode tồn tại và mỗi participant chỉ xuất hiện trong đúng một split; participant có is_team_member = true chỉ được ở TRAIN; VAL, TEST_A và TEST_B chỉ chứa người ngoài nhóm; participant có knows_vsl = true chỉ được ở TEST_B khi nhánh Test B tồn tại. perSubjectAccuracy SHALL chỉ chứa participant thuộc TEST_A/TEST_B, mỗi cặp participantCode + split không trùng và top3Accuracy >= top1Accuracy. accuracyByMetadata SHALL chứa bốn array handedness, knowsVsl, ageGroup và region; mỗi phần tử có key, accuracy trong [0,1] và sampleCount > 0. T-02 chặn registration; top1AccuracyTestA, browserLatencyMs và modelSizeBytes quyết định release_eligible/activation, còn các metric khác được báo cáo nhưng không chặn activation.

GET /api/model/active response:

~~~json
{
  "id": "uuid",
  "semver": "1.2.0",
  "labelsHash": "64-lowercase-hex",
  "artifactSha256": "64-lowercase-hex",
  "downloadUrl": "short-lived-presigned-url",
  "downloadUrlExpiresAt": "2026-08-20T10:15:00Z",
  "inputSignature": {
    "landmarks": {"dtype": "float32", "shape": [1, 60, 75, 4]},
    "mask": {"dtype": "float32", "shape": [1, 60, 3]},
    "timestamps": {"dtype": "float32", "shape": [1, 60]},
    "logits": {"dtype": "float32", "shape": [1, 51]}
  }
}
~~~

### 5.3 Stats API Contracts

GET /api/stats/public SHALL trả:

~~~json
{
  "scope": "PUBLIC_CONSENTED",
  "generatedAt": "2026-08-20T10:00:00Z",
  "totalClips": 0,
  "acceptedClips": 0,
  "rejectedClips": 0,
  "needsReviewClips": 0,
  "pendingClips": 0,
  "totalContributors": 0,
  "totalClasses": 51,
  "averageClipsPerContributor": 0.0,
  "rejectionRate": 0.0,
  "clipsPerClass": [
    {"labelId": 0, "code": "idle", "count": 0}
  ],
  "metadataDistribution": {
    "region": [],
    "handedness": [],
    "knowsVsl": [],
    "ageGroup": []
  },
  "modelEvaluationStatus": "AVAILABLE",
  "publishedTestSubjectCount": 1,
  "withheldTestSubjectCount": 0,
  "activeModelEvaluation": {
    "semver": "1.2.0",
    "top1AccuracyTestA": 0.0,
    "top3AccuracyTestA": 0.0,
    "top1AccuracyTestB": null,
    "top3AccuracyTestB": null,
    "browserLatencyMs": 0.0,
    "throughputPredictionsPerSecond": 0.0,
    "modelSizeBytes": 0,
    "quantization": "int8",
    "goldenSampleCount": 20,
    "goldenMaxLogitDiff": 0.0001,
    "perSubjectAccuracy": [
      {"evaluationAlias": "TEST-A-01", "split": "TEST_A", "top1Accuracy": 0.0, "top3Accuracy": 0.0, "sampleCount": 1}
    ],
    "accuracyByMetadata": {
      "handedness": [],
      "knowsVsl": [],
      "ageGroup": [],
      "region": []
    },
    "knownLimitations": ["Model recognizes isolated signs, not continuous VSL sentences."]
  }
}
~~~

clipsPerClass SHALL có đúng 51 phần tử theo thứ tự shared/labels.json; ví dụ trên chỉ minh họa shape, không phải response đầy đủ.

Trong mỗi split, Stats Service SHALL lọc publish_dataset consent, sắp xếp subject theo participant code nội bộ tăng dần rồi gán alias TEST-A-01... hoặc TEST-B-01...; mapping alias-to-code SHALL không được trả hoặc ghi log.

GET /api/admin/stats SHALL dùng scope = ADMIN_INTERNAL và bổ sung contributorProgress, rejectionRateBySign và modelMetricsHistory.

### 5.4 Canonical Labels Hash

Canonical labels hash SHALL được tạo bằng quy trình duy nhất:

1. đọc shared/labels.json dưới dạng UTF-8 và parse thành JSON;
2. giữ nguyên thứ tự phần tử array;
3. sắp xếp key của mọi object theo thứ tự Unicode code point tăng dần, đệ quy;
4. serialize byte-for-byte tương đương Python json.dumps(parsed, indent=2, sort_keys=True, ensure_ascii=False), với line ending LF, không BOM và không newline cuối file;
5. SHA-256 trên UTF-8 bytes của chuỗi canonical;
6. biểu diễn bằng đúng 64 ký tự hexadecimal lowercase.

scripts/generate_labels.py, ai_pipeline, ONNX exporter, backend validator và frontend generated label metadata SHALL dùng cùng thuật toán này. Hash raw bytes của file chưa canonicalize SHALL NOT được coi là labels hash.

ONNX metadata property bắt buộc:

| Key | Required value |
|---|---|
| label_hash | canonical hash ở trên |

Opset, tensor names, dtypes và shapes SHALL được đọc trực tiếp từ ONNX graph để đối chiếu FR-007; caller-supplied metadata SHALL NOT thay thế graph validation.

### 5.5 Statistical Quality Definitions

- Reference population là các clip ACCEPTED có cùng sign_id, không tính clip đang kiểm tra.
- durationSeconds = timestamp cuối trừ timestamp đầu.
- trajectoryScore là trung bình tốc độ Euclidean 2D mỗi giây của wrist landmark index 0 giữa hai frame capture liên tiếp có delta timestamp > 0, trên left/right hand có tọa độ x, y hữu hạn và validity ở cả hai frame; dùng tọa độ camera-normalized thô trước ONNX preprocessing.
- Với referenceCount >= 10, duration hoặc trajectory là outlier khi absolute z-score > 3.
- Nếu standard deviation = 0, observed bằng reference mean có z-score 0; observed khác mean là outlier.
- Nếu không có cặp wrist landmark hợp lệ với delta timestamp > 0 để tính trajectoryScore, integrity check SHALL fail.
- Standard deviation SHALL là population standard deviation: căn bậc hai của tổng bình phương sai lệch chia cho referenceCount.
- Statistical detector SHALL không thực hiện sign recognition và SHALL không dùng logits.

### 5.6 Error Response

Mọi lỗi API SHALL dùng shape:

~~~json
{
  "code": "STABLE_ERROR_CODE",
  "message": "Human-readable message",
  "correlationId": "uuid",
  "details": {}
}
~~~

details SHALL không chứa credential, presigned URL, raw payload hoặc stack trace.

---

## 6. Acceptance Criteria

### 6.1 Functional Acceptance

- **AC-001 [FR-001]**: Given một model hợp lệ được tạo, when đọc model history, then record có đủ mười một trường bắt buộc và không thể tạo semver trùng.
- **AC-002 [FR-002]**: Given ADMIN, artifact/split/T-02 evidence hợp lệ nhưng accuracy hoặc latency chưa đạt activation gate, when upload, then API vẫn trả 201, model.onnx cùng normalized metrics.json tồn tại ở private R2 path chuẩn, DB record inactive có release_eligible = false và artifact_sha256 bằng hash file.
- **AC-003 [FR-003]**: Given các bản shared labels có cùng JSON semantics nhưng khác whitespace, line ending hoặc object-key order, when canonicalize, then hash giống nhau; array order thay đổi làm hash đổi. Given caller gửi hash giả nhưng ONNX metadata đúng, backend vẫn quyết định theo canonical hash và ONNX metadata.
- **AC-004 [FR-004]**: Given hơn một trang model, when GET history, then kết quả phân trang newest-first, có metadata yêu cầu và không chứa credential/raw URL.
- **AC-005 [FR-005]**: Given model B đạt toàn bộ activation gates và model A active, when activate B hai lần, then cả hai request thành công và database chỉ có B active; model có labels hash cũ hoặc accuracy/latency/size không đạt không thể được kích hoạt.
- **AC-006 [FR-006]**: Given có model active, when GET active, then response đúng contract, không có internal metrics hay participant code, URL tải được object private trước expiry và bị từ chối sau expiry; artifact bị sửa hoặc embedded label hash sai bị frontend từ chối trước ONNX session creation.
- **AC-007 [FR-007]**: Given artifact sai bất kỳ tensor name, dtype, shape, output count hoặc Opset, when upload, then artifact bị từ chối mà backend không chạy inference.
- **AC-008 [FR-008]**: Given clip hoàn tất có đủ dữ liệu, when quality job chạy, then từng integrity/statistical check và threshold được lưu, clip kết thúc ACCEPTED hoặc NEEDS_REVIEW, và worker không lặp lại device-quality checks của Recorder.
- **AC-009 [FR-009]**: Given chỉ có 9 reference clips cùng sign, when quality job chạy, then hai statistical checks được đánh dấu skipped và integrity checks vẫn quyết định.
- **AC-010 [FR-010]**: Given nhiều clip NEEDS_REVIEW khác sign/participant/time, when ADMIN gọi không filter rồi dùng từng filter riêng và kết hợp, then response luôn phân trang, filter được áp dụng trước pagination, chỉ bản ghi khớp được trả và URL private hết hạn sau 15 phút.
- **AC-011 [FR-011]**: Given clip NEEDS_REVIEW, when ADMIN reject với reason, then clip REJECTED và audit reviewer/time/reason được lưu.
- **AC-012 [FR-012]**: Given bốn tổ hợp quality status và use_in_project, when export manifest, then chỉ clip ACCEPTED có use_in_project = true xuất hiện.
- **AC-013 [FR-013]**: Given fixture có accepted/rejected/pending và một label không có clip, when tính stats, then mọi công thức khớp định nghĩa và clipsPerClass vẫn có đủ 51 label.
- **AC-014 [FR-014]**: Given test subjects có/không có publish consent, when GET public stats, then dataset, per-subject metrics và weighted top-1/top-3 chỉ dùng người có consent, dùng TEST-A/TEST-B alias thay participant code, counts/status phản ánh đủ/partial/zero publish consent, không có internal identifier/cross-tab; zero eligible subject tạo null + NO_PUBLISHABLE_TEST_METRICS, còn không có active model vẫn trả dataset stats với activeModelEvaluation = null.
- **AC-015 [FR-015]**: Given ADMIN và dữ liệu fixture, when GET admin stats, then response có scope ADMIN_INTERNAL, contributor progress, rejection by sign và model history gồm per-subject accuracy đúng participant code nội bộ.
- **AC-016 [FR-016]**: Given vocabulary payload có source và references hợp lệ, when ADMIN lưu, then mutation atomic và dữ liệu nguồn/verified order được bảo toàn.
- **AC-017 [FR-017]**: Given ADMIN dashboard, when thực hiện từng flow stats/review/model, then UI gọi đúng API, phản ánh kết quả và hiển thị stable error code khi lỗi.
- **AC-018 [FR-018]**: Given public stats hợp lệ, when mở transparency page, then trang hiển thị generatedAt, giải thích metric, per-subject test accuracy, known limitations và không biến field thiếu thành 0.
- **AC-019 [FR-019]**: Given cùng admin endpoint, when gọi anonymous và authenticated non-admin, then lần lượt nhận 401 và 403, không mutation, không presigned URL.
- **AC-020 [FR-020]**: Given ma trận metadata sai, artifact thiếu/rỗng/quá cỡ/sai ONNX/sai contract, T-02 sai hoặc subject split có identity leakage, when upload, then nhận INVALID_MODEL_METADATA, INVALID_MODEL_ARTIFACT, GOLDEN_CONTRACT_FAILED hoặc EVALUATION_SPLIT_INVALID đúng trường hợp và không có DB/R2 residue.
- **AC-021 [FR-021]**: Given ONNX thiếu hoặc sai label_hash, when upload, then nhận LABELS_HASH_MISMATCH và artifact không được lưu.
- **AC-022 [FR-022]**: Given semver đã tồn tại, when upload lại, then nhận 409 MODEL_VERSION_EXISTS và artifact cũ không đổi.
- **AC-023 [FR-023]**: Given model id không tồn tại hoặc release_eligible = false, when activate, then nhận lỗi tương ứng với validation_results và active model cũ không đổi.
- **AC-024 [FR-024]**: Given lần lượt không có active model và có active model dùng labels hash/signature cũ, when GET active, then nhận 404 NO_ACTIVE_MODEL hoặc 409 ACTIVE_MODEL_INCOMPATIBLE đúng trường hợp, không có URL/meta giả.
- **AC-025 [FR-025]**: Given R2 upload hoặc presign bị fault injection, when request chạy, then nhận 503, DB rollback và không có object mồ côi mới.
- **AC-026 [FR-026]**: Given stats query/schema lỗi hoặc public-scope guard phát hiện consent violation, when GET stats, then nhận 503 STATS_UNAVAILABLE thay vì zero response.
- **AC-027 [FR-027]**: Given status/reason/transition review không hợp lệ, when PATCH clip, then nhận 400 hoặc 409 đúng code và clip không đổi.
- **AC-028 [FR-028]**: Given vocabulary thiếu source hoặc reference invalid, when lưu, then nhận stable 400 code và không có partial mutation.

### 6.2 Non-functional Gates

- **AC-NFR-001 [NFR-001]**: Load test đúng profile chứng minh active endpoint p95 < 50 ms và các GET endpoint còn lại p95 < 500 ms.
- **AC-NFR-002 [NFR-002]**: Security integration test bao phủ mọi /api/admin/** route; R2 policy test chứng minh bucket private và presigned URL hết hạn.
- **AC-NFR-003 [NFR-003]**: Consent fixture test chứng minh public stats/training export tách đúng hai consent flags và không lộ identifier/credential.
- **AC-NFR-004 [NFR-004]**: Concurrency test kích hoạt hai model đồng thời vẫn để lại đúng một active; migration constraint chặn semver trùng.
- **AC-NFR-005 [NFR-005]**: Retry/failure test chứng minh tối đa 3 attempts, terminal FAILED observable và clip được đưa NEEDS_REVIEW; timing test đạt ngưỡng 95%/60 giây.
- **AC-NFR-006 [NFR-006]**: Log capture và metrics test chứng minh correlationId tồn tại và secret/presigned/raw payload không xuất hiện.
- **AC-NFR-007 [NFR-007]**: Contract test xác nhận UTF-8, UTC ISO-8601 và đúng Opset/tensor contract; CI T-02 độc lập chạy đúng 20 samples và chứng minh max logit diff < 0.001 trước release.
- **AC-NFR-008 [NFR-008]**: Traceability check xác nhận mỗi FR/NFR có ít nhất một test mapping bằng requirement id.

---

## 7. Out of Scope

- Backend endpoint /predict, server-side ONNX inference hoặc xử lý webcam stream.
- Huấn luyện, fine-tune, quantize hoặc tự động chọn model tốt nhất.
- Thay đổi contract tensor đã phê duyệt trong Spec 010.
- Public R2 bucket cho model, video hoặc landmark.
- Upload video/landmark đi xuyên qua Spring Boot; Recorder tiếp tục direct upload bằng presigned URL.
- Workflow phê duyệt nhiều cấp hoặc role quản trị ngoài ADMIN.
- Công bố raw clip/dataset ra internet.
- Thay thế module Consent/Collection của P3 hoặc AI pipeline của P1; feature này chỉ tích hợp qua contract.

---

## 8. Open Questions & Assumptions

### Resolved Decisions

1. Contract model lấy Spec 010 làm chuẩn: landmarks [1,60,75,4], mask [1,60,3], timestamps [1,60], logits [1,51].
2. labels hash là SHA-256 của canonical JSON theo mục 5.4, không phải hash raw bytes tùy line ending.
3. Model R2 object luôn private; public client tải bằng presigned URL 15 phút.
4. Public stats chỉ dùng publish_dataset = true; training export dùng use_in_project = true.
5. Khi stats dependency lỗi, API trả 503; không giả lập zero dataset.
6. Idle là label id 0 theo shared/labels.json; totalClasses hiện tại là 51.

### Assumptions

- Spec 010 và shared/labels.json là nguồn sự thật hiện hành cho model contract và labels.
- P3 cung cấp participants, consents, recording_sessions và clips trước khi integration tests của Stats/Quality chạy.
- Consent records bất biến theo version; record có signed_at mới nhất là consent hiệu lực.
- ADMIN authentication/role được module auth hiện có cung cấp.
- R2 client có thể upload, HEAD/check object, delete và tạo presigned GET URL nhưng credential không lộ qua API.

### Open Questions

Không còn câu hỏi chặn bước planning. Nếu contract của P1 hoặc schema consent thay đổi, Spec 011 SHALL được cập nhật trước khi sửa implementation.
