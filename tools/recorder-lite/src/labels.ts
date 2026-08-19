/**
 * Nguon su that duy nhat cho 51 nhan: shared/labels.json (xem AGENTS.md muc 1.1).
 * Doc truc tiep qua alias Vite "@shared" - xem vite.config.ts va tsconfig.json.
 */
import rawLabels from "@shared/labels.json";
import type { LabelEntry, LabelsFile } from "./types";

export const labelsFile = rawLabels as LabelsFile;

export const allLabels: LabelEntry[] = [...labelsFile.labels].sort(
  (a, b) => a.id - b.id,
);

export const labelByCode = new Map<string, LabelEntry>(
  allLabels.map((label) => [label.code, label]),
);

export const IDLE_CODE = "idle";

/**
 * GIA DINH (spec khong liet ke ro danh sach "12 ky hieu demo"):
 * dung 12 ky hieu dau tien sau idle (id 1..12) theo dung thu tu trong
 * shared/labels.json lam bo mac dinh khi mo recorder-lite. Nguoi quay van
 * co the bat "hien tat ca 51" de chon ky hieu khac neu can.
 */
const DEFAULT_DEMO_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const defaultDemoLabels: LabelEntry[] = allLabels.filter(
  (label) => label.code === IDLE_CODE || DEFAULT_DEMO_IDS.includes(label.id),
);
