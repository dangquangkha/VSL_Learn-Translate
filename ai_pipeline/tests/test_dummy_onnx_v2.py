"""Test cho model gia (dummy) VSLClassifierV2 va export ONNX 3 tensor — P1-2.

File nay KHONG phu thuoc file `.onnx` da commit va KHONG ghi de file trong
`models/`: fixture `exported_model_path` export MOT LAN ra thu muc tam
(`tmp_path_factory`, scope="module") roi cac test dung chung.
"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

import numpy as np
import onnx
import onnxruntime as ort
import pytest
import torch

from ai_pipeline.export.export_onnx import export_dummy_onnx
from ai_pipeline.models.vsl_classifier_v2 import (
    NUM_CLASSES,
    NUM_FRAMES_IN,
    NUM_MASK_CH,
    NUM_POINTS_RAW,
    VALUES_PER_POINT,
    VSLClassifierV2,
)
from ai_pipeline.utils.label_hash import get_labels_sha256

DEFAULT_SEED = 20260819


def _make_valid_inputs() -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Dung 3 tensor input hop le, khong co o dem (60/60 khung hop le)."""
    landmarks = torch.randn(1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT)
    mask = torch.ones(1, NUM_FRAMES_IN, NUM_MASK_CH)
    timestamps = (torch.arange(NUM_FRAMES_IN, dtype=torch.float32) / 30.0).reshape(
        1, NUM_FRAMES_IN
    )
    return landmarks, mask, timestamps


