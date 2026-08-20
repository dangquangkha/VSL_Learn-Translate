/**
 * Gom ket qua HandLandmarker + PoseLandmarker cua CUNG mot khung hinh thanh
 * mot FrameSample: 75 diem x 4 gia tri + mask[3] + timestamp.
 * Thu tu diem co dinh theo spec.md §3:
 *   0..32  pose (33 diem, dung "visibility" cua MediaPipe)
 *   33..53 tay trai (21 diem, handedness = "Left")
 *   54..74 tay phai (21 diem, handedness = "Right")
 * Nhom khong phat hien duoc -> toan bo toa do nhom do = 0.0 (khong phai NaN)
 * va mask tuong ung = 0. Tay khong co "visibility" tu MediaPipe -> ghi 1.0
 * neu phat hien, 0.0 neu khong.
 */
import type { HandLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision";
import {
  HAND_POINT_COUNT,
  LEFT_HAND_START,
  POINTS_PER_FRAME,
  POSE_POINT_COUNT,
  POSE_START,
  RIGHT_HAND_START,
  VALUES_PER_POINT,
  type FrameMask,
  type FrameSample,
  type Presence,
} from "./types";

function writeZeroPoints(points: Float32Array, start: number, count: number): void {
  const from = start * VALUES_PER_POINT;
  const to = from + count * VALUES_PER_POINT;
  points.fill(0, from, to);
}

function writePosePoints(points: Float32Array, poseResult: PoseLandmarkerResult): boolean {
  const pose = poseResult.landmarks[0];
  if (!pose || pose.length === 0) {
    writeZeroPoints(points, POSE_START, POSE_POINT_COUNT);
    return false;
  }
  for (let i = 0; i < POSE_POINT_COUNT; i++) {
    const lm = pose[i];
    const base = (POSE_START + i) * VALUES_PER_POINT;
    if (!lm) {
      points[base] = 0;
      points[base + 1] = 0;
      points[base + 2] = 0;
      points[base + 3] = 0;
      continue;
    }
    points[base] = lm.x;
    points[base + 1] = lm.y;
    points[base + 2] = lm.z;
    // Pose: dung visibility do MediaPipe tra ve (co the undefined tren mot so
    // build cu -> mac dinh 0 thay vi NaN).
    points[base + 3] = typeof lm.visibility === "number" ? lm.visibility : 0;
  }
  return true;
}

/** Ghi 21 diem cua mot ban tay tai vi tri `start`, hoac toan 0 neu `hand` null. */
function writeHandPoints(
  points: Float32Array,
  start: number,
  hand: HandLandmarkerResult["landmarks"][number] | null,
): boolean {
  if (!hand || hand.length === 0) {
    writeZeroPoints(points, start, HAND_POINT_COUNT);
    return false;
  }
  for (let i = 0; i < HAND_POINT_COUNT; i++) {
    const lm = hand[i];
    const base = (start + i) * VALUES_PER_POINT;
    if (!lm) {
      points[base] = 0;
      points[base + 1] = 0;
      points[base + 2] = 0;
      points[base + 3] = 0;
      continue;
    }
    points[base] = lm.x;
    points[base + 1] = lm.y;
    points[base + 2] = lm.z;
    // Tay: MediaPipe khong tra visibility co y nghia -> 1.0 vi da phat hien duoc.
    points[base + 3] = 1.0;
  }
  return true;
}

/** Tim landmark list cua ban tay khop voi nhan handedness ("Left"/"Right"). */
function findHandByLabel(
  handResult: HandLandmarkerResult,
  label: "Left" | "Right",
): HandLandmarkerResult["landmarks"][number] | null {
  const handedness = handResult.handedness ?? handResult.handednesses;
  for (let i = 0; i < handedness.length; i++) {
    const category = handedness[i]?.[0];
    if (category?.categoryName === label) {
      return handResult.landmarks[i] ?? null;
    }
  }
  return null;
}

/**
 * Xac dinh nhanh xem khung hinh nay co thay pose/tay trai/tay phai hay
 * khong, dung chung cho hien thi trang thai thoi gian thuc (R-05) va cho
 * assembleFrame ben duoi - tranh trung logic tim handedness.
 */
export function detectPresence(
  handResult: HandLandmarkerResult,
  poseResult: PoseLandmarkerResult,
): Presence {
  const pose = poseResult.landmarks.length > 0 && (poseResult.landmarks[0]?.length ?? 0) > 0;
  const leftHand = findHandByLabel(handResult, "Left") !== null;
  const rightHand = findHandByLabel(handResult, "Right") !== null;
  return { pose, leftHand, rightHand };
}

export function assembleFrame(
  handResult: HandLandmarkerResult,
  poseResult: PoseLandmarkerResult,
  timestampSec: number,
): FrameSample {
  const points = new Float32Array(POINTS_PER_FRAME * VALUES_PER_POINT);

  const poseSeen = writePosePoints(points, poseResult);
  const leftHand = findHandByLabel(handResult, "Left");
  const rightHand = findHandByLabel(handResult, "Right");
  const leftSeen = writeHandPoints(points, LEFT_HAND_START, leftHand);
  const rightSeen = writeHandPoints(points, RIGHT_HAND_START, rightHand);

  const mask: FrameMask = [poseSeen ? 1 : 0, leftSeen ? 1 : 0, rightSeen ? 1 : 0];

  return { points, mask, timestampSec };
}
