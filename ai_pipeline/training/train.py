"""P1-6 — Vòng lặp huấn luyện.

Chạy tại chỗ:
    PYTHONIOENCODING=utf-8 PYTHONPATH=. py -m ai_pipeline.training.train --data-dir data/raw

Chạy trên Kaggle: xem `ai_pipeline/training/KAGGLE.md`.

Thiết kế bám ba điều đã chốt:
  1. Cửa sổ 60 khung, tiền xử lý nằm TRONG graph (`VSLClassifierV3`).
  2. Chia tập theo NGƯỜI — trả lời đúng câu hỏi "chạy được với người lạ không".
  3. Chỉ train trên các lớp thực sự có dữ liệu, nhưng GIỮ 51 đầu ra để không
     phải đổi contract ONNX với P2/P4.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ai_pipeline.models.vsl_classifier_v2 import NUM_CLASSES
from ai_pipeline.training.dataset import (
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
        help="mã người để riêng làm tập test, vd P05. Bỏ trống = chia trộn theo cửa sổ",
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


@torch.no_grad()
def evaluate(model: nn.Module, loader: DataLoader, device: torch.device):
    model.eval()
    correct = total = 0
    per_class: Counter[int] = Counter()
    per_class_ok: Counter[int] = Counter()
    confusion: list[tuple[int, int]] = []
    for lm, mk, ts, y in loader:
        logits = model(lm.to(device), mk.to(device), ts.to(device))
        pred = logits.argmax(dim=1).cpu()
        correct += int((pred == y).sum())
        total += len(y)
        for t, p in zip(y.tolist(), pred.tolist()):
            per_class[t] += 1
            if t == p:
                per_class_ok[t] += 1
            confusion.append((t, p))
    return (correct / total if total else 0.0), per_class, per_class_ok, confusion


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

    # ---- chia tập ---------------------------------------------------------
    if args.test_participants:
        train_clips, test_clips = split_by_participant(usable, args.test_participants)
        cach_chia = f"theo NGUOI (test = {', '.join(args.test_participants)})"
        train_ds, test_ds = VslmWindowDataset(train_clips), VslmWindowDataset(test_clips)
        if len(test_ds) == 0:
            raise SystemExit("Tap test rong — kiem tra lai --test-participants.")
        thieu = {c.sign_code for c in usable} - {c.sign_code for c in train_clips}
        if thieu:
            print(f"CANH BAO: tap TRAIN khong co lop: {', '.join(sorted(thieu))}")
            print("          model khong the hoc nhung lop nay. Ket qua se sai lech.\n")
    else:
        # Chia trộn theo CỬA SỔ: chỉ dùng để kiểm tra pipeline chạy được.
        # Con so KHONG phan anh kha nang voi nguoi la — cac cua so cua cung mot
        # clip giong nhau ~98% nen model gan nhu da "thay" moi mau test.
        full = VslmWindowDataset(usable)
        n_test = max(1, int(0.2 * len(full)))
        g = torch.Generator().manual_seed(args.seed)
        perm = torch.randperm(len(full), generator=g).tolist()
        train_ds = torch.utils.data.Subset(full, perm[n_test:])
        test_ds = torch.utils.data.Subset(full, perm[:n_test])
        cach_chia = "TRON theo cua so (chi de kiem tra pipeline, KHONG dung de bao cao)"

    print(f"Cach chia : {cach_chia}")
    print(f"Cua so    : train {len(train_ds)} | test {len(test_ds)}")

    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size, shuffle=True, collate_fn=_stack, num_workers=0
    )
    test_loader = DataLoader(
        test_ds, batch_size=args.batch_size, shuffle=False, collate_fn=_stack, num_workers=0
    )

    # ---- trọng số lớp: bù mất cân đối (chao 11 clip vs bo 33 clip) ---------
    dem = Counter()
    for _, _, _, y in train_loader:
        dem.update(y.tolist())
    weight = torch.ones(NUM_CLASSES)
    if dem:
        trung_binh = sum(dem.values()) / len(dem)
        for k, v in dem.items():
            weight[k] = trung_binh / v

    model = VSLClassifierV3().to(device)
    print(f"Model     : VSLClassifierV3, {count_parameters(model):,} tham so\n")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    criterion = nn.CrossEntropyLoss(weight=weight.to(device))

    # KHONG chon checkpoint theo tap test — lam vay la ro ri thong tin test vao
    # viec chon model, va con so bao cao se lac quan hon thuc te. Chi theo doi de
    # biet model co dao dong manh khong.
    best_acc = 0.0
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

        acc, _, _, _ = evaluate(model, test_loader, device)
        best_acc = max(best_acc, acc)
        if epoch % 5 == 0 or epoch == 1:
            print(f"  epoch {epoch:3d}  loss {tong_loss / max(n_batch,1):.4f}  test_acc {acc:.3f}")

    # ---- báo cáo ----------------------------------------------------------
    acc, per_class, per_class_ok, confusion = evaluate(model, test_loader, device)
    print("\n" + "=" * 72)
    print(f"DO CHINH XAC TONG: {acc:.1%}   ({cach_chia})")
    print(f"  (epoch cuoi, KHONG chon theo test. Epoch tot nhat tung dat: {best_acc:.1%})")
    print("=" * 72)
    print("%-16s %8s %8s %9s" % ("lop", "dung", "tong", "ty le"))
    ket_qua_lop = {}
    for label in sorted(per_class):
        ten = code_of.get(label, str(label))
        n, ok = per_class[label], per_class_ok[label]
        ket_qua_lop[ten] = {"dung": ok, "tong": n, "ty_le": ok / n if n else 0.0}
        print("%-16s %8d %8d %8.1f%%" % (ten, ok, n, 100 * ok / n if n else 0))

    nham = Counter((t, p) for t, p in confusion if t != p)
    if nham:
        print("\nNham nhieu nhat:")
        for (t, p), n in nham.most_common(5):
            print("   %-16s -> %-16s %3d lan" % (code_of.get(t, t), code_of.get(p, p), n))

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": model.state_dict(), "signs": args.signs}, args.out)
    print(f"\nDa luu checkpoint: {args.out}")

    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "accuracy": acc,
                    "cach_chia": cach_chia,
                    "theo_lop": ket_qua_lop,
                    "so_cua_so": {"train": len(train_ds), "test": len(test_ds)},
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        print(f"Da luu bao cao   : {args.report}")


if __name__ == "__main__":
    main()
