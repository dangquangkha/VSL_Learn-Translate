"""Export model giả (dummy) VSLClassifierV2 sang ONNX opset 17 — P1-2.

Interface 3 tensor (`landmarks`, `mask`, `timestamps`) đã CHỐT theo
`specs/010-p1-foundation/spec.md` §2.1. Interface cũ 1 tensor
`raw_landmarks [B, T, 333]` (bắt JavaScript tự dựng đặc trưng) đã bị LOẠI BỎ
vì vi phạm nguyên tắc Zero Training/Serving Skew — không còn hàm nào giữ lại
interface đó trong module này.

Model xuất ra là model GIẢ, trọng số ngẫu nhiên tất định (xem
`ai_pipeline/models/vsl_classifier_v2.py` và `models/DUMMY.md`). Mục đích
duy nhất: chốt interface ONNX để P2/P4 build song song trong lúc chờ model
thật (MỐC 3).

Chạy: `py -m ai_pipeline.export.export_onnx`
(nhớ đặt PYTHONIOENCODING=utf-8 trên Windows để tránh UnicodeEncodeError khi
in thông báo — dù bản thân script này chỉ print ASCII).
"""

from __future__ import annotations

from pathlib import Path

import onnx
import torch

from ai_pipeline.models.vsl_classifier_v2 import (
    NUM_CLASSES,
    NUM_MASK_CH,
    NUM_POINTS_RAW,
    NUM_FRAMES_IN,
    VALUES_PER_POINT,
    VSLClassifierV2,
)
from ai_pipeline.utils.label_hash import get_labels_count, get_labels_sha256

DEFAULT_OUTPUT = "models/vsl_classifier_dummy_v2.onnx"


