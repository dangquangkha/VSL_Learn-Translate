import torch
import torch.nn as nn
import torch.nn.functional as F

# EARS[FR-006, FR-012]: 1D Temporal Linear Interpolation to 32 frames
class FrameInterpolator(nn.Module):
    def __init__(self, target_frames: int = 32):
        super().__init__()
        self.target_frames = target_frames

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, 333]
        B, T, C = x.shape

        # FR-012: Duplicate single frame input to satisfy 1D interpolation
        if T < 2:
            x = x.repeat(1, 2, 1)
            T = 2

        # Reshape for 1D interpolation: [B, C, T]
        x_perm = x.permute(0, 2, 1)

        # Apply 1D linear interpolation across temporal dimension
        x_interp = F.interpolate(
            x_perm, size=self.target_frames, mode="linear", align_corners=True
        ) # [B, C, 32]

        # Reshape back to [B, 32, C]
        return x_interp.permute(0, 2, 1)
