/**
 * Tinh cac chi so hien thi o man hinh Review sau khi ket thuc mot lan ghi
 * (R-07) va canh bao khong chan (R-10): fps_avg < 15 hoac > 20% khung hinh
 * mat ca hai tay.
 */
import type { FrameSample, RecordingSummary } from "./types";

const LOW_FPS_THRESHOLD = 15;
const MISSING_HANDS_WARNING_RATIO = 0.2;

export function computeSummary(frames: FrameSample[], durationMs: number): RecordingSummary {
  const frameCount = frames.length;
  const fpsAvg = durationMs > 0 ? (frameCount * 1000) / durationMs : 0;

  let leftSeenCount = 0;
  let rightSeenCount = 0;
  let bothMissingCount = 0;

  for (const frame of frames) {
    const leftSeen = frame.mask[1] === 1;
    const rightSeen = frame.mask[2] === 1;
    if (leftSeen) leftSeenCount++;
    if (rightSeen) rightSeenCount++;
    if (!leftSeen && !rightSeen) bothMissingCount++;
  }

  const leftHandRatio = frameCount > 0 ? leftSeenCount / frameCount : 0;
  const rightHandRatio = frameCount > 0 ? rightSeenCount / frameCount : 0;
  const bothHandsMissingRatio = frameCount > 0 ? bothMissingCount / frameCount : 0;

  return {
    frameCount,
    durationMs,
    fpsAvg,
    leftHandRatio,
    rightHandRatio,
    bothHandsMissingRatio,
    lowFps: fpsAvg < LOW_FPS_THRESHOLD,
    tooManyMissingHands: bothHandsMissingRatio > MISSING_HANDS_WARNING_RATIO,
  };
}
