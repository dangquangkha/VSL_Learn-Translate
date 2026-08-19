/**
 * Vong lap webcam: moi khung hinh (requestAnimationFrame) chay Hand + Pose
 * Landmarker TREN CUNG mot video frame va cung mot timestamp, khong xen ke,
 * de dam bao timestamp cua hai nhom khop nhau (spec.md, plan.md).
 */
import type { HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

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