def _make_trace_inputs() -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Dựng input mẫu để trace, dùng generator tất định (seed=1).

    Tránh trace bằng input toàn 0 vì exporter có thể hằng-số-hoá nhánh điều
    kiện (vd. has_shoulder) khi mọi giá trị trung gian đều bằng 0.
    """
    gen = torch.Generator().manual_seed(1)
    landmarks = torch.randn(
        1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT, generator=gen
    )
    mask = torch.ones(1, NUM_FRAMES_IN, NUM_MASK_CH)
    timestamps = (torch.arange(NUM_FRAMES_IN, dtype=torch.float32) / 30.0).reshape(
        1, NUM_FRAMES_IN
    )
    return landmarks, mask, timestamps


def _check_io_contract(output_path: str) -> None:
    """Kiểm tra tên/shape/dtype input-output đúng contract 3 tensor.

    Trả về bình thường nếu đúng; ném AssertionError nếu sai (dùng để quyết
    định có cần export lại bằng exporter TorchScript hay không).
    """
    model = onnx.load(output_path)
    expected_inputs = {
        "landmarks": [1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT],
        "mask": [1, NUM_FRAMES_IN, NUM_MASK_CH],
        "timestamps": [1, NUM_FRAMES_IN],
    }

    actual_inputs = {inp.name: inp for inp in model.graph.input}
    assert set(actual_inputs.keys()) == set(expected_inputs.keys()), (
        f"Ten input sai: {sorted(actual_inputs.keys())} != "
        f"{sorted(expected_inputs.keys())}"
    )

    for name, expected_shape in expected_inputs.items():
        dims = actual_inputs[name].type.tensor_type.shape.dim
        actual_shape = [d.dim_value for d in dims]
        assert actual_shape == expected_shape, (
            f"Shape input '{name}' sai: {actual_shape} != {expected_shape}"
        )

    actual_outputs = [out.name for out in model.graph.output]
    assert actual_outputs == ["logits"], f"Ten output sai: {actual_outputs}"
    out_dims = model.graph.output[0].type.tensor_type.shape.dim
    out_shape = [d.dim_value for d in out_dims]
    assert out_shape == [1, NUM_CLASSES], f"Shape output sai: {out_shape}"


def export_dummy_onnx(
    output_path: str = DEFAULT_OUTPUT,
    opset_version: int = 17,
    seed: int = 20260819,
) -> str:
    """Export VSLClassifierV2 (model gia, trong so ngau nhien) sang ONNX.

    Interface 3 tensor co dinh: landmarks [1,60,75,4], mask [1,60,3],
    timestamps [1,60] -> logits [1,51]. Toan bo tien xu ly nam trong graph.

    Args:
        output_path: duong dan file .onnx dau ra.
        opset_version: phien ban opset ONNX (mac dinh 17).
        seed: seed khoi tao trong so tat dinh cho VSLClassifierV2.

    Returns:
        output_path da ghi file thanh cong.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Chan lech giua so lop thuc te trong shared/labels.json va interface da
    # chot ([1, 51]). Doi so lop la DOI CONTRACT voi P2/P4 — phai fail to,
    # khong duoc xuat file sai so chieu roi de ho phat hien luc chay app.
    labels_count = get_labels_count()
    if labels_count != NUM_CLASSES:
        raise ValueError(
            f"shared/labels.json co {labels_count} lop nhung interface ONNX "
            f"chot {NUM_CLASSES} logits. Doi so lop phai bao P2 (worker) va "
            f"P4 (cham diem) truoc, roi sua NUM_CLASSES trong "
            f"ai_pipeline/models/vsl_classifier_v2.py."
        )

    model = VSLClassifierV2(seed=seed)
    model.eval()

    landmarks, mask, timestamps = _make_trace_inputs()

    export_kwargs = dict(
        export_params=True,
        opset_version=opset_version,
        do_constant_folding=True,
        input_names=["landmarks", "mask", "timestamps"],
        output_names=["logits"],
        # KHONG dynamic_axes: shape co dinh [1,...] theo dung contract.
    )

    # torch 2.10 mac dinh dung exporter dynamo (torch.onnx.export khong
    # truyen dynamo=...). Dynamo co the: (a) doi hoi goi 'onnxscript' chua
    # chac da cai (ModuleNotFoundError), hoac (b) xuat duoc nhung dat sai
    # ten/shape input-output so voi hop dong 3 tensor. Ca hai truong hop deu
    # fallback sang exporter TorchScript (dynamo=False).
    exporter_used = "dynamo"
    try:
        torch.onnx.export(
            model,
            (landmarks, mask, timestamps),
            output_path,
            **export_kwargs,
        )
        _check_io_contract(output_path)
    except Exception as exc:  # noqa: BLE001 - fallback duoc kiem tra lai ben duoi
        print(f"[export_onnx] dynamo export that bai/khong dung contract ({exc!r}); thu lai voi dynamo=False")
        torch.onnx.export(
            model,
            (landmarks, mask, timestamps),
            output_path,
            dynamo=False,
            **export_kwargs,
        )
        exporter_used = "torchscript (dynamo=False fallback)"
        _check_io_contract(output_path)

    print(f"[export_onnx] exporter su dung: {exporter_used}")

    # Nhung metadata_props (moi gia tri la str)
    onnx_model = onnx.load(output_path)
    # Xoa metadata cu (neu export lai de) truoc khi them, tranh trung key.
    del onnx_model.metadata_props[:]

    metadata = {
        "label_hash": get_labels_sha256(),
        "opset_version": str(opset_version),
        "model_kind": "dummy",
        "interface_version": "3tensor-v1",
        "input_frames": str(NUM_FRAMES_IN),
        "num_points": str(NUM_POINTS_RAW),
        "values_per_point": str(VALUES_PER_POINT),
        "num_classes": str(NUM_CLASSES),
        "weight_seed": str(seed),
        "preprocessing": (
            "in-graph: select55 + shoulder-norm + rotate2d + resample32 + "
            "velocity + mask"
        ),
    }
    for key, value in metadata.items():
        prop = onnx_model.metadata_props.add()
        prop.key = key
        prop.value = value

    onnx.checker.check_model(onnx_model)
    onnx.save(onnx_model, output_path)

    print(f"[export_onnx] da xuat model gia sang {output_path}")
    print(f"[export_onnx] label_hash={metadata['label_hash']}")

    return output_path


if __name__ == "__main__":
    export_dummy_onnx()
