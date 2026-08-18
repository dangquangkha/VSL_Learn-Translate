import torch
import torch.nn as nn
from ai_pipeline.preprocessing.preprocessor_module import LandmarkPreprocessorModule

class VSLClassifierWrapper(nn.Module):
    def __init__(self, num_classes: int = 51):
        super().__init__()
        self.preprocessor = LandmarkPreprocessorModule()
        # Sample dummy linear backbone classifier for 51 VSL target classes
        self.backbone = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 333, 256),
            nn.ReLU(),
            nn.Linear(256, num_classes)
        )

    def forward(self, raw_landmarks: torch.Tensor) -> torch.Tensor:
        # raw_landmarks: [B, T, 333]
        preprocessed = self.preprocessor(raw_landmarks) # [B, 32, 333]
        logits = self.backbone(preprocessed) # [B, 51]
        return logits
