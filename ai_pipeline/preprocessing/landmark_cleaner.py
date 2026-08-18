import torch
import torch.nn as nn

# EARS[FR-014]: Truncate frames > 120 and apply torch.nan_to_num(0.0)
class LandmarkCleaner(nn.Module):
    def __init__(self, max_frames: int = 120):
        super().__init__()
        self.max_frames = max_frames

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: [B, T, C]
        if x.size(1) > self.max_frames:
            x = x[:, :self.max_frames, :]
        
        # Suppress NaNs natively in graph
        x = torch.nan_to_num(x, nan=0.0, posinf=0.0, neginf=0.0)
        return x
