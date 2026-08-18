import torch
from ai_pipeline.preprocessing.preprocessor_module import LandmarkPreprocessorModule

def test_preprocessor_module_shape():
    module = LandmarkPreprocessorModule()
    # Test random variable length frame sequence [1, 45, 333]
    dummy_input = torch.randn(1, 45, 333)
    output = module(dummy_input)
    assert output.shape == (1, 32, 333), f"Expected shape (1, 32, 333), got {output.shape}"

def test_preprocessor_nan_handling():
    module = LandmarkPreprocessorModule()
    dummy_input = torch.randn(1, 20, 333)
    dummy_input[0, 5, 10] = float('nan')
    output = module(dummy_input)
    assert not torch.isnan(output).any(), "Output contains NaN values"

def test_preprocessor_short_sequence():
    module = LandmarkPreprocessorModule()
    dummy_input = torch.randn(1, 1, 333)
    output = module(dummy_input)
    assert output.shape == (1, 32, 333)