def _build_sample(
    num_valid: int, seed: int
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Dung 1 mau tat dinh voi `num_valid` khung hop le o dau chuoi, phan
    con lai (60 - num_valid khung) la o dem timestamps = -1.0."""
    gen = torch.Generator().manual_seed(seed)
    landmarks = torch.randn(1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT, generator=gen)
    mask = torch.rand(1, NUM_FRAMES_IN, NUM_MASK_CH, generator=gen)
    ts_valid = torch.arange(num_valid, dtype=torch.float32) / 30.0
    ts_pad = torch.full((NUM_FRAMES_IN - num_valid,), -1.0)
    timestamps = torch.cat([ts_valid, ts_pad]).reshape(1, NUM_FRAMES_IN)
    return landmarks, mask, timestamps


@pytest.fixture(scope="module")
def exported_model_path(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Export model gia MOT LAN ra thu muc tam (khong dung/ghi vao models/)."""
    out_dir = tmp_path_factory.mktemp("dummy_onnx_v2")
    out_path = out_dir / "vsl_classifier_dummy_v2_test.onnx"
    export_dummy_onnx(output_path=str(out_path), seed=DEFAULT_SEED)
    return out_path


@pytest.fixture(scope="module")
def ort_session(exported_model_path: Path) -> ort.InferenceSession:
    return ort.InferenceSession(
        str(exported_model_path), providers=["CPUExecutionProvider"]
    )


# --- 1. Forward pass hinh dang dau ra --------------------------------------


def test_forward_shape() -> None:
    model = VSLClassifierV2()
    model.eval()
    landmarks, mask, timestamps = _make_valid_inputs()

    with torch.no_grad():
        logits = model(landmarks, mask, timestamps)

    assert logits.shape == (1, NUM_CLASSES)
    assert torch.isfinite(logits).all()


# --- 2. NaN/Inf trong landmarks khong lam sinh NaN o dau ra ----------------


def test_nan_input_khong_sinh_nan() -> None:
    model = VSLClassifierV2()
    model.eval()
    landmarks, mask, timestamps = _make_valid_inputs()
    landmarks[0, 5, 10, :] = float("nan")
    landmarks[0, 6, 20, 0] = float("inf")
    landmarks[0, 7, 30, 1] = float("-inf")

    with torch.no_grad():
        logits = model(landmarks, mask, timestamps)

    assert torch.isfinite(logits).all()


# --- 3. Thieu pose khong duoc no gia tri (chot lai loi 1/epsilon) ----------


def test_thieu_pose_khong_no_gia_tri() -> None:
    model = VSLClassifierV2()
    model.eval()

    landmarks = torch.zeros(1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT)
    # Pose (chi so 0..32) giu nguyen = 0 -> vai = 0 -> dist vai = 0.
    # Hai tay (chi so 33..74) co gia tri THAT.
    hand_coords = torch.randn(1, NUM_FRAMES_IN, 42, 3)
    landmarks[:, :, 33:75, :3] = hand_coords
    landmarks[:, :, 33:75, 3] = 1.0  # visibility = 1 cho tay

    mask = torch.zeros(1, NUM_FRAMES_IN, NUM_MASK_CH)
    mask[:, :, 1] = 1.0  # tay trai duoc phat hien
    mask[:, :, 2] = 1.0  # tay phai duoc phat hien

    timestamps = (torch.arange(NUM_FRAMES_IN, dtype=torch.float32) / 30.0).reshape(
        1, NUM_FRAMES_IN
    )

    with torch.no_grad():
        logits = model(landmarks, mask, timestamps)

    assert torch.isfinite(logits).all()
    assert torch.all(logits.abs() < 1e4), f"logits no gia tri: {logits}"


# --- 4. O dem khong anh huong ket qua ---------------------------------------


def test_o_dem_khong_anh_huong_ket_qua() -> None:
    model = VSLClassifierV2()
    model.eval()

    gen_common = torch.Generator().manual_seed(100)
    common_landmarks = torch.randn(
        1, 40, NUM_POINTS_RAW, VALUES_PER_POINT, generator=gen_common
    )
    common_mask = torch.rand(1, 40, NUM_MASK_CH, generator=gen_common)
    common_ts = (torch.arange(40, dtype=torch.float32) / 30.0).reshape(1, 40)
    pad_ts = torch.full((1, 20), -1.0)

    # Rac o phan dem cua mau A
    gen_a = torch.Generator().manual_seed(101)
    pad_landmarks_a = torch.randn(
        1, 20, NUM_POINTS_RAW, VALUES_PER_POINT, generator=gen_a
    )
    pad_mask_a = torch.rand(1, 20, NUM_MASK_CH, generator=gen_a)

    # Rac o phan dem cua mau B — KHAC voi A (nhan them 1000 de chac chan
    # khac va se lam no gia tri neu o dem khong duoc loai dung)
    gen_b = torch.Generator().manual_seed(202)
    pad_landmarks_b = (
        torch.randn(1, 20, NUM_POINTS_RAW, VALUES_PER_POINT, generator=gen_b) * 1000.0
    )
    pad_mask_b = torch.rand(1, 20, NUM_MASK_CH, generator=gen_b)

    landmarks_a = torch.cat([common_landmarks, pad_landmarks_a], dim=1)
    mask_a = torch.cat([common_mask, pad_mask_a], dim=1)
    ts_a = torch.cat([common_ts, pad_ts], dim=1)

    landmarks_b = torch.cat([common_landmarks, pad_landmarks_b], dim=1)
    mask_b = torch.cat([common_mask, pad_mask_b], dim=1)
    ts_b = torch.cat([common_ts, pad_ts], dim=1)

    with torch.no_grad():
        logits_a = model(landmarks_a, mask_a, ts_a)
        logits_b = model(landmarks_b, mask_b, ts_b)

    assert torch.allclose(logits_a, logits_b, atol=1e-6), (
        f"o dem lam thay doi ket qua: max diff = "
        f"{(logits_a - logits_b).abs().max().item()}"
    )


# --- 5. Trong so tat dinh theo seed ------------------------------------------


def test_trong_so_tat_dinh() -> None:
    model_a1 = VSLClassifierV2(seed=555)
    model_a2 = VSLClassifierV2(seed=555)
    model_b = VSLClassifierV2(seed=777)
    for m in (model_a1, model_a2, model_b):
        m.eval()

    landmarks, mask, timestamps = _make_valid_inputs()

    with torch.no_grad():
        logits_a1 = model_a1(landmarks, mask, timestamps)
        logits_a2 = model_a2(landmarks, mask, timestamps)
        logits_b = model_b(landmarks, mask, timestamps)

    assert torch.equal(logits_a1, logits_a2), "cung seed phai cho logits khop tuyet doi"
    assert not torch.allclose(logits_a1, logits_b), "khac seed phai cho logits khac nhau"


# --- 6. Hop dong I/O cua file ONNX -------------------------------------------


def test_onnx_io_contract(
    exported_model_path: Path, ort_session: ort.InferenceSession
) -> None:
    onnx_model = onnx.load(str(exported_model_path))

    inputs = {inp.name: inp for inp in onnx_model.graph.input}
    assert set(inputs.keys()) == {"landmarks", "mask", "timestamps"}

    expected_shapes = {
        "landmarks": [1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT],
        "mask": [1, NUM_FRAMES_IN, NUM_MASK_CH],
        "timestamps": [1, NUM_FRAMES_IN],
    }
    for name, expected_shape in expected_shapes.items():
        tensor_type = inputs[name].type.tensor_type
        assert tensor_type.elem_type == onnx.TensorProto.FLOAT, (
            f"input '{name}' phai la float32"
        )
        actual_shape = [d.dim_value for d in tensor_type.shape.dim]
        assert actual_shape == expected_shape, (
            f"input '{name}' shape {actual_shape} != {expected_shape}"
        )

    outputs = onnx_model.graph.output
    assert len(outputs) == 1
    assert outputs[0].name == "logits"
    out_tensor_type = outputs[0].type.tensor_type
    assert out_tensor_type.elem_type == onnx.TensorProto.FLOAT
    assert [d.dim_value for d in out_tensor_type.shape.dim] == [1, NUM_CLASSES]

    # Kiem tra lai qua onnxruntime.InferenceSession
    ort_inputs = {i.name: i for i in ort_session.get_inputs()}
    assert set(ort_inputs.keys()) == {"landmarks", "mask", "timestamps"}
    assert ort_inputs["landmarks"].shape == [1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT]
    assert ort_inputs["mask"].shape == [1, NUM_FRAMES_IN, NUM_MASK_CH]
    assert ort_inputs["timestamps"].shape == [1, NUM_FRAMES_IN]
    for name, node in ort_inputs.items():
        assert node.type == "tensor(float)", f"input '{name}' dtype sai: {node.type}"

    ort_outputs = ort_session.get_outputs()
    assert len(ort_outputs) == 1
    assert ort_outputs[0].name == "logits"
    assert ort_outputs[0].shape == [1, NUM_CLASSES]
    assert ort_outputs[0].type == "tensor(float)"


# --- 7. Metadata nhung trong file ONNX --------------------------------------


def test_onnx_metadata(exported_model_path: Path) -> None:
    onnx_model = onnx.load(str(exported_model_path))
    metadata = {p.key: p.value for p in onnx_model.metadata_props}

    assert metadata.get("label_hash") == get_labels_sha256(), (
        "label_hash trong metadata khong khop shared/labels.json"
    )
    assert metadata.get("model_kind") == "dummy"
    assert metadata.get("opset_version") == "17"
    assert metadata.get("interface_version") == "3tensor-v1"


# --- 8. Parity PyTorch vs ONNX Runtime ---------------------------------------


def test_parity_pytorch_vs_onnxruntime(
    exported_model_path: Path, ort_session: ort.InferenceSession
) -> None:
    torch_model = VSLClassifierV2(seed=DEFAULT_SEED)
    torch_model.eval()

    valid_counts = [60, 45, 30, 12, 1]
    max_diff_overall = 0.0

    for i, num_valid in enumerate(valid_counts):
        landmarks, mask, timestamps = _build_sample(num_valid, seed=1000 + i)

        with torch.no_grad():
            torch_logits = torch_model(landmarks, mask, timestamps).numpy()

        ort_inputs = {
            "landmarks": landmarks.numpy().astype(np.float32),
            "mask": mask.numpy().astype(np.float32),
            "timestamps": timestamps.numpy().astype(np.float32),
        }
        ort_logits = ort_session.run(["logits"], ort_inputs)[0]

        max_diff = float(np.max(np.abs(torch_logits - ort_logits)))
        print(f"[parity] num_valid={num_valid} max_diff={max_diff:.8e}")
        max_diff_overall = max(max_diff_overall, max_diff)

        assert max_diff < 1e-4, (
            f"num_valid={num_valid}: sai lech PyTorch vs ONNXRuntime qua lon "
            f"({max_diff})"
        )

    print(f"[parity] max_diff tong the (5 mau) = {max_diff_overall:.8e}")


# --- 9. Van toc doc lap voi do dai cua so (chong train/serve skew) -----------


def _quy_dao_theo_thoi_gian(
    so_khung: int, tong_giay: float, giay_dong_tac: float | None = None
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Dung MOT dong tac vat ly giong het nhau, quan sat qua cua so dai ngan khac nhau.

    Co tay ve nua cung tron trong dung `giay_dong_tac` giay (toc do that KHONG
    doi), sau do dung yen cho het `tong_giay`. Day dung la tinh huong that: dong
    tac ~2 giay nam trong clip 3 giay, phan con lai la luc ha tay.

    Neu `giay_dong_tac` = None thi dong tac trai deu ca cua so.
    """
    landmarks = torch.zeros(1, NUM_FRAMES_IN, NUM_POINTS_RAW, VALUES_PER_POINT)
    mask = torch.zeros(1, NUM_FRAMES_IN, NUM_MASK_CH)
    timestamps = torch.full((1, NUM_FRAMES_IN), -1.0)

    dong_tac = tong_giay if giay_dong_tac is None else giay_dong_tac

    for f in range(so_khung):
        giay = f / (so_khung - 1) * tong_giay  # thoi diem that cua khung nay
        # Toc do that co dinh: hoan thanh nua vong trong `dong_tac` giay roi dung.
        t = min(giay / dong_tac, 1.0)
        goc = t * 3.1415926535  # nua vong tron

        # Vai co dinh -> chuan hoa on dinh
        landmarks[0, f, 11, :3] = torch.tensor([0.40, 0.45, 0.0])
        landmarks[0, f, 12, :3] = torch.tensor([0.60, 0.45, 0.0])
        landmarks[0, f, 11, 3] = 1.0
        landmarks[0, f, 12, 3] = 1.0

        # Co tay phai + ban tay phai di theo cung tron
        x = 0.60 + 0.15 * float(torch.cos(torch.tensor(goc)))
        y = 0.45 - 0.15 * float(torch.sin(torch.tensor(goc)))
        landmarks[0, f, 16, :3] = torch.tensor([x, y, 0.0])
        landmarks[0, f, 16, 3] = 1.0
        for p in range(54, 75):
            landmarks[0, f, p, :3] = torch.tensor([x + (p - 54) * 0.002, y, 0.0])
            landmarks[0, f, p, 3] = 1.0

        mask[0, f] = torch.tensor([1.0, 0.0, 1.0])
        timestamps[0, f] = giay

    return landmarks, mask, timestamps


def test_van_toc_doc_lap_voi_do_dai_cua_so() -> None:
    """Cung mot dong tac, lay mau trong cua so 3 giay (luc train, clip .vslm)
    va cua so 2 giay (luc chay that, ring buffer) phai cho kenh van toc GAN
    BANG NHAU.

    Neu lay sai phan tran giua 32 khung sau noi suy ma khong chia cho buoc thoi
    gian that, hai truong hop lech nhau dung ty le 3/2 = 1.5 lan — model hoc
    "nhanh chung nay" roi gap du lieu cham hon 1.5 lan luc chay that.
    """
    pre = VSLClassifierV2().preprocessor
    pre.eval()

    # CUNG mot dong tac vat ly: nua cung tron hoan thanh trong 2.0 giay.
    #   - Cua so 3 giay (luc train, clip .vslm): dong tac 2s + 1s ha tay dung yen
    #   - Cua so 2 giay (luc chay that, ring buffer): chi chua dung dong tac
    # Toc do that giong het nhau -> kenh van toc phai giong nhau.
    lm3, mk3, ts3 = _quy_dao_theo_thoi_gian(so_khung=60, tong_giay=3.0, giay_dong_tac=2.0)
    lm2, mk2, ts2 = _quy_dao_theo_thoi_gian(so_khung=60, tong_giay=2.0, giay_dong_tac=2.0)

    with torch.no_grad():
        f3 = pre(lm3, mk3, ts3)
        f2 = pre(lm2, mk2, ts2)

    # Kenh van toc = 165 gia tri o giua (sau 165 toa do, truoc 3 kenh mask)
    vel3 = f3[0, :, 165:330]
    vel2 = f2[0, :, 165:330]

    bien_do3 = float(vel3.abs().max())
    bien_do2 = float(vel2.abs().max())
    ty_le = bien_do3 / max(bien_do2, 1e-9)

    print(f"[skew] bien do van toc cua so 3s = {bien_do3:.6f}")
    print(f"[skew] bien do van toc cua so 2s = {bien_do2:.6f}")
    print(f"[skew] ty le 3s/2s = {ty_le:.4f}  (phai gan 1.0; neu ~1.5 la con skew)")

    assert 0.9 < ty_le < 1.1, (
        f"Van toc phu thuoc do dai cua so: ty le 3s/2s = {ty_le:.3f}. "
        f"Dong tac giong het nhau ma dac trung khac nhau -> train/serve skew."
    )

    # --- Ghi nhan dang skew THU HAI, van con, va KHONG giai duoc trong graph --
    #
    # Kenh toa do VAN phu thuoc do dai cua so, vi noi suy trai deu 32 khung tren
    # TOAN BO cua so: cua so 3 giay (2s dong tac + 1s ha tay) danh 1/3 so khung
    # cho doan dung yen, con cua so 2 giay thi khong. Cung mot dong tac nhung
    # "hinh dang theo thoi gian" khac nhau.
    #
    # Khong the sua bang cach chia cho thoi gian nhu voi van toc — no la he qua
    # cua viec cua so chua nhieu hon phan dong tac.
    #
    # => RANG BUOC CHO P1-5 (dataset builder): phai sinh mau bang cach TRUOT
    #    CUA SO 2 GIAY tren clip 3 giay, dung nhu ring buffer luc chay that,
    #    thay vi nem ca clip 3 giay vao model. Test nay giu lai de so do lech
    #    khong am tham bien mat khoi tri nho cua nguoi sau.
    toa_do_diff = float((f3[0, :, :165] - f2[0, :, :165]).abs().max())
    print(f"[skew] sai lech kenh TOA DO = {toa_do_diff:.4f} (van con — xem chu thich)")
    assert toa_do_diff > 0.01, (
        "Kenh toa do bong nhien doc lap voi do dai cua so — hanh vi noi suy da "
        "doi. Doc lai chu thich tren truoc khi sua test nay."
    )
