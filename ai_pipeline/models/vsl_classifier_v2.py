"""Model giả (dummy) cho interface ONNX 3 tensor — P1-2.

Toàn bộ chuỗi tiền xử lý (chọn điểm, chuẩn hoá theo vai, xoay 2D, nội suy khung,
tính vận tốc, ghép mask) nằm TRONG graph PyTorch/ONNX, đúng nguyên tắc Zero
Training/Serving Skew (`AGENTS.md` §4.2): JavaScript ở phía client CHỈ được đưa
landmark THÔ (`landmarks`, `mask`, `timestamps`), không tự dựng đặc trưng.

Đây là bản viết MỚI, độc lập với `ai_pipeline/preprocessing/*` (module cũ viết
cho layout phẳng 333 kênh và đang hỏng — xem `specs/010-p1-foundation/spec.md`
§2.2; sửa module cũ thuộc phạm vi P1-6, không phải việc này).

CẢNH BÁO: `VSLClassifierV2` khởi tạo với TRỌNG SỐ NGẪU NHIÊN (tất định theo
seed, không phải trọng số đã huấn luyện). Logits sinh ra VÔ NGHĨA, chỉ dùng để
chốt interface ONNX cho P2/P4 build song song. Xem `models/DUMMY.md`.
"""

from __future__ import annotations

import torch
import torch.nn as nn

# --- Hằng số module (public, P1-6 sẽ import lại) ---------------------------

NUM_FRAMES_IN = 60  # cửa sổ 2 giây @ 30fps
NUM_POINTS_RAW = 75  # 33 pose + 21 tay trái + 21 tay phải
VALUES_PER_POINT = 4  # x, y, z, visibility
NUM_MASK_CH = 3  # pose, tay trái, tay phải
TARGET_FRAMES = 32  # số khung sau nội suy
NUM_CLASSES = 51
COORD_DIM = 3  # chỉ lấy x, y, z (bỏ visibility khi dựng đặc trưng)

# 13 điểm pose thân trên theo chỉ số MediaPipe Pose:
# nose, vai T/P, khuỷu T/P, cổ tay T/P, út T/P, trỏ T/P, cái T/P
POSE_SUBSET = (0, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22)

SELECTED_POINTS = POSE_SUBSET + tuple(range(33, 54)) + tuple(range(54, 75))  # 55 điểm
NUM_POINTS_SEL = 55
COORD_FEATURES = NUM_POINTS_SEL * COORD_DIM  # 165
FEATURE_DIM = COORD_FEATURES * 2 + NUM_MASK_CH  # 333 = toạ độ + vận tốc + 3 mask

LEFT_SHOULDER_SEL = 1  # vị trí của pose[11] trong SELECTED_POINTS
RIGHT_SHOULDER_SEL = 2  # vị trí của pose[12] trong SELECTED_POINTS

# Mốc quy chiếu cho kênh vận tốc: 1 khung ở 30fps. Vận tốc được chia cho bước
# thời gian THẬT rồi nhân lại hằng số này, nên giá trị có nghĩa là "dịch chuyển
# trong 1/30 giây" bất kể cửa sổ đầu vào dài 2 hay 3 giây, và bất kể máy quay
# chạy 24 hay 30fps. Xem bước B7 trong VSLPreprocessorV2.
REFERENCE_STEP_SEC = 1.0 / 30.0

assert len(SELECTED_POINTS) == 55
assert FEATURE_DIM == 333


