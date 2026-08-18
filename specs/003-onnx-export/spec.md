# Feature Specification: PyTorch ONNX Graph Export and Preprocessing

**Feature Branch**: 003-onnx-export
**Created**: 2026-08-18
**Status**: Draft
**Owner**: AI Agent (Antigravity / Codex)
**Input**: User description: Spec 02: PyTorch ONNX Graph Export and Preprocessing (spec-02-onnx-export.md) - Formal Spec

---

## 1. Context and Goal

- **Business Context**: Trong he thong suy luan AI Ngon ngu Ky hieu Viet Nam (VSL) chay 100% tren trinh duyetch client, su sai lech du lieu giua moi truong huan luyen (Python/PyTorch) va moi truong suy luan (JavaScript/ONNX Runtime Web) — goi la **Training/Serving Skew** — la nguyen nhan hang dau gay ra sut giam do chinh xac hoac sai lech du doan.
- **Feature Goal**: Dong goi toan bo **7 buoc tien xu ly tensor 3D landmark** truc tiep vao **PyTorch Native ONNX Graph (forward())** khi xuat mo hinh (Opset 17). Dam bao JavaScript client chi viec gui tensor landmark tho thu thap tu MediaPipe thang vao mo hinh ONNX ma khong can thuc hien bat ky phep toan tien xu ly hay chuan hoa toan hoc nao o phia Web Worker.
- **Success Metrics**: 
  - 100% logic tien xu ly (forward-fill, dich vai, scale vai, xoay 2D, noi suy 32 khung hinh, tinh van toc) chay ben trong graph ONNX Opset 17.
  - Sai lech logits giua PyTorch native execution va ONNX Runtime Web tren 20 mau chuan < 1e-3 (Dat tieu chuan Golden Integration Contract Test T-02 trong Constitution).
  - Kich thuoc mo hinh ONNX sau xuat va luong hoa int8 <= 5MB.
  - Thoi gian suy luan ONNX graph (bao gom ca chuoi 7 buoc tien xu ly) tren Client Web Worker <= 50ms cho moi cua so danh gia.
- **Technical Context**: 
  - Framework: PyTorch 2.x, ONNX Opset 17.
  - Input Tensor tho: [batch_size, sequence_length, 333] chua toa do tho (x, y, z, v) tu MediaPipe (Pose, Left Hand, Right Hand, Face).
  - Output Preprocessed Tensor: [1, 32, 333] san sang di vao mang phan loai.
  - Embedded Metadata: Ma bam LABEL_HASH_SHA256 cua shared/labels.json duoc nhung truc tiep vao metadata props cua ONNX Graph.

---

## 2. Actors and Roles

| Actor | Description | Permissions |
|---|---|---|
| AI Pipeline Worker | Tien trinh huan luyen va xuat mo hinh PyTorch trong moi truong Python | Quyen doc shared/labels.json va xuat file .onnx mo hinh |
| Client ONNX Engine | Trinh duyetch Client tai mo hinh .onnx va thuc hien ONNX Runtime Web | Quyen doc metadata cua model ONNX, truyen tensor tho vao graph va nhan ket qua logits |
| MediaPipe Web Worker | Tien trinh thu thap landmark tu webcam video stream | Quyen trich xuat landmark tho (x, y, z, v) va day vao ONNX input buffer |

---

## 3. Functional Requirements (EARS Notation)

### 3.1 Core Logic and Behavior (7 Preprocessing Steps in PyTorch Graph)
- **FR-001 (Ubiquitous)**: THE PyTorch model graph SHALL accept raw landmark tensor input of shape [batch_size, T, 333] where T is variable frame count and 333 represents concatenated 3D coordinates from MediaPipe.
- **FR-002 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 1 (Forward-fill missing landmark detections) across missing frame keypoints natively using PyTorch tensor ops.
- **FR-003 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 2 (Shoulder Origin Translation) by shifting all 3D landmark coordinates relative to the midpoint of left shoulder (landmark ID 11) and right shoulder (landmark ID 12).
- **FR-004 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 3 (Shoulder Width Scaling) by scaling all landmark coordinates inversely proportional to the Euclidean distance between left and right shoulders.
- **FR-005 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 4 (2D Shoulder Rotation Alignment) by rotating coordinates on the 2D plane so that the shoulder axis aligns horizontally (0 deg).
- **FR-006 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 5 (Linear Interpolation to 32 Frames) downsampling or upsampling variable-length frame sequences to fixed 32 frames using 1D grid interpolation.
- **FR-007 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 6 (Velocity Channel Calculation) computing temporal frame-to-frame velocity vectors (delta_x, delta_y, delta_z).
- **FR-008 (Ubiquitous)**: THE PyTorch model graph forward() method SHALL execute Step 7 (Tensor Concatenation) reshaping and outputting the standardized feature tensor [1, 32, 333] to the sign classifier backbone.
- **FR-009 (Event-driven)**: WHEN exporting the PyTorch graph to ONNX format, THE export script SHALL set opset_version=17 and embed the LABEL_HASH_SHA256 string into onnx_model.metadata_props['label_hash'].

