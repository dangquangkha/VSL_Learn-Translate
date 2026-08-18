# Implementation Tasks: Core Labels & Generator Pipeline

**Feature Branch**: `002-featurename-labels-pipeline`  
**Spec**: [spec.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/spec.md)  
**Plan**: [plan.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/plan.md)  
**Created**: 2026-08-18  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared infrastructure and schema configuration

- [x] T001 Initialize target directories `shared/`, `scripts/`, `frontend/src/generated/`, `ai_pipeline/generated/`
- [x] T002 Create initial `shared/labels.json` Single Source of Truth file containing 51 class labels (50 VSL sign classes + 1 `idle` class at index 0)
- [x] T003 [P] Verify project dependencies for JSON schema validation and cryptographic hashing in Python 3.11+

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core validation script & hash calculation framework

- [x] T004 Implement deterministic JSON string formatting and LF line-ending normalization helper in `scripts/generate_labels.py`
- [x] T005 Implement SHA256 & MD5 hash calculator in `scripts/generate_labels.py`
- [x] T006 Implement structural validation logic in `scripts/generate_labels.py` (checking exact 51 total classes, `idle` at index 0, non-empty fields, unique slugs)

---

## Phase 3: User Story 1 - Core Label Generation & Artifact Export (Priority: P1) 🌟 MVP

**Goal**: Automatically generate type-safe `labels.ts` for Frontend and `labels.py` for AI Pipeline with embedded hashes

**Independent Test**: Execute `python scripts/generate_labels.py` and confirm `frontend/src/generated/labels.ts` and `ai_pipeline/generated/labels.py` are created with identical embedded SHA256/MD5 hashes.

### Implementation for User Story 1

- [x] T007 [P] [US1] Implement TypeScript code generator template in `scripts/generate_labels.py` exporting `LabelItem` interface, `LABEL_HASH_SHA256`, `LABEL_HASH_MD5`, `TOTAL_CLASSES`, and `LABELS` to `frontend/src/generated/labels.ts`
- [x] T008 [P] [US1] Implement Python code generator template in `scripts/generate_labels.py` exporting `LABEL_HASH_SHA256`, `LABEL_HASH_MD5`, `TOTAL_CLASSES`, `LABELS`, `LABEL_TO_ID`, and `ID_TO_LABEL` to `ai_pipeline/generated/labels.py`
- [x] T009 [US1] Connect validation, hash calculation, TS generator, and Python generator in `scripts/generate_labels.py` main execution flow
- [x] T010 [US1] Run `python scripts/generate_labels.py` to produce initial `frontend/src/generated/labels.ts` and `ai_pipeline/generated/labels.py`

---

## Phase 4: User Story 2 - Hash Integrity Verification & Mismatch Rejection (Priority: P2)

**Goal**: Reject ONNX model loading at Frontend runtime if model metadata hash does not match embedded hash in `labels.ts`

**Independent Test**: Load an ONNX model with mismatched hash prop in ONNX Runtime Web client initialization and verify immediate error exception and rejection.

### Implementation for User Story 2

- [x] T011 [P] [US2] Implement ONNX export metadata embedding in PyTorch export script (`ai_pipeline/export_onnx.py`) inserting `LABEL_HASH_SHA256` into model graph metadata props
- [x] T012 [P] [US2] Implement Frontend ONNX session initialization verification helper in `frontend/src/services/onnx_session.ts` reading model metadata props and comparing with `LABEL_HASH_SHA256` from `frontend/src/generated/labels.ts`
- [x] T013 [US2] Add model rejection throw logic and error logging in `frontend/src/services/onnx_session.ts` when hash mismatch occurs

---

## Phase 5: User Story 3 - Build & CI Integrity Check (Priority: P3)

**Goal**: Prevent dirty generated files or manual edits from being committed/built in CI/CD pipeline

**Independent Test**: Manually modify `labels.ts` without updating `shared/labels.json`, run CI verification script, and confirm build failure.

### Implementation for User Story 3

- [x] T014 [P] [US3] Implement CI check script `scripts/verify_labels.py` that re-runs generator in memory and diffs against committed `labels.ts` and `labels.py`
- [x] T015 [US3] Integrate `scripts/verify_labels.py` into project build task / pre-commit workflow

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and documentation polish

- [x] T016 [P] Update documentation in `docs/` and `README.md` referencing `shared/labels.json` as Single Source of Truth
- [x] T017 Execute full validation steps per `quickstart.md` and check off `checklists/labels-integrity.md` items

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion.
- **User Story 1 (Phase 3 - MVP)**: Depends on Phase 2 completion.
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (requires generated `labels.ts` & `labels.py`).
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion.
- **Polish (Phase 6)**: Depends on all user stories completed.

### Parallel Opportunities
- T003, T007, T008, T011, T012, T014 marked `[P]` can be developed independently once prerequisites pass.
