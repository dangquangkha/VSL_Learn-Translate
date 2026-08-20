/**
 * Phat lai khung xuong (skeleton) tu landmark DA GHI, len mot <canvas>.
 *
 * VI SAO KHONG PHAT LAI VIDEO:
 * Ghi video song song bang MediaRecorder lam tut fps cua vong lap MediaPipe —
 * do that tren may quay: 23.5fps/72 khung -> 20.2fps/61 khung (VP9 2Mbps), va
 * 21.4fps/66 khung sau khi ha xuong VP8 800kbps. So khung landmark la DU LIEU
 * THAT, con doan video chi de liec qua roi bo, nen khong dang danh doi.
 *
 * Cach nay khong ton them CPU luc quay: du lieu da nam san trong FrameSample[].
 * Va no cho thay dung thu MODEL nhin thay, khong phai thu mat nguoi nhin thay —
 * tay bi mat dau thi bien mat khoi khung xuong, thay ngay.
 */
import {
  HAND_POINT_COUNT,
  LEFT_HAND_START,
  POSE_POINT_COUNT,
  RIGHT_HAND_START,
  VALUES_PER_POINT,
  type FrameSample,
} from "./types";

/** Cac doan noi cua ban tay MediaPipe (21 diem). */
const HAND_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], // ngon cai
  [0, 5], [5, 6], [6, 7], [7, 8], // ngon tro
  [5, 9], [9, 10], [10, 11], [11, 12], // ngon giua
  [9, 13], [13, 14], [14, 15], [15, 16], // ngon ap ut
  [13, 17], [17, 18], [18, 19], [19, 20], // ngon ut
  [0, 17], // canh long ban tay
];

/**
 * Chi ve phan than tren cua pose. Diem chan/hong bi MediaPipe ngoai suy ra
 * ngoai khung khi nguoi quay chi lot nua nguoi tren — ve chung vao chi lam roi
 * mat, va model cung khong dung chung (xem SELECTED_POINTS trong
 * ai_pipeline/models/vsl_classifier_v2.py).
 */
const POSE_EDGES: ReadonlyArray<readonly [number, number]> = [
  [11, 12], // hai vai
  [11, 13], [13, 15], // tay trai: vai - khuyu - co tay
  [12, 14], [14, 16], // tay phai
];

const POSE_DOTS = [0, 11, 12, 13, 14, 15, 16] as const;

const MAU = {
  pose: "#8b949e",
  leftHand: "#58a6ff",
  rightHand: "#e3b341",
  nen: "#0d1117",
  chuThich: "#6e7681",
} as const;

export interface SkeletonPlayerHandle {
  /** Dung phat va huy requestAnimationFrame. Goi truoc khi phat clip khac. */
  stop(): void;
}

export interface SkeletonPlayerOptions {
  canvas: HTMLCanvasElement;
  frames: FrameSample[];
  /** Lat guong cho khop khung webcam truc tiep (mac dinh true). */
  mirror?: boolean;
}

/**
 * Phat lai `frames` theo dung `timestampSec` cua tung khung, lap vo han.
 * Tra ve handle de dung lai.
 */
export function playSkeleton(options: SkeletonPlayerOptions): SkeletonPlayerHandle {
  const { canvas, frames, mirror = true } = options;
  const ctx = canvas.getContext("2d");

  if (!ctx || frames.length === 0) {
    return { stop: () => {} };
  }

  const thoiLuong = frames[frames.length - 1]!.timestampSec || 0.001;
  const batDau = performance.now();
  let rafId: number | null = null;

  const tick = (): void => {
    rafId = requestAnimationFrame(tick);

    // Vi tri trong clip, lap lai khi het
    const troiQua = ((performance.now() - batDau) / 1000) % thoiLuong;

    // Tim khung gan nhat theo timestamp that (khong gia dinh fps co dinh)
    let idx = 0;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i]!.timestampSec <= troiQua) idx = i;
      else break;
    }

    veKhung(ctx, canvas, frames[idx]!, mirror);
  };

  rafId = requestAnimationFrame(tick);

  return {
    stop(): void {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}

function veKhung(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  frame: FrameSample,
  mirror: boolean,
): void {
  const { width: W, height: H } = canvas;

  ctx.fillStyle = MAU.nen;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  if (mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }

  const [poseSeen, leftSeen, rightSeen] = frame.mask;

  if (poseSeen === 1) {
    veNhom(ctx, frame, 0, POSE_EDGES, POSE_DOTS, MAU.pose, W, H, 2);
  }
  if (leftSeen === 1) {
    veNhom(ctx, frame, LEFT_HAND_START, HAND_EDGES, null, MAU.leftHand, W, H, 1.5);
  }
  if (rightSeen === 1) {
    veNhom(ctx, frame, RIGHT_HAND_START, HAND_EDGES, null, MAU.rightHand, W, H, 1.5);
  }

  ctx.restore();

  // Chu thich mau tay — ve NGOAI phep lat guong de chu khong bi nguoc
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillStyle = MAU.leftHand;
  ctx.fillText(leftSeen === 1 ? "tay trái" : "tay trái: mất", 8, H - 20);
  ctx.fillStyle = MAU.rightHand;
  ctx.fillText(rightSeen === 1 ? "tay phải" : "tay phải: mất", 8, H - 6);
  ctx.fillStyle = MAU.chuThich;
  ctx.fillText(`${frame.timestampSec.toFixed(2)}s`, W - 42, H - 6);
}

function veNhom(
  ctx: CanvasRenderingContext2D,
  frame: FrameSample,
  offset: number,
  edges: ReadonlyArray<readonly [number, number]>,
  dots: ReadonlyArray<number> | null,
  mau: string,
  W: number,
  H: number,
  doDay: number,
): void {
  const lay = (i: number): [number, number] => {
    const base = (offset + i) * VALUES_PER_POINT;
    return [frame.points[base]! * W, frame.points[base + 1]! * H];
  };

  ctx.strokeStyle = mau;
  ctx.fillStyle = mau;
  ctx.lineWidth = doDay;
  ctx.lineCap = "round";

  for (const [a, b] of edges) {
    // Pose dung chi so tuyet doi (11, 12...), tay dung chi so 0..20 + offset
    const ia = offset === 0 ? a : a;
    const ib = offset === 0 ? b : b;
    const [x1, y1] = lay(ia);
    const [x2, y2] = lay(ib);
    // Diem (0,0) nghia la khong co du lieu -> bo qua doan do
    if ((x1 === 0 && y1 === 0) || (x2 === 0 && y2 === 0)) continue;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  const diem = dots ?? Array.from({ length: HAND_POINT_COUNT }, (_, i) => i);
  for (const i of diem) {
    const [x, y] = lay(i);
    if (x === 0 && y === 0) continue;
    ctx.beginPath();
    ctx.arc(x, y, doDay + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Kiem tra hang so layout khong bi doi ngam duoi chan. */
if (POSE_POINT_COUNT !== 33 || HAND_POINT_COUNT !== 21) {
  throw new Error("Layout landmark da doi — cap nhat lai skeletonPlayer.");
}
