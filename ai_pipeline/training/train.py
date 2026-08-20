"""P1-6 — Vòng lặp huấn luyện.

Chạy tại chỗ:
    OMP_NUM_THREADS=4 PYTHONIOENCODING=utf-8 PYTHONPATH=. \\
        py -m ai_pipeline.training.train --data-dir data/raw --test-participants P02

Chạy trên Kaggle: xem `ai_pipeline/training/KAGGLE.md`.

BA TẦNG DỮ LIỆU, và vì sao phải có đủ ba:

    train  — học trọng số
    val    — CHỌN giữ lại epoch nào
    test   — con số đem đi báo cáo, chỉ chạm vào đúng một lần ở cuối

Thiếu tầng `val` thì chỉ còn hai lựa chọn, cả hai đều sai:
  - Chọn epoch theo `test` → rò rỉ thông tin test vào việc chọn model. Đo được
    84,1% trong khi số thật là 58,1%.
  - Lấy đại epoch cuối → thành xổ số. Đo được đường test_acc dao động 45 điểm
    phần trăm giữa các epoch (0,38 … 0,83), nên epoch cuối rơi vào đâu là may rủi.

`val` cắt theo CLIP từ chính những người trong tập train — không cắt theo cửa sổ,
vì các cửa sổ của cùng một clip giống nhau ~98%, để lẫn hai bên là tự cho điểm.

Ba điều khác vẫn giữ nguyên:
  1. Cửa sổ 60 khung, tiền xử lý nằm TRONG graph (`VSLClassifierV3`).
  2. Chia tập theo NGƯỜI — trả lời đúng câu hỏi "chạy được với người lạ không".
  3. Giữ 51 đầu ra để không phải đổi contract ONNX với P2/P4.
"""

from __future__ import annotations

import argparse
import json
import random
from collections import Counter, defaultdict
from pathlib import Path
from typing import Sequence

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ai_pipeline.models.vsl_classifier_v2 import NUM_CLASSES
from ai_pipeline.training.dataset import (
    ClipInfo,
    VslmWindowDataset,
    scan_clips,
    split_by_participant,
    summarize,
)
from ai_pipeline.training.model import VSLClassifierV3, count_parameters

#: 6 lớp đã chốt cho demo: idle + 5 cử chỉ đầu.
DEFAULT_SIGNS = ("idle", "chao", "xin_loi", "tam_biet", "bo", "me")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Train model VSL từ clip .vslm")
    p.add_argument("--data-dir", default="data/raw", help="thư mục chứa <Pxx>/*.vslm")
    p.add_argument("--signs", nargs="*", default=list(DEFAULT_SIGNS))
    p.add_argument(
        "--test-participants",
        nargs="*",
        default=[],
        help="mã người để riêng làm tập test, vd P02. Bỏ trống = chia theo clip",
    )
    p.add_argument(
        "--val-frac",
        type=float,
        default=0.2,
        help="tỉ lệ CLIP trong tập train giữ lại làm validation để chọn epoch",
    )
    p.add_argument("--epochs", type=int, default=60)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--weight-decay", type=float, default=1e-4)
    p.add_argument("--seed", type=int, default=20260820)
    p.add_argument("--out", default="models/vsl_classifier_v3.pt")
    p.add_argument("--report", default="", help="ghi kết quả ra file JSON nếu đặt")
    return p


def _device() -> torch.device:
    return torch.device("cuda" if torch.cuda.is_available() else "cpu")


def _stack(batch):
    lm, mk, ts, y = zip(*batch)
    return torch.stack(lm), torch.stack(mk), torch.stack(ts), torch.tensor(y)


