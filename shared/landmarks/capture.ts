/**
 * Vong lap webcam: moi khung hinh (requestAnimationFrame) chay Hand + Pose
 * Landmarker TREN CUNG mot video frame va cung mot timestamp, khong xen ke,
 * de dam bao timestamp cua hai nhom khop nhau (spec.md, plan.md).
 */
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import { assembleFrame, detectPresence } from "./frameAssembler";
import type { FrameSample, LiveStats, Presence } from "./types";

export interface RawFrame {
  /** performance.now() tai thoi diem xu ly khung hinh nay, don vi ms. */
  capturedAtMs: number;
  handResult: ReturnType<HandLandmarker["detectForVideo"]>;
  poseResult: ReturnType<PoseLandmarker["detectForVideo"]>;
}

export type RawFrameListener = (frame: RawFrame) => void;

export class CaptureLoop {
  private rafId: number | null = null;
  private lastVideoTimestamp = -1;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly handLandmarker: HandLandmarker,
    private readonly poseLandmarker: PoseLandmarker,
  ) {}

  start(onFrame: RawFrameListener): void {
    if (this.rafId !== null) return;
    const tick = (): void => {
      this.rafId = requestAnimationFrame(tick);
      if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      // Trach frame trung lap khi webcam chua co khung hinh moi.
      if (this.video.currentTime === this.lastVideoTimestamp) return;
      this.lastVideoTimestamp = this.video.currentTime;

      const nowMs = performance.now();
      // Goi lien tiep, dong bo (JS don luong) tren CUNG mot video frame va
      // CUNG mot moc thoi gian -> khong xen ke giua hai model.
      const handResult = this.handLandmarker.detectForVideo(this.video, nowMs);
      const poseResult = this.poseLandmarker.detectForVideo(this.video, nowMs);

      onFrame({ capturedAtMs: nowMs, handResult, poseResult });
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastVideoTimestamp = -1;
  }
}

/** Xin quyen webcam va gan stream vao the <video>, tra ve do phan giai thuc te. */
export async function startWebcam(
  video: HTMLVideoElement,
): Promise<{ width: number; height: number }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  await waitForVideoReady(video);
  return { width: video.videoWidth, height: video.videoHeight };
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const onReady = (): void => {
      if (video.videoWidth > 0) {
        video.removeEventListener("loadeddata", onReady);
        resolve();
      }
    };
    video.addEventListener("loadeddata", onReady);
  });
}

// ---- API cap cao: createLandmarkStream() -----------------------------------
// Ghep CaptureLoop + assembleFrame + detectPresence + dong ho fps/timestamp
// thanh mot stream don gian cho ben tieu thu (P2 Dich, P3 Recorder that, P4
// Hoc). Khong tu goi startWebcam/createLandmarkers - ben goi tu tao va truyen
// vao, vi P2 co the chay trong Web Worker / vong doi khac.

/**
 * Kich thuoc cua so trung binh truot de tinh fps trong getStats(). Khop dung
 * cach recorder-lite dang tinh o main.ts (computeRollingFps, FPS_WINDOW_SIZE
 * = 30) de hanh vi hien thi fps khong doi khi P2/P3/P4 dung lai stream nay.
 */
const STATS_WINDOW_SIZE = 30;

export interface LandmarkStreamOptions {
  video: HTMLVideoElement;
  handLandmarker: HandLandmarker;
  poseLandmarker: PoseLandmarker;
  /** Gọi mỗi khung hình, sau khi đã gom đủ 75 điểm. */
  onFrame: (sample: FrameSample, presence: Presence) => void;
}

export interface LandmarkStream {
  start(): void;
  stop(): void;
  /** Đặt lại mốc t0: khung kế tiếp sẽ có timestampSec = 0. */
  resetClock(): void;
  /** fps trung bình trượt + trạng thái thấy pose/tay của khung gần nhất. */
  getStats(): LiveStats;
}

export function createLandmarkStream(options: LandmarkStreamOptions): LandmarkStream {
  const { video, handLandmarker, poseLandmarker, onFrame } = options;
  const loop = new CaptureLoop(video, handLandmarker, poseLandmarker);

  let t0Ms: number | null = null;
  const fpsTimestamps: number[] = [];
  let lastPresence: Presence = { pose: false, leftHand: false, rightHand: false };

  const handleRawFrame: RawFrameListener = (frame) => {
    const presence = detectPresence(frame.handResult, frame.poseResult);
    lastPresence = presence;

    fpsTimestamps.push(frame.capturedAtMs);
    if (fpsTimestamps.length > STATS_WINDOW_SIZE) {
      fpsTimestamps.shift();
    }

    if (t0Ms === null) {
      t0Ms = frame.capturedAtMs;
    }
    const timestampSec = (frame.capturedAtMs - t0Ms) / 1000;

    const sample = assembleFrame(frame.handResult, frame.poseResult, timestampSec);
    onFrame(sample, presence);
  };

  return {
    start(): void {
      loop.start(handleRawFrame);
    },
    stop(): void {
      loop.stop();
    },
    resetClock(): void {
      t0Ms = null;
    },
    getStats(): LiveStats {
      return {
        fps: computeRollingFps(fpsTimestamps),
        poseSeen: lastPresence.pose,
        leftHandSeen: lastPresence.leftHand,
        rightHandSeen: lastPresence.rightHand,
      };
    },
  };
}

/** Cung cong thuc voi computeRollingFps o recorder-lite main.ts. */
function computeRollingFps(timestamps: number[]): number {
  if (timestamps.length < 2) return 0;
  const first = timestamps[0]!;
  const last = timestamps[timestamps.length - 1]!;
  const elapsedSec = (last - first) / 1000;
  if (elapsedSec <= 0) return 0;
  return (timestamps.length - 1) / elapsedSec;
}
