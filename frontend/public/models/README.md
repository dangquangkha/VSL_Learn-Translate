# Thư mục này chứa file ONNX model
# - vsl_model.onnx  ← P1 sẽ đặt ONNX giả (dummy weights, đúng shape) vào đây
# Model được nạp qua Web Worker, không bao giờ gửi lên server

# SHAPE CONTRACT (từ PHAN_CONG.md §6):
#   Input:  "input"  — float32 [1, 32, 55, 3]
#   Output: "output" — float32 [1, 51]
#   Metadata: label_hash = SHA256 của shared/labels.json codes

# Để test local khi chưa có file ONNX thật:
# P1 chạy: cd ai_pipeline && python export/export_onnx.py
# Sau đó copy models/vsl_model.onnx vào thư mục này
