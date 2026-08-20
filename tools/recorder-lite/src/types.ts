/**
 * Kieu du lieu dung chung cho recorder-lite.
 * Doi chieu voi specs/010-p1-foundation/spec.md muc 3 (dinh dang .vslm) va muc 4 (P1-1).
 *
 * Phan trich landmark dung chung (POINTS_PER_FRAME, FrameSample, Presence, ...)
 * da chuyen sang shared/landmarks/ (P1-4) va duoc re-export lai o day de khong
 * phai sua import o nhieu noi trong recorder-lite.
 */

// ---- shared/labels.json --------------------------------------------------

export interface LabelEntry {
  id: number;
  code: string;
  display_name_vi: string;
  dictionary_source: string;
}

export interface LabelsFile {
  version: string;
  total_classes: number;
  labels: LabelEntry[];
}

// ---- landmark theo khung hinh (chuyen sang shared/landmarks/types.ts) -----

export type { FrameMask, FrameSample, LiveStats, Presence } from "@shared/landmarks";
export {
  POINTS_PER_FRAME,
  VALUES_PER_POINT,
  POSE_POINT_COUNT,
  HAND_POINT_COUNT,
  POSE_START,
  LEFT_HAND_START,
  RIGHT_HAND_START,
} from "@shared/landmarks";

// ---- header file .vslm (VslmHeader + POINT_LAYOUT chuyen sang shared/landmarks) --

export type { VslmHeader } from "@shared/landmarks";
export { POINT_LAYOUT } from "@shared/landmarks";

/**
 * Nhan dang phien ban recorder-lite ghi vao header.recorder_version. Rieng
 * cua recorder-lite (Recorder that cua P3 se dung gia tri khac) nen o lai
 * day, khong chuyen sang shared/landmarks - xem VslmWriteInput.recorderVersion
 * trong shared/landmarks/vslmWriter.ts.
 */
export const RECORDER_VERSION = "lite-1" as const;

// ---- ket qua tinh toan sau mot lan ghi -------------------------------------

/** Ket qua tinh toan sau khi ket thuc mot lan ghi, dung de hien thi man hinh Review. */
export interface RecordingSummary {
  frameCount: number;
  durationMs: number;
  fpsAvg: number;
  leftHandRatio: number;
  rightHandRatio: number;
  bothHandsMissingRatio: number;
  /** Doan LIEN TUC dai nhat (giay) co it nhat mot tay — thuoc do chinh de danh
   *  gia clip. Mat tay o dau/cuoi clip la binh thuong (pha chuan bi / ha tay),
   *  chi mat o giua moi la loi. Xem chu thich trong summary.ts. */
  longestHandRunSec: number;
  lowFps: boolean;
  tooManyMissingHands: boolean;
}
