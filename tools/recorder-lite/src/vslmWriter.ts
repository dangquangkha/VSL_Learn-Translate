/**
 * Ghi file .vslm dung boc cuc nhi phan spec.md §3:
 *   [uint32 LE headerLen][header JSON UTF-8]
 *   [float32 LE landmarks F*75*4][float32 LE timestamps F][uint8 mask F*3]
 * Tat ca so nhieu byte deu little-endian, ghi tuong minh bang DataView de
 * khong phu thuoc endianness cua platform.
 */
import {
  POINTS_PER_FRAME,
  POINT_LAYOUT,
  RECORDER_VERSION,
  VALUES_PER_POINT,
  type FrameSample,
  type VslmHeader,
} from "./types";

export interface VslmWriteInput {
  participantCode: string;
  signCode: string;
  labelIndex: number;
  frames: FrameSample[];
  durationMs: number;
  fpsAvg: number;
  videoWidth: number;
  videoHeight: number;
  /** ISO 8601 UTC, vd "2026-08-19T21:30:00.000Z". Mac dinh: thoi diem bat dau ghi. */
  recordedAt: string;
}

export interface VslmFile {
  header: VslmHeader;
  blob: Blob;
  fileName: string;
}

function buildHeader(input: VslmWriteInput): VslmHeader {
  return {
    format: "vslm",
    version: 1,
    participant_code: input.participantCode,
    sign_code: input.signCode,
    label_index: input.labelIndex,
    frame_count: input.frames.length,
    point_layout: POINT_LAYOUT,
    values_per_point: VALUES_PER_POINT,
    duration_ms: Math.round(input.durationMs),
    fps_avg: Math.round(input.fpsAvg * 10) / 10,
    video_width: input.videoWidth,
    video_height: input.videoHeight,
    recorded_at: input.recordedAt,
    recorder_version: RECORDER_VERSION,
  };
}

/** `{participant_code}__{sign_code}__{recorded_at_compact}.vslm` (spec.md §3). */
function buildFileName(header: VslmHeader): string {
  // "2026-08-19T21:30:00.123Z" -> "20260819T213000123Z"
  const compact = header.recorded_at.replace(/[-:.]/g, "");
  const safeParticipant = sanitizeForFileName(header.participant_code);
  const safeSign = sanitizeForFileName(header.sign_code);
  return `${safeParticipant}__${safeSign}__${compact}.vslm`;
}

function sanitizeForFileName(value: string): string {
  const cleaned = value.trim().replace(/[^A-Za-z0-9_-]+/g, "_");
  return cleaned.length > 0 ? cleaned : "unknown";
}

export function buildVslmFile(input: VslmWriteInput): VslmFile {
  const header = buildHeader(input);
  const frameCount = header.frame_count;

  const headerJson = JSON.stringify(header);
  const headerBytes = new TextEncoder().encode(headerJson);
  const headerLen = headerBytes.byteLength;

  const landmarksBytes = frameCount * POINTS_PER_FRAME * VALUES_PER_POINT * 4;
  const timestampsBytes = frameCount * 4;
  const maskBytes = frameCount * 3;

  const totalBytes = 4 + headerLen + landmarksBytes + timestampsBytes + maskBytes;
  const buffer = new ArrayBuffer(totalBytes);
  const view = new DataView(buffer);
  let offset = 0;

  view.setUint32(offset, headerLen, true);
  offset += 4;

  new Uint8Array(buffer, offset, headerLen).set(headerBytes);
  offset += headerLen;

  for (const frame of input.frames) {
    if (frame.points.length !== POINTS_PER_FRAME * VALUES_PER_POINT) {
      throw new Error(
        `Frame co ${frame.points.length} gia tri, ky vong ${POINTS_PER_FRAME * VALUES_PER_POINT}`,
      );
    }
    for (let i = 0; i < frame.points.length; i++) {
      view.setFloat32(offset, frame.points[i] ?? 0, true);
      offset += 4;
    }
  }

  for (const frame of input.frames) {
    view.setFloat32(offset, frame.timestampSec, true);
    offset += 4;
  }

  for (const frame of input.frames) {
    view.setUint8(offset, frame.mask[0]);
    offset += 1;
    view.setUint8(offset, frame.mask[1]);
    offset += 1;
    view.setUint8(offset, frame.mask[2]);
    offset += 1;
  }

  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const fileName = buildFileName(header);

  return { header, blob, fileName };
}

/** Kich hoat tai file ve may bang Blob + the <a download> (khong dung File System Access API). */
export function downloadVslmFile(file: VslmFile): void {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Nha URL sau mot nhip de trinh duyet kip bat dau tai.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