### 3.2 Error Handling and Failure Modes (Unwanted Patterns)
- **FR-010 (Unwanted)**: WHERE frame timestamp sequence contains negative or non-increasing values, THE ONNX graph preprocessor SHALL distinguish padding zero frames from lost detection frames and suppress NaN gradient calculations.
- **FR-011 (Unwanted)**: WHERE distance between left and right shoulders is zero (e.g. total occlusion), THE PyTorch scaling step SHALL add an epsilon = 1e-6 denominator offset to prevent division-by-zero runtime exceptions.
- **FR-012 (Unwanted)**: WHERE raw landmark input sequence has fewer than 2 frames, THE interpolation module SHALL pad duplicate frames to satisfy the minimum length requirements of 32-frame 1D interpolation.
- **FR-013 (Unwanted)**: WHERE logit output discrepancy between PyTorch forward pass and ONNX Runtime Web execution on 20 reference samples exceeds 1e-3, THE CI Golden Test runner SHALL fail the build gate and prevent model deployment.
- **FR-014 (Unwanted)**: WHERE raw landmark input sequence exceeds 120 frames or contains NaN values from MediaPipe, THE PyTorch ONNX graph preprocessor SHALL truncate sequence length to 120 frames maximum and apply torch.nan_to_num(0.0) natively inside forward() prior to grid interpolation.

---

## 4. Non-Functional Requirements

- **NFR-001 (Performance & Latency)**: Combined preprocessing and classification inference time per window <= 50ms on standard WebGL/WASM client devices.
- **NFR-002 (Accuracy & Skew)**: Zero Training/Serving Skew — logit discrepancy between PyTorch and ONNX Runtime Web < 1e-3.
- **NFR-003 (Resource Envelope)**: Exported int8 quantized ONNX model file size <= 5MB. Memory allocation during ONNX session inference <= 150MB.

---

## 5. Data Model and Schema

- **Input Tensor Structure**: [batch_size, sequence_length, 333]
  - Pose Landmarks: 33 points x 4 values (x, y, z, v) = 132
  - Left Hand Landmarks: 21 points x 3 values (x, y, z) = 63
  - Right Hand Landmarks: 21 points x 3 values (x, y, z) = 63
  - Face Core Landmarks: 25 key points x 3 values (x, y, z) = 75
  - Total per frame: 132 + 63 + 63 + 75 = 333 values.
- **Processed Model Output**: [batch_size, 51] (Raw logits for 51 VSL sign classes).
- **ONNX Graph Metadata**:
  - label_hash: SHA256 string (64 hex characters matching shared/labels.json).
  - opset_version: 17.

---

## 6. Acceptance Criteria (Given-When-Then BDD)

- [ ] **AC-001**: **Given** PyTorch model chua chuoi 7 buoc tien xu ly trong forward(), **When** thuc hien export ONNX Opset 17, **Then** file .onnx tao ra chua day du metadata label_hash trung khop voi shared/labels.json.
- [ ] **AC-002**: **Given** 20 mau landmark tho chuan (golden reference tensors), **When** so sanh ket qua logits dau ra giua PyTorch Python va ONNX Runtime Web, **Then** sai so tuyet doi lon nhat < 1e-3.
- [ ] **AC-003**: **Given** chuoi khung hinh tho bi mat vai (vai trung vi tri hoac an toan bo), **When** di qua ONNX preprocessing graph, **Then** graph xu ly an toan nho hang so epsilon = 1e-6, khong bi nem loi chia cho 0 hay tra ve gia tri NaN.
- [ ] **AC-004**: **Given** mo hinh ONNX da xuat, **When** ap dung int8 quantization, **Then** kich thuoc file <= 5MB va thoi gian suy luan tren trinh duyetch <= 50ms.

---

## 7. Out of Scope

- **OOS-001**: Khong viet lai logic toan tien xu ly bang JavaScript/TypeScript phia Client (Tuan thu nghiem ngat Constitution Principle III: Strict Training/Serving Skew Prevention).
- **OOS-002**: Khong huan luyen lai trong so mo hinh mang phan loai backbone trong pham vi Spec nay.
- **Boundary Constraints for AI Agent**:
  - KHONG duoc phep trich xuat hay xu ly tien xu ly toan hoc ben ngoai ONNX Graph.
  - KHONG sua doi giao dien dinh dang 333 landmark tu MediaPipe.

---

## Clarifications

### Session 2026-08-18
- Q: Would you like to clarify how non-standard frame inputs (e.g. sequences longer than 120 frames or sequence dimension containing NaN values from MediaPipe) should be handled prior to grid interpolation? → A: Truncate frames > 120 and convert NaNs to 0.0 natively inside the PyTorch graph (Option A).

## 8. Open Questions and Assumptions

- **Assumptions**: 
  - MediaPipe Tasks Vision tra ve dung 333 gia tri landmark tho theo chuan index (132 pose + 63 left hand + 63 right hand + 75 face core).
  - Opset 17 ho tro day du cac toan tu ONNX 1D grid sample/interpolation va slicing.
- **Open Questions**: Khong co.
