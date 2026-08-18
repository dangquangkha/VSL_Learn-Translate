# Phase 0 Research: PyTorch ONNX Graph Export & Preprocessing

**Feature**: 003-onnx-export  
**Date**: 2026-08-18  

## Research Decisions & Technical Architecture

### 1. PyTorch Graph Preprocessing Operators (Opset 17)

- **Decision**: Implement all 7 preprocessing steps as native `nn.Module` forward operations in PyTorch without using custom non-standard C++ ops.
- **Rationale**: Standard PyTorch ops (`torch.nan_to_num`, slicing, arithmetic, `torch.nn.functional.grid_sample` or 1D affine interpolation ops, velocity temporal diffs) trace cleanly to ONNX Opset 17, ensuring zero-dependency execution in `onnxruntime-web` via WASM/WebGL.
- **7 Preprocessing Steps Implementation**:
  1. **NaN & Length Normalization + Forward Fill**: Cap frame count at $T \le 120$ (`x[:, :120, :]`), replace NaNs via `torch.nan_to_num(0.0)`. For missing landmark detections in consecutive frames, compute forward-fill using cummax masks or sequential step masking.
  2. **Shoulder Origin Translation**: Calculate midpoint $M = \frac{L_{11} + R_{12}}{2}$ (Pose landmark IDs 11 & 12). Subtract $M$ from all 3D landmark points $(x, y, z)$.
  3. **Shoulder Width Scaling**: Compute Euclidean distance $D_{shoulder} = \|L_{11} - R_{12}\|_2$. Scale coordinates by $\frac{1}{D_{shoulder} + 1e-6}$ (preventing division-by-zero).
  4. **2D Shoulder Rotation Alignment**: Compute angle $\theta = \arctan2(y_{R12} - y_{L11}, x_{R12} - x_{L11})$. Rotate $x, y$ coordinates via 2D rotation matrix $R(\theta)$.
  5. **1D Linear Interpolation to 32 Frames**: Resample frame dimension from $T$ to fixed 32 frames using 1D grid sampling / linear interpolation (`torch.nn.functional.interpolate` or `grid_sample`).
  6. **Velocity Channel Calculation**: Compute temporal difference vectors $\Delta x_t = x_t - x_{t-1}, \Delta y_t = y_t - y_{t-1}, \Delta z_t = z_t - z_{t-1}$ with zero-padding for $t=0$.
  7. **Tensor Concatenation**: Concatenate base coordinates and velocity channels, returning standardized shape `[1, 32, 333]` to sign backbone classifier.

---

### 2. Label Hash Embedding into ONNX Metadata

- **Decision**: Compute SHA256 of `shared/labels.json` during PyTorch export and inject key `label_hash` into `onnx_model.metadata_props`.
- **Rationale**: Guarantees Principle II of Constitution (Single Source of Truth for Class Labels) and enables frontend pre-flight verification before loading model weights.
- **Alternatives Considered**: Hardcoding label array inside JS bundle (rejected due to training/serving skew risk if labels update).

---

### 3. Int8 Quantization Strategy

- **Decision**: Apply post-training dynamic int8 quantization using `onnxruntime.quantization.quantize_dynamic` (`WeightOnly` / `QUInt8`).
- **Rationale**: Shrinks exported ONNX graph size to $\le 5\text{MB}$ while retaining logit accuracy within $< 1e-3$ of float32 PyTorch execution on WebGL/WASM runtimes.

---

### 4. CI Golden Integration Contract Test (T-02)

- **Decision**: Build automated test runner executing 20 reference tensor samples through both PyTorch `.forward()` and `onnxruntime-web` (or `onnxruntime` Python reference).
- **Rationale**: Enforces Constitution Principle VII and Gate T-02 ($\text{max\_abs\_diff} < 1e-3$).
