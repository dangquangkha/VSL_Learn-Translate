# Tasks: PyTorch ONNX Graph Export and Preprocessing

**Feature**: `003-onnx-export` | **Branch**: `003-onnx-export`  
**Input Documents**: [`spec.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/spec.md), [`plan.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/plan.md), [`research.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/research.md), [`data-model.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/data-model.md), [`onnx_graph_contract.md`](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/contracts/onnx_graph_contract.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Goal**: Initialize directory layout and pipeline structure for PyTorch preprocessing and ONNX export.

- [X] T001 Initialize directory layout in `ai_pipeline/preprocessing/`, `ai_pipeline/export/`, and `ai_pipeline/tests/`
- [X] T002 Verify `shared/labels.json` accessibility and hash generation utility in `ai_pipeline/utils/label_hash.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Goal**: Core landmark tensor transformation building blocks and EARS error edge-case handlers required before full graph export.

- [X] T003 [P] Implement sequence length capping (max 120) and `torch.nan_to_num(0.0)` NaN suppression in `ai_pipeline/preprocessing/landmark_cleaner.py` (FR-014)
- [X] T004 [P] Implement shoulder origin translation and shoulder width scaling with `epsilon = 1e-6` protection in `ai_pipeline/preprocessing/shoulder_normalizer.py` (FR-003, FR-004, FR-011)
- [X] T005 [P] Implement 2D shoulder horizontal rotation alignment in `ai_pipeline/preprocessing/rotation_aligner.py` (FR-005)
- [X] T006 [P] Implement 1D grid sample temporal linear interpolation (resampling sequence to 32 frames) in `ai_pipeline/preprocessing/frame_interpolator.py` (FR-006, FR-012)
- [X] T007 [P] Implement temporal frame-to-frame velocity channel computation in `ai_pipeline/preprocessing/velocity_calculator.py` (FR-007)

---

## Phase 3: User Story 1 - Full 7-Step Preprocessing PyTorch Module (Priority: P1) 🎯 MVP

**Goal**: Package all 7 landmark preprocessing steps into a single PyTorch `nn.Module` `forward()` graph ready for unified model forward execution.

**Independent Test**: Execute 20 reference landmark tensors through `LandmarkPreprocessorModule.forward()` and verify output tensor shape is strictly `[1, 32, 333]`.

### Implementation for User Story 1
- [X] T008 [US1] Create unified `LandmarkPreprocessorModule` combining 7 preprocessing steps in `ai_pipeline/preprocessing/preprocessor_module.py` (FR-001 through FR-008)
- [X] T009 [US1] Integrate `LandmarkPreprocessorModule` into main classifier wrapper model in `ai_pipeline/models/vsl_classifier_wrapper.py`
- [X] T010 [US1] Write unit test suite for preprocessing module in `ai_pipeline/tests/test_preprocessor_module.py`

---

## Phase 4: User Story 2 - ONNX Opset 17 Export Script with Metadata (Priority: P2)

**Goal**: Export PyTorch model to ONNX Opset 17 format and embed `label_hash` SHA256 string into ONNX metadata properties.

**Independent Test**: Export model to `vsl_classifier_v1.onnx` and verify metadata prop `label_hash` matches SHA256 of `shared/labels.json`.

### Implementation for User Story 2
- [X] T011 [US2] Implement ONNX Opset 17 export script with `label_hash` metadata injection in `ai_pipeline/export/export_onnx.py` (FR-009)
- [X] T012 [US2] Implement post-training dynamic int8 model quantization script in `ai_pipeline/export/quantize_onnx.py` (NFR-003)
- [X] T013 [US2] Write verification test for exported ONNX model metadata in `ai_pipeline/tests/test_onnx_metadata.py`

---

## Phase 5: User Story 3 - Golden Integration Contract Test T-02 (Priority: P3)

**Goal**: Automate Golden Test T-02 verifying logit difference between PyTorch and `onnxruntime-web` across 20 reference tensors is $< 1e-3$.

**Independent Test**: Run Golden Integration Test T-02 suite; all 20 reference tensor comparisons must pass with max discrepancy $< 1e-3$.

### Implementation for User Story 3
- [X] T014 [US3] Create 20 reference landmark test tensors in `ai_pipeline/tests/fixtures/golden_tensors.json`
- [X] T015 [US3] Implement Golden Integration Contract Test T-02 runner in `ai_pipeline/tests/test_golden_contract_t02.py` (FR-013, NFR-002, T-02)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Final verification and performance benchmarking.

- [X] T016 Benchmark ONNX model Web Worker inference latency ($\le 50\text{ms}$) and file size ($\le 5\text{MB}$)
- [X] T017 Execute validation scenarios in `specs/003-onnx-export/quickstart.md`

---

## Dependencies & Execution Order

1. **Phase 1 (Setup)**: Can start immediately.
2. **Phase 2 (Foundational)**: Depends on Phase 1. Tasks T003–T007 can be executed in parallel.
3. **Phase 3 (User Story 1 - MVP)**: Depends on Phase 2.
4. **Phase 4 (User Story 2)**: Depends on Phase 3.
5. **Phase 5 (User Story 3)**: Depends on Phase 4.
6. **Phase 6 (Polish)**: Depends on Phase 5.
