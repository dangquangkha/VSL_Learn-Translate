# ONNX Graph Interface Contract: `vsl_classifier_v1.onnx`

**Feature**: 003-onnx-export  
**Opset Version**: 17  
**Runtime Compatibility**: `onnxruntime-web` (WebGL / WebAssembly)  

---

## 1. Input Tensors

### `raw_landmarks`
- **Type**: `float32[batch_size, sequence_length, 333]`
- **Description**: Raw concatenated landmark coordinates extracted from MediaPipe Tasks Vision Web Workers.
- **Constraints**:
  - `batch_size`: 1 (Client-side single user real-time inference window).
  - `sequence_length`: Dynamic integer $1 \le T \le 120$.
  - `333`: Concatenated 3D coordinates $(132 \text{ pose} + 63 \text{ left hand} + 63 \text{ right hand} + 75 \text{ face})$.

---

## 2. Output Tensors

### `logits`
- **Type**: `float32[1, 51]`
- **Description**: Raw classification logits across 51 VSL target classes (50 VSL sign words + 1 `idle` class).
- **Post-processing on Client**: Web Worker applies `Softmax(logits)` to retrieve class probabilities.

---

## 3. Graph Metadata Properties

Client runtime MUST inspect metadata properties before initializing the `InferenceSession`:

```json
{
  "label_hash": "<64-hex SHA256 string matching shared/labels.json>",
  "opset_version": "17",
  "export_timestamp": "ISO-8601 UTC timestamp",
  "framework": "PyTorch 2.x -> ONNX Opset 17"
}
```

If `label_hash` does not match the frontend local label bundle SHA256, the `ONNX Engine` MUST abort session initialization with error `ERR_LABEL_HASH_MISMATCH`.
