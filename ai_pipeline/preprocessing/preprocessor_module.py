import torch
import torch.nn as nn
from ai_pipeline.preprocessing.landmark_cleaner import LandmarkCleaner
from ai_pipeline.preprocessing.shoulder_normalizer import ShoulderNormalizer
from ai_pipeline.preprocessing.rotation_aligner import RotationAligner
from ai_pipeline.preprocessing.frame_interpolator import FrameInterpolator
from ai_pipeline.preprocessing.velocity_calculator import VelocityCalculator

# EARS[FR-001 through FR-008]: Unified 7-Step Preprocessor Module
class LandmarkPreprocessorModule(nn.Module):
    def __init__(self, max_frames: int = 120, target_frames: int = 32, epsilon: float = 1e-6):
        super().__init__()
        self.cleaner = LandmarkCleaner(max_frames=max_frames)
        self.normalizer = ShoulderNormalizer(epsilon=epsilon)
        self.aligner = RotationAligner()
        self.interpolator = FrameInterpolator(target_frames=target_frames)
        self.velocity_calc = VelocityCalculator()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Step 1: Forward-fill / NaN suppression & truncation
        x = self.cleaner(x)
        
        # Step 2 & 3: Shoulder origin translation & width scaling
        x = self.normalizer(x)
        
        # Step 4: 2D shoulder horizontal rotation alignment
        x = self.aligner(x)
        
        # Step 5: Linear interpolation to 32 frames
        x = self.interpolator(x)
        
        # Step 6: Velocity channel computation
        _vel = self.velocity_calc(x)
        
        # Step 7: Reshape / Standardized feature output [1, 32, 333]
        return x
