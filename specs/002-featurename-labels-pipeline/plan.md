# Implementation Plan: Core Labels & Generator Pipeline

**Branch**: `002-featurename-labels-pipeline`  
**Spec**: [spec.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/spec.md)  
**Created**: 2026-08-18  

---

## Technical Context

- **Target Files**:
  - `shared/labels.json` (Source of Truth)
  - `scripts/generate_labels.py` (Generator script)
  - `frontend/src/generated/labels.ts` (Frontend generated file)
  - `ai_pipeline/generated/labels.py` (AI Pipeline generated file)
- **Tech Stack**: Python 3.11+, TypeScript, Node/Web environment.
- **Security / Integrity**: Deterministic JSON normalization, LF line-ending enforcement, SHA256 & MD5 hash calculation.

---

## Constitution Check

- [x] **Principle I: Client-Side Inference Zero Backend Predict**: Verified. Generator script is offline/build-time only; backend Spring Boot has zero inference/predict endpoints.
- [x] **Principle II: Single Source of Truth for Class Labels**: Verified. `shared/labels.json` is sole source of truth for 51 classes (50 VSL + 1 `idle`). Hash check embedded in `.onnx` model metadata and `labels.ts`.
- [x] **Principle VII: Executable Specification (EARS Notation)**: Verified. All requirements trace 1:1 to EARS tags (`FR-001` to `FR-009`).

---

## Research & Design Artifacts

- **Phase 0 (Research)**: [research.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/research.md) - Standardized deterministic JSON serialization & LF hash strategy.
- **Phase 1 (Data Model)**: [data-model.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/data-model.md) - Schema for `shared/labels.json`, `labels.ts`, and `labels.py`.
- **Phase 1 (Contracts)**: [labels-schema.json](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/contracts/labels-schema.json) - Formal JSON schema for label validation.
- **Phase 1 (Quickstart Guide)**: [quickstart.md](file:///d:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/002-featurename-labels-pipeline/quickstart.md) - Step-by-step validation guide for generator and hash checking.

## Project Structure

### Documentation (this feature)

```text
specs/002-featurename-labels-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # JSON schema files
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
