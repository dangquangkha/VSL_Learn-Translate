import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# EARS[NFR-003]: Post-training int8 dynamic quantization for size <= 5MB
def quantize_onnx_model(input_path: str = "models/vsl_classifier_v1.onnx", output_path: str = "models/vsl_classifier_v1_int8.onnx"):
    quantize_dynamic(
        model_input=input_path,
        model_output=output_path,
        weight_type=QuantType.QUInt8
    )
    print(f"Quantized ONNX model saved to {output_path}")

if __name__ == "__main__":
    quantize_onnx_model()
