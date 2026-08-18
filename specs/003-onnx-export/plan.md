# Implementation Plan: PyTorch ONNX Graph Export and Preprocessing

**Branch**: `003-onnx-export` | **Date**: 2026-08-18 | **Spec**: [spec.md](file:///D:/AI_VoiceChat/VSL_Learn%20&%20Translate/specs/003-onnx-export/spec.md)

---

## Summary

Build and package the 7-step landmark preprocessing pipeline natively into the PyTorch model graph (`forward()`) when exporting to ONNX Opset 17 format. Ensure zero training/serving skew by allowing client JavaScript/Web Workers to pass raw MediaPipe landmark tensors directly into the ONNX session. Embed `label_hash` metadata from `shared/labels.json` and enforce the Golden Integration Contract Test (T-02) with a logit discrepancy threshold $< 1e-3$.

---

## Technical Context

- **Language/Version**: Python 3.11+, PyTorch 2.x, ONNX 1.15+, ONNX Opset 17
- **Primary Dependencies**: `torch`, `onnx`, `onnxruntime`, `onnxruntime-web`
- **Storage**: ONNX model binary stored on Cloudflare R2 / Local client cache
- **Testing**: `pytest`, Golden Contract Integration Test T-02
- **Target Platform**: Browser Client (WebAssembly / WebGL via `onnxruntime-web`)
- **Project Type**: AI Pipeline / Web Client ML Component
- **Performance Goals**: Combined preprocessing + classification inference time $\le 50\text{ms}$ per window
- **Constraints**: Int8 quantized ONNX model file size $\le 5\text{MB}$, zero backend inference (`/predict` endpoint prohibited)

---

## Constitution Check

*GATE: All checks PASSED.*

| Constitution Principle | Compliance Status | Implementation Strategy |
|---|---|---|
| **I. Client-Side Inference Zero Backend Predict** | PASS | Preprocessing & classification run 100% inside ONNX graph loaded by client browser. |
| **II. Single Source of Truth for Class Labels** | PASS | `label_hash` derived from `shared/labels.json` embedded in ONNX metadata props. |
| **III. Strict Training/Serving Skew Prevention** | PASS | All 7 preprocessing steps compiled natively into PyTorch graph `forward()`. |
| **VII. Executable Spec & EARS Notation** | PASS | All requirements tagged with EARS (`FR-001` to `FR-014`). Golden Test T-02 threshold $< 1e-3$. |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-onnx-export/
├── spec.md              # Feature Specification (EARS Notation)
├── plan.md              # Implementation Plan ($speckit-plan output)
├── research.md          # Phase 0 Research Findings
├── data-model.md        # Phase 1 Data Model & Tensor Schemas
├── quickstart.md        # Phase 1 Quickstart Validation Guide
├── contracts/           # Phase 1 ONNX Graph Metadata & Interface Contract
│   └── onnx_graph_contract.md
└── checklists/
    └── requirements.md  # Specification Quality Checklist
```

### Source Code Layout

```text
ai_pipeline/
├── preprocessing/
├── models/
├── export/
│   └── export_onnx.py
└── tests/
    └── test_golden_contract_t02.py

shared/
└── labels.json

frontend/
└── src/
    └── services/
        └── onnx_engine.ts
```

---

## Complexity Tracking

> No constitution violations detected. Standard zero-skew ONNX Opset 17 export pattern applied.