def carve_validation(
    clips: Sequence[ClipInfo], frac: float, seed: int
) -> tuple[list[ClipInfo], list[ClipInfo]]:
    """Tách ra một phần theo CLIP, cân theo từng lớp.

    Cân theo lớp để lớp ít clip nhất (`chao` chỉ có 11) vẫn có mặt ở cả hai bên —
    bốc ngẫu nhiên toàn cục thì nó rất dễ trượt hết sang một phía.
    """
    theo_lop: dict[int, list[ClipInfo]] = defaultdict(list)
    for c in clips:
        theo_lop[c.label_index].append(c)

    rng = random.Random(seed)
    giu: list[ClipInfo] = []
    tach: list[ClipInfo] = []
    for _, nhom in sorted(theo_lop.items()):
        nhom = sorted(nhom, key=lambda c: c.path)
        rng.shuffle(nhom)
        # Ít nhất 1 clip được tách ra, nhưng luôn chừa lại ít nhất 1 clip.
        n_tach = min(max(1, round(frac * len(nhom))), max(len(nhom) - 1, 0))
        tach.extend(nhom[:n_tach])
        giu.extend(nhom[n_tach:])
    return giu, tach


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device):
    model.eval()
    correct = total = 0
    per_class: Counter[int] = Counter()
    per_class_ok: Counter[int] = Counter()
    confusion: Counter[tuple[int, int]] = Counter()
    for lm, mk, ts, y in loader:
        pred = model(lm.to(device), mk.to(device), ts.to(device)).argmax(dim=1).cpu()
        correct += int((pred == y).sum())
        total += len(y)
        for t, p in zip(y.tolist(), pred.tolist()):
            per_class[t] += 1
            if t == p:
                per_class_ok[t] += 1
            else:
                confusion[(t, p)] += 1
    return (correct / total if total else 0.0), per_class, per_class_ok, confusion


def _loader(ds, batch_size: int, shuffle: bool) -> DataLoader:
    return DataLoader(
        ds, batch_size=batch_size, shuffle=shuffle, collate_fn=_stack, num_workers=0
    )


