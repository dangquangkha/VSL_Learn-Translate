import torch
import torch.nn as nn

# EARS[FR-005]: 2D Horizontal Rotation Alignment
class RotationAligner(nn.Module):
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, 333]
        left_shoulder_2d = x[:, :, 44:46] # [B, T, 2]
        right_shoulder_2d = x[:, :, 48:50] # [B, T, 2]

        delta_y = right_shoulder_2d[:, :, 1] - left_shoulder_2d[:, :, 1]
        delta_x = right_shoulder_2d[:, :, 0] - left_shoulder_2d[:, :, 0]
        angle = torch.atan2(delta_y, delta_x) # [B, T]

        cos_a = torch.cos(-angle)
        sin_a = torch.sin(-angle)

        # Apply 2D rotation to all (x, y) coordinate pairs
        x_rot = x.clone()

        # Pose (33 points)
        for i in range(33):
            idx = i * 4
            px, py = x_rot[:, :, idx], x_rot[:, :, idx+1]
            x_rot[:, :, idx] = px * cos_a - py * sin_a
            x_rot[:, :, idx+1] = px * sin_a + py * cos_a

        # Left Hand (21 points)
        for i in range(21):
            idx = 132 + i * 3
            px, py = x_rot[:, :, idx], x_rot[:, :, idx+1]
            x_rot[:, :, idx] = px * cos_a - py * sin_a
            x_rot[:, :, idx+1] = px * sin_a + py * cos_a

        # Right Hand (21 points)
        for i in range(21):
            idx = 195 + i * 3
            px, py = x_rot[:, :, idx], x_rot[:, :, idx+1]
            x_rot[:, :, idx] = px * cos_a - py * sin_a
            x_rot[:, :, idx+1] = px * sin_a + py * cos_a

        # Face (25 points)
        for i in range(25):
            idx = 258 + i * 3
            px, py = x_rot[:, :, idx], x_rot[:, :, idx+1]
            x_rot[:, :, idx] = px * cos_a - py * sin_a
            x_rot[:, :, idx+1] = px * sin_a + py * cos_a

        return x_rot
