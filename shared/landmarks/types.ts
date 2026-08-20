/**
 * Kieu du lieu + hang so dung chung cho viec trich landmark (P1-4).
 * Chuyen nguyen van tu tools/recorder-lite/src/types.ts, doi chieu voi
 * specs/010-p1-foundation/spec.md muc 3 (dinh dang .vslm) va muc 4 (P1-1).
 */

// ---- landmark theo khung hinh ---------------------------------------------

/** Mot khung hinh landmark da gom: 75 diem x 4 gia tri (x, y, z, visibility). */
export const POINTS_PER_FRAME = 75;
export const VALUES_PER_POINT = 4;
export const POSE_POINT_COUNT = 33;
export const HAND_POINT_COUNT = 21;

/** Vi tri bat dau cua tung nhom trong mang 75 diem, khop spec §3. */
export const POSE_START = 0;
export const LEFT_HAND_START = POSE_POINT_COUNT; // 33
export const RIGHT_HAND_START = POSE_POINT_COUNT + HAND_POINT_COUNT; // 54

/** Mask 3 gia tri: [pose, tay trai, tay phai], moi gia tri 0 hoac 1. */
export type FrameMask = [number, number, number];

export interface FrameSample {
  /** Do dai co dinh POINTS_PER_FRAME * VALUES_PER_POINT = 300. */
  points: Float32Array;
  mask: FrameMask;
  /** Giay, tuong doi so voi khung dau tien cua lan ghi. */
  timestampSec: number;
}

// ---- trang thai thoi gian thuc hien thi tren UI ---------------------------

export interface LiveStats {
  fps: number;
  poseSeen: boolean;
  leftHandSeen: boolean;
  rightHandSeen: boolean;
}

// ---- hien dien pose/tay cua mot khung hinh ---------------------------------

export interface Presence {
  pose: boolean;
  leftHand: boolean;
  rightHand: boolean;
}

// ---- header file .vslm (spec §3, 12 truong bat buoc) ----------------------
// point_layout va cau truc header dung chung cho moi ung dung ghi file .vslm.
// recorder_version KHONG con la literal "lite-1" co dinh: tung ung dung ghi
// (recorder-lite, Recorder that cua P3, ...) tu truyen gia tri rieng qua
// tham so recorderVersion cua buildVslmFile() (xem vslmWriter.ts).

export interface VslmHeader {
  format: "vslm";
  version: 1;
  participant_code: string;
  sign_code: string;
  label_index: number;
  frame_count: number;
  point_layout: [["pose", 33], ["left_hand", 21], ["right_hand", 21]];
  values_per_point: 4;
  duration_ms: number;
  fps_avg: number;
  video_width: number;
  video_height: number;
  recorded_at: string;
  recorder_version: string;
}

export const POINT_LAYOUT: VslmHeader["point_layout"] = [
  ["pose", 33],
  ["left_hand", 21],
  ["right_hand", 21],
];
