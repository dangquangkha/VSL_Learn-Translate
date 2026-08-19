import torch
import torch.nn as nn

# EARS[FR-003, FR-004, FR-011]: Midpoint shoulder origin shift & distance scaling with epsilon protection
class ShoulderNormalizer(nn.Module):
    def __init__(self, epsilon: float = 1e-6):
        super().__init__()
        self.epsilon = epsilon

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: [B, T, 333]
        # Pose landmarks: channels 0..131 (33 points x 4: x,y,z,v)
        # Left Shoulder ID 11: indices 44,45,46 (x,y,z)
        # Right Shoulder ID 12: indices 48,49,50 (x,y,z)
        left_shoulder = x[:, :, 44:47]  # [B, T, 3]
        right_shoulder = x[:, :, 48:51] # [B, T, 3]

        midpoint = (left_shoulder + right_shoulder) / 2.0 # [B, T, 3]
        shoulder_dist = torch.norm(left_shoulder - right_shoulder, dim=-1, keepdim=True) # [B, T, 1]

        # Shift origin for all 3D points
        # Reshape to operate on 3D coordinates
        x_reshaped = x.clone()
        
        # Apply origin shift to Pose (33x4), Hands (21x3, 21x3), Face (25x3)
        # Pose 3D points (ignoring v channel for shift, shift x,y,z)
        for i in range(33):
            x_reshaped[:, :, i*4 : i*4+3] = x_reshaped[:, :, i*4 : i*4+3] - midpoint

        # Left Hand (132..194) - 21 points
        for i in range(21):
            idx = 132 + i*3
            x_reshaped[:, :, idx:idx+3] = x_reshaped[:, :, idx:idx+3] - midpoint

        # Right Hand (195..257) - 21 points
        for i in range(21):
            idx = 195 + i*3
            x_reshaped[:, :, idx:idx+3] = x_reshaped[:, :, idx:idx+3] - midpoint

        # Core Face (258..332) - 25 points
        for i in range(25):
            idx = 258 + i*3
            x_reshaped[:, :, idx:idx+3] = x_reshaped[:, :, idx:idx+3] - midpoint

        # Scale by inverse shoulder distance with epsilon protection (FR-011)
        # shoulder_dist da la [B, T, 1] vi torch.norm dung keepdim=True, nen no
        # broadcast dung voi [B, T, 333]. KHONG duoc them .unsqueeze(-1): lam vay
        # se thanh [B, T, 1, 1] va broadcast ra [B, T, T, 333] - thua mot chieu,
        # khien RotationAligner o buoc sau slice vao chieu rong va nem IndexError.
        scale_factor = 1.0 / (shoulder_dist + self.epsilon)
        x_reshaped = x_reshaped * scale_factor
        return x_reshaped
