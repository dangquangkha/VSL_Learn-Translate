# Data Model & Tensor Schema Specification: PyTorch ONNX Graph Export

**Feature**: 003-onnx-export  
**Date**: 2026-08-18  

## 1. Landmark Input Tensor Schema (`raw_landmarks`)

- **Shape**: `[batch_size, sequence_length, 333]` (Dynamic `sequence_length` $1 \le T \le 120$)
- **Data Type**: `float32`

### Landmark Channel Mapping Breakdown (333 values per frame):
| Feature Group | MediaPipe Source | Count | Channels | Offset Index Range |
|---|---|---|---|---|
| Pose Keypoints | PoseLandmarker (33 points) | 33 | $(x, y, z, v)$ | `0 .. 131` |
| Left Hand | HandLandmarker (21 points) | 21 | $(x, y, z)$ | `132 .. 194` |
| Right Hand | HandLandmarker (21 points) | 21 | $(x, y, z)$ | `195 .. 257` |
| Core Face Contour | FaceLandmarker (25 keypoints)| 25 | $(x, y, z)$ | `258 .. 332` |

---

## 2. Preprocessed Feature Tensor Schema (`preprocessed_features`)

- **Shape**: `[batch_size, 32, 333]` (Fixed sequence length 32)
- **Data Type**: `float32`
- **Internal Pipeline Transformations**:
  - `Sequence Capping & NaN Cleaning`: `clamp_length(T, max=120)`, `nan_to_num(0.0)`.
  - `Forward Fill`: Impute missing frames.
  - `Origin Alignment`: Midpoint of Left Shoulder (ID 11) & Right Shoulder (ID 12) mapped to $(0,0,0)$.
  - `Width Normalization`: Scaled by $\frac{1}{\text{dist}(L_{11}, R_{12}) + 1e-6}$.
  - `2D Horizontal Rotation`: $\theta = \arctan2(\Delta y, \Delta x)$ rotation around Z-axis.
  - `Grid Interpolation`: Resampled to 32 uniform temporal frames.
  - `Velocity Vectors`: Interleaved temporal diffs $(\Delta x, \Delta y, \Delta z)$.

---

## 3. Classification Output Logits Schema (`logits`)

- **Shape**: `[batch_size, 51]`
- **Data Type**: `float32`
- **Classes**: 50 VSL Vocabulary Signs + 1 `idle` class (Index 0..50 auto-generated from `shared/labels.json`).

---

## 4. ONNX Graph Embedded Metadata Schema

| Property Key | Type | Example / Format | Constraint |
|---|---|---|---|
| `label_hash` | `string` | `a3b8e91c...` (64 hex characters) | SHA256 hash of `shared/labels.json` |
| `opset_version` | `int` | `17` | Standard ONNX Opset 17 |
| `model_author` | `string` | `VSL AI Pipeline` | Metadata tracking |
