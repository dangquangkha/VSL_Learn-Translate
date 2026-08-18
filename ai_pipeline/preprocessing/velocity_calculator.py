import torch
import torch.nn as nn

# EARS[FR-007]: Frame-to-frame velocity vector computation
class VelocityCalculator(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, 32, 333]
        # Velocity delta = x_t - x_{t-1}, with zero padding at t=0
        vel = torch.zeros_like(x)
        vel[:, 1:, :] = x[:, 1:, :] - x[:, :-1, :]
        return vel