class VSLPreprocessorV2(nn.Module):
    """Chuỗi tiền xử lý MỚI nằm trong graph ONNX, nhận landmark thô 75 điểm.

    Đầu vào:
        landmarks: float32 [B, 60, 75, 4] — 75 điểm x (x, y, z, visibility)
        mask:      float32 [B, 60, 3]     — pose / tay trái / tay phải có
                   được phát hiện hay không
        timestamps: float32 [B, 60]       — giây, tương đối; ô đệm = -1.0

    Đầu ra: float32 [B, 32, 333] = 165 toạ độ (đã chọn 55 điểm x,y,z, chuẩn
    hoá theo vai, xoay 2D) + 165 vận tốc (sai phân) + 3 kênh mask, sau khi
    nội suy tuyến tính 60 khung hợp lệ về 32 khung cố định.

    GIẢ ĐỊNH: các khung hợp lệ nằm liên tiếp ở ĐẦU chuỗi 60 khung, ô đệm
    (`timestamps < 0`) dồn về CUỐI. Đây là hợp đồng với phía ghi buffer khung
    hình (P1-4 `useLandmarks`), không phải hành vi tự suy luận trong module
    này.
    """

    def __init__(self, target_frames: int = TARGET_FRAMES, epsilon: float = 1e-6) -> None:
        super().__init__()
        self.target_frames = target_frames
        self.epsilon = epsilon
        self.register_buffer("point_index", torch.tensor(SELECTED_POINTS, dtype=torch.long))
        self.register_buffer(
            "resample_pos",
            torch.arange(target_frames, dtype=torch.float32) / (target_frames - 1),
        )

    def forward(
        self,
        landmarks: torch.Tensor,
        mask: torch.Tensor,
        timestamps: torch.Tensor,
    ) -> torch.Tensor:
        # --- B1 — làm sạch: loại NaN/Inf trước khi tính toán tiếp ----------
        lm = torch.nan_to_num(landmarks, nan=0.0, posinf=0.0, neginf=0.0)  # [B,60,75,4]
        mk = torch.nan_to_num(mask, nan=0.0, posinf=0.0, neginf=0.0)  # [B,60,3]
        ts = torch.nan_to_num(timestamps, nan=-1.0, posinf=-1.0, neginf=-1.0)  # [B,60]

        # --- B2 — loại ô đệm. Ô đệm quy ước là timestamps < 0 ---------------
        valid = (ts >= 0).to(lm.dtype)  # [B,60]
        lm = lm * valid[:, :, None, None]
        mk = mk * valid[:, :, None]

        # --- B3 — chọn 55 điểm, lấy x,y,z ------------------------------------
        sel = lm.index_select(2, self.point_index)[..., :COORD_DIM]  # [B,60,55,3]

        # --- B4 — chuẩn hoá theo vai (dịch gốc về trung điểm vai, chia cho
        # khoảng cách vai) -----------------------------------------------------
        ls = sel[:, :, LEFT_SHOULDER_SEL, :]  # [B,60,3]
        rs = sel[:, :, RIGHT_SHOULDER_SEL, :]  # [B,60,3]
        mid = (ls + rs) * 0.5  # [B,60,3]
        dist = torch.norm(rs - ls, dim=-1, keepdim=True)  # [B,60,1]
        # Khung không thấy pose -> toạ độ vai = 0 -> dist = 0 -> 1/(0+eps) =
        # 1e6 làm nổ giá trị tay. Nhân thêm cờ có vai: khung không có vai bị
        # đưa hết về 0, kênh mask vẫn cho model biết khung đó thiếu pose.
        has_shoulder = (dist > 1e-3).to(sel.dtype)  # [B,60,1]
        scale = has_shoulder / (dist + self.epsilon)  # [B,60,1]
        sel = (sel - mid.unsqueeze(2)) * scale.unsqueeze(2)  # [B,60,55,3]

        # --- B5 — xoay 2D cho vai nằm ngang (góc tính từ vai THÔ trước chuẩn
        # hoá — tịnh tiến/co giãn không đổi góc) -------------------------------
        #
        # BẪY ZERO TRAIN/SERVE SKEW — đừng viết thẳng atan2(d_y, d_x):
        # ONNX không có op Atan2, exporter phân rã nó thành phép chia y/x.
        # Khung thiếu vai có d = (0, 0, 0): PyTorch định nghĩa atan2(0,0) = 0
        # nhưng graph ONNX tính 0/0 = NaN, và NaN lan ra toàn bộ logits ngay
        # khi buffer chưa đầy 60 khung — đúng tình huống thật của chế độ Dịch.
        # Ép vector vai về (1, 0) ở những khung thiếu vai: góc = 0, giữ nguyên
        # ngữ nghĩa cũ, nhưng graph không còn phép chia 0/0.
        d = rs - ls  # [B,60,3]
        hs = has_shoulder.squeeze(-1)  # [B,60]
        dx = d[..., 0] * hs + (1.0 - hs)  # [B,60] — thiếu vai -> dx = 1
        dy = d[..., 1] * hs  # [B,60] — thiếu vai -> dy = 0
        angle = torch.atan2(dy, dx)  # [B,60]
        cos_a = torch.cos(-angle).unsqueeze(-1)  # [B,60,1]
        sin_a = torch.sin(-angle).unsqueeze(-1)
        px, py, pz = sel[..., 0], sel[..., 1], sel[..., 2]  # mỗi cái [B,60,55]
        rx = px * cos_a - py * sin_a
        ry = px * sin_a + py * cos_a
        sel = torch.stack([rx, ry, pz], dim=-1)  # [B,60,55,3]
        feat = sel.reshape(sel.shape[0], NUM_FRAMES_IN, COORD_FEATURES)  # [B,60,165]

        # --- B6 — nội suy tuyến tính về 32 khung, CHỈ dùng phần khung hợp lệ -
        n = valid.sum(dim=1, keepdim=True).clamp(min=2.0)  # [B,1] số khung hợp lệ
        p = self.resample_pos.unsqueeze(0) * (n - 1.0)  # [B,32] vị trí thực
        i0f = torch.floor(p)
        w = (p - i0f).unsqueeze(-1)  # [B,32,1]
        i0 = i0f.clamp(0, NUM_FRAMES_IN - 1).to(torch.int64)  # [B,32]
        i1 = (i0 + 1).clamp(max=NUM_FRAMES_IN - 1)

        def _gather(src: torch.Tensor, idx: torch.Tensor) -> torch.Tensor:
            # src [B,60,C], idx [B,32] -> [B,32,C]
            return torch.gather(src, 1, idx.unsqueeze(-1).expand(-1, -1, src.shape[-1]))

        coords = _gather(feat, i0) * (1.0 - w) + _gather(feat, i1) * w  # [B,32,165]
        mask32 = _gather(mk, i0) * (1.0 - w) + _gather(mk, i1) * w  # [B,32,3]

        # --- B7 — vận tốc, CHUẨN HOÁ THEO THỜI GIAN THẬT ----------------------
        #
        # BẪY TRAIN/SERVE SKEW — đừng lấy sai phân trần giữa các khung sau nội suy:
        # 32 khung sau nội suy KHÔNG có bước thời gian cố định, nó phụ thuộc độ dài
        # cửa sổ đầu vào.
        #   - Lúc train:  clip 3 giây  -> mỗi bước = 3/31 ≈ 96,8 ms
        #   - Lúc chạy:   buffer 2 giây -> mỗi bước = 2/31 ≈ 64,5 ms
        # Cùng một động tác, cùng tốc độ thật, sai phân trần sẽ cho velocity lệch
        # nhau 1,5 lần. Model học "nhanh chừng này" rồi gặp dữ liệu chậm hơn 1,5
        # lần — không test nào bắt được vì cả hai phía đều "chạy đúng".
        #
        # Chia cho bước thời gian thật rồi quy về mốc 1/30 giây: velocity trở
        # thành "dịch chuyển trong một khung ở 30fps", độc lập với độ dài cửa sổ
        # và với fps của máy quay.
        raw_vel = torch.cat(
            [
                torch.zeros_like(coords[:, :1, :]),
                coords[:, 1:, :] - coords[:, :-1, :],
            ],
            dim=1,
        )  # [B,32,165]

        # Khoảng thời gian thật của phần khung hợp lệ. Ô đệm có ts < 0 nên bị
        # `valid` triệt tiêu; contract quy định khung hợp lệ dồn về đầu và
        # timestamps tính tương đối so với khung đầu, nên max chính là độ dài.
        span_sec = torch.amax(ts * valid, dim=1, keepdim=True)  # [B,1]
        step_sec = span_sec / (self.target_frames - 1)  # [B,1]

        # span = 0 (chỉ 1 khung hợp lệ, hoặc không có khung nào) -> giữ nguyên
        # sai phân, không chia cho số gần 0.
        time_scale = torch.where(
            step_sec > 1e-6,
            REFERENCE_STEP_SEC / step_sec.clamp(min=1e-6),
            torch.ones_like(step_sec),
        )  # [B,1]

        vel = raw_vel * time_scale.unsqueeze(-1)  # [B,32,165]

        # --- B8 — ghép đặc trưng ------------------------------------------------
        return torch.cat([coords, vel, mask32], dim=-1)  # [B,32,333]


