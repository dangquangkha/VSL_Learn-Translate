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
 * 12 ky hieu demo DA CHOT - xem specs/010-p1-foundation/spec.md muc 4.
 *
 * Chon theo nguyen tac: tranh cac cap de nham, trai deu ve vi tri thuc hien
 * (mat / nguc / khong gian trung tinh) va kieu chuyen dong. Voi 12 lop ma chi
 * ~60 mau/lop, hai ky hieu giong nhau la du de keo tut do chinh xac.
 *
 * Da loai co chu dich:
 *   tam_biet            - de nham xin_chao (deu la dong tac vay tay)
 *   xin_loi             - de nham cam_on (cung vung cam/mieng)
 *   uong                - de nham an (cung vi tri o mieng)
 *   anh/chi/em/bo/me/   - nhom nguoi than thuong chung hinh tay,
 *   ong/ba                chi khac vi tri
 *   hom_nay/ngay_mai/   - rui ro nham CAO NHAT: cung goc,
 *   hom_qua               chi khac huong chuyen dong
 *
 * Nguoi quay van co the bat "hien tat ca 51" de chon ky hieu khac neu can.
 */
const DEFAULT_DEMO_IDS = [
  1,  // xin_chao  - chao hoi, gan dau
  2,  // cam_on    - xa giao, khac vi tri voi xin_chao
  5,  // ban       - chi ra ngoai
  6,  // toi       - chi vao minh, tuong phan ro voi ban
  10, // khong     - phu dinh
  11, // co        - khang dinh, tuong phan ro voi khong
  12, // giup_do   - hai tay, chuyen dong nang
  15, // hoc       - truu tuong
  21, // gia_dinh  - hai tay, chuyen dong vong
  30, // nha       - hai tay tao hinh mai, khac biet nhat trong tap
  34, // an        - tay dua len mieng
  38, // di        - chuyen dong ngang
];

export const defaultDemoLabels: LabelEntry[] = allLabels.filter(
  (label) => label.code === IDLE_CODE || DEFAULT_DEMO_IDS.includes(label.id),
);
