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
 * 10 ky hieu demo DA CHOT - xem specs/010-p1-foundation/spec.md muc 4.
 *
 * Danh sach nay do chu du an TRA TAY tren qipedc.moet.gov.vn/dictionary, tuc la
 * ca 10 tu deu co video mau that de ca nhom xem truoc khi quay. Trong
 * shared/labels.json chung mang dictionary_source = "QIPEDC"; 40 nhan con lai
 * mang "UNVERIFIED" vi chua tung duoc doi chieu voi tu dien.
 *
 * Danh sach TRUOC day (xin_chao, cam_on, ban, toi, khong, co, giup_do, hoc,
 * gia_dinh, nha, an, di) da bi BO: khi tra thu thi "xin chao" khong co trong tu
 * dien (chi co "chao"), "cam on" khong ra ket qua. Chung duoc chon dua tren suy
 * doan chu khong phai nguon that -> khong co video mau -> 5 nguoi quay se lam 5
 * kieu khac nhau cho cung mot nhan, va model hoc nhieu ma khong ai biet vi sao.
 *
 * Nguoi quay van co the bat "hien tat ca 51" de chon ky hieu khac neu can.
 */
const DEFAULT_DEMO_IDS = [
  1,  // chao
  3,  // xin_loi
  4,  // tam_biet
  22, // bo
  23, // me                (ma)
  42, // them
  43, // mu_chu
  44, // buc_minh
  45, // nuoc_viet_nam
  46, // nguoi_nuoc_ngoai
];

export const defaultDemoLabels: LabelEntry[] = allLabels.filter(
  (label) => label.code === IDLE_CODE || DEFAULT_DEMO_IDS.includes(label.id),
);
