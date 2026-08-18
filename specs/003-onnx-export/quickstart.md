# Quickstart & Validation Guide: PyTorch ONNX Graph Export

**Feature**: 003-onnx-export  
**Date**: 2026-08-18  

## Prerequisites

- Python 3.11+ with PyTorch 2.x and `onnx`, `onnxruntime` installed.
- Node.js 18+ (for Web Worker ONNX Runtime Web contract checks).

---

## 1. Export PyTorch Model with Graph Preprocessing & Metadata

Run the PyTorch ONNX export script from Python:

```bash
python ai_pipeline/export_onnx.py --model-path models/vsl_model.pth --output models/vsl_classifier_v1.onnx --opset 17
```

**Expected Output**:
- File `models/vsl_classifier_v1.onnx` generated ($\le 5\text{MB}$ post int8 quantization).
- Metadata property `label_hash` embedded matching `shared/labels.json`.

---

## 2. Execute Golden Integration Contract Test (T-02)

Validate zero training/serving skew between PyTorch float32 forward pass and ONNX Runtime execution across 20 reference tensors:

```bash
pytest ai_pipeline/tests/test_golden_contract_t02.py
```

**Validation Pass Criteria**:
- Maximum absolute logit difference $\max | \text{logits}_{\text{PyTorch}} - \text{logits}_{\text{ONNX}} | < 1e-3$.
- 0 exceptions on NaN values or missing shoulder landmarks ($D_{\text{shoulder}} = 0$).

---

## 3. Web Worker Contract Verification (Client-side)

Verify ONNX model metadata inspection on frontend:

```bash
npm run test:onnx-metadata
```

**Validation Pass Criteria**:
- Client successfully reads `label_hash` from model metadata.
- Session initializes cleanly without `ERR_LABEL_HASH_MISMATCH`.