class VSLClassifierV2(nn.Module):
    """Model giả (dummy) cho interface ONNX 3 tensor.

    TRỌNG SỐ NGẪU NHIÊN, logits vô nghĩa, chỉ dùng để chốt interface cho
    P2 (app dịch) và P4 (chế độ học) build song song trong lúc chờ model
    thật (MỐC 3). KHÔNG dùng để đánh giá độ chính xác, KHÔNG đưa vào báo cáo.
    """

    def __init__(
        self,
        num_classes: int = NUM_CLASSES,
        seed: int = 20260819,
        hidden_dim: int = 64,
    ) -> None:
        super().__init__()
        self.preprocessor = VSLPreprocessorV2()
        self.backbone = nn.Sequential(
            nn.Flatten(),
            nn.Linear(TARGET_FRAMES * FEATURE_DIM, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, num_classes),
        )

        # Khởi tạo trọng số TẤT ĐỊNH bằng generator riêng (KHÔNG dùng
        # torch.manual_seed toàn cục — sẽ làm bẩn trạng thái ngẫu nhiên của
        # người gọi).
        gen = torch.Generator().manual_seed(seed)
        with torch.no_grad():
            for param in self.parameters():
                param.copy_(
                    torch.empty(param.shape, dtype=param.dtype).uniform_(
                        -0.05, 0.05, generator=gen
                    )
                )

    def forward(
        self,
        landmarks: torch.Tensor,
        mask: torch.Tensor,
        timestamps: torch.Tensor,
    ) -> torch.Tensor:
        preprocessed = self.preprocessor(landmarks, mask, timestamps)  # [B,32,333]
        logits = self.backbone(preprocessed)  # [B,51]
        return logits
