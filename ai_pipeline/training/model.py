"""P1-6 — Model thật, dùng chung bộ tiền xử lý trong graph với model giả.

Giữ NGUYÊN `VSLPreprocessorV2` của `vsl_classifier_v2.py`: đó là phần bảo đảm
Zero Training/Serving Skew (`AGENTS.md` §4.2) và nó đã được kiểm chứng parity
PyTorch ↔ ONNX Runtime. Chỉ thay phần backbone phía sau.

Vì sao KHÔNG dùng lại backbone của model giả: nó là `Flatten` + `Linear(32*333 →
64)` = 685K tham số. Với ~200 mẫu train, số tham số nhiều gấp ~3000 lần số mẫu —
nó sẽ học thuộc lòng tập train trong vài epoch và không tổng quát hoá được gì.

Backbone ở đây là CNN 1 chiều theo trục thời gian, ~40K tham số:
  - Chia sẻ trọng số dọc theo 32 bước thời gian (một ký hiệu là chuỗi động tác,
    không phải 32 vị trí độc lập) → ít tham số hơn hẳn `Flatten`.
  - Gộp trung bình toàn cục ở cuối → bớt nhạy với việc động tác rơi vào đoạn nào
    của cửa sổ, đúng thứ ta cần vì cửa sổ trượt cắt ở nhiều vị trí khác nhau.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from ai_pipeline.models.vsl_classifier_v2 import (
    FEATURE_DIM,
    NUM_CLASSES,
    VSLPreprocessorV2,
)


class VSLClassifierV3(nn.Module):
    """Tiền xử lý trong graph + CNN thời gian. Cùng interface 3 tensor với V2."""

    def __init__(
        self,
        num_classes: int = NUM_CLASSES,
        hidden: int = 64,
        dropout: float = 0.3,
    ) -> None:
        super().__init__()
        self.preprocessor = VSLPreprocessorV2()

        # Đầu vào [B, 333, 32] (đã hoán vị) — Conv1d chạy dọc trục thời gian.
        self.features = nn.Sequential(
            nn.Conv1d(FEATURE_DIM, hidden, kernel_size=3, padding=1),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.Conv1d(hidden, hidden, kernel_size=3, padding=1),
            nn.BatchNorm1d(hidden),
            nn.ReLU(),
            nn.AdaptiveAvgPool1d(1),
        )
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(dropout),
            nn.Linear(hidden, num_classes),
        )

    def forward(
        self,
        landmarks: torch.Tensor,
        mask: torch.Tensor,
        timestamps: torch.Tensor,
    ) -> torch.Tensor:
        preprocessed = self.preprocessor(landmarks, mask, timestamps)  # [B,32,333]
        x = preprocessed.transpose(1, 2)  # [B,333,32]
        return self.head(self.features(x))  # [B,num_classes]


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters() if p.requires_grad)