def main() -> None:
    args = build_arg_parser().parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    device = _device()

    print("=" * 72)
    print("Thiet bi        :", device)
    print("Thu muc du lieu :", args.data_dir)
    print("Lop muc tieu    :", ", ".join(args.signs))
    print("=" * 72)

    clips = scan_clips(args.data_dir, keep_signs=args.signs)
    if not clips:
        raise SystemExit(f"Khong tim thay file .vslm nao trong {args.data_dir}")
    print(summarize(clips))
    print()

    usable = [c for c in clips if c.usable]
    if not usable:
        raise SystemExit("Khong co clip nao dung duoc — xem ly do bi loai o tren.")
    code_of = {c.label_index: c.sign_code for c in usable}

    # ---- chia ba tầng, TẤT CẢ đều cắt theo clip ---------------------------
    if args.test_participants:
        con_lai, test_clips = split_by_participant(usable, args.test_participants)
        cach_chia = f"theo NGUOI (test = {', '.join(args.test_participants)})"
        if not test_clips:
            raise SystemExit("Tap test rong — kiem tra lai --test-participants.")
    else:
        # Chia theo CLIP: test là clip chưa từng thấy, nhưng NGƯỜI thì đã thấy.
        # Con số sẽ đẹp hơn thực tế — dùng để kiểm tra pipeline, không để báo cáo.
        con_lai, test_clips = carve_validation(usable, 0.2, args.seed)
        cach_chia = "theo CLIP (nguoi da thay -> lac quan, khong dung de bao cao)"

    train_clips, val_clips = carve_validation(con_lai, args.val_frac, args.seed + 1)

    thieu = {c.sign_code for c in usable} - {c.sign_code for c in train_clips}
    if thieu:
        print(f"CANH BAO: tap TRAIN khong co lop: {', '.join(sorted(thieu))}")
        print("          model khong the hoc nhung lop nay.\n")

    train_ds = VslmWindowDataset(train_clips)
    val_ds = VslmWindowDataset(val_clips)
    test_ds = VslmWindowDataset(test_clips)

    print(f"Cach chia : {cach_chia}")
    print(
        "Clip      : train %d | val %d | test %d"
        % (len(train_clips), len(val_clips), len(test_clips))
    )
    print(f"Cua so    : train {len(train_ds)} | val {len(val_ds)} | test {len(test_ds)}")

    train_loader = _loader(train_ds, args.batch_size, True)
    val_loader = _loader(val_ds, args.batch_size, False)
    test_loader = _loader(test_ds, args.batch_size, False)

    # ---- trọng số lớp: bù mất cân đối (chao 11 clip vs bo 33 clip) --------
    dem = Counter(train_ds.clips[i].label_index for i, _ in train_ds.index)
    weight = torch.ones(NUM_CLASSES)
    if dem:
        trung_binh = sum(dem.values()) / len(dem)
        for k, v in dem.items():
            weight[k] = trung_binh / v

    model = VSLClassifierV3().to(device)
    print(f"Model     : VSLClassifierV3, {count_parameters(model):,} tham so\n")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    # Hạ dần learning rate. Không có nó, loss nhảy vọt ở cuối và độ chính xác
    # dao động hàng chục điểm phần trăm giữa hai epoch liền nhau.
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.CrossEntropyLoss(weight=weight.to(device))

    best_val, best_state, best_epoch = -1.0, None, 0
    for epoch in range(1, args.epochs + 1):
        model.train()
        tong_loss = n_batch = 0
        for lm, mk, ts, y in train_loader:
            optimizer.zero_grad()
            loss = criterion(model(lm.to(device), mk.to(device), ts.to(device)), y.to(device))
            loss.backward()
            optimizer.step()
            tong_loss += loss.item()
            n_batch += 1
        scheduler.step()

        val_acc, _, _, _ = evaluate(model, val_loader, device)
        if val_acc > best_val:
            best_val, best_epoch = val_acc, epoch
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        if epoch % 5 == 0 or epoch == 1:
            print(
                f"  epoch {epoch:3d}  loss {tong_loss / max(n_batch,1):.4f}  val_acc {val_acc:.3f}"
            )

    if best_state is not None:
        model.load_state_dict(best_state)
    print(
        f"\nGiu lai epoch {best_epoch} (val_acc {best_val:.3f}) "
        "— chon theo VAL, khong theo TEST."
    )

    # ---- báo cáo: chạm vào test đúng một lần ------------------------------
    acc, per_class, per_class_ok, confusion = evaluate(model, test_loader, device)
    print("\n" + "=" * 72)
    print(f"DO CHINH XAC TREN TEST: {acc:.1%}   ({cach_chia})")
    print("=" * 72)
    print("%-16s %8s %8s %9s" % ("lop", "dung", "tong", "ty le"))
    ket_qua_lop = {}
    for label in sorted(per_class):
        ten = code_of.get(label, str(label))
        n, ok = per_class[label], per_class_ok[label]
        ket_qua_lop[ten] = {"dung": ok, "tong": n, "ty_le": ok / n if n else 0.0}
        print("%-16s %8d %8d %8.1f%%" % (ten, ok, n, 100 * ok / n if n else 0))

    if confusion:
        print("\nNham nhieu nhat:")
        for (t, p), n in confusion.most_common(5):
            print("   %-16s -> %-16s %3d lan" % (code_of.get(t, t), code_of.get(p, p), n))

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "signs": args.signs}, args.out)
    print(f"\nDa luu checkpoint: {args.out}")

    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "accuracy_test": acc,
                    "val_acc_da_chon": best_val,
                    "epoch_da_chon": best_epoch,
                    "cach_chia": cach_chia,
                    "theo_lop": ket_qua_lop,
                    "so_clip": {
                        "train": len(train_clips),
                        "val": len(val_clips),
                        "test": len(test_clips),
                    },
                    "so_cua_so": {
                        "train": len(train_ds),
                        "val": len(val_ds),
                        "test": len(test_ds),
                    },
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"Da luu bao cao   : {args.report}")


if __name__ == "__main__":
    main()
