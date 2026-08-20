/**
 * Preset do phan giai cho webcam + kiem tra ti le khung hinh.
 *
 * VI SAO CAN CHON DO PHAN GIAI:
 * Cua so model la 60 KHUNG, clip dai 3 giay -> can >= 20 fps. Do tren du lieu
 * quay that: P01 dat 22.5 fps (dung duoc), P3 dat 13.3 fps va P05 bi ghim cung
 * o 15.0 fps (khong dung duoc, moi clip chi 29-58 khung).
 *
 * Rat nhieu webcam chi chay 1280x720 o 15fps nhung chay duoc 640x360 o 30fps.
 * Ta xin ca ba thu (width/height/frameRate) deu la rang buoc MEM (`ideal`), nen
 * trinh duyet thoa man do phan giai truoc roi chap nhan 15fps. Ha do phan giai
 * la don bay re nhat de lay lai fps.
 *
 * Ha do phan giai KHONG lam doi du lieu: MediaPipe tra landmark da chuan hoa ve
 * [0,1] theo chieu rong/cao anh, nen x = 0.5 van la chinh giua du 1280 hay 640
 * pixel. No chi lam landmark nhieu hon mot chut.
 */

export type ResolutionId = "720p" | "540p" | "360p";

export interface ResolutionPreset {
  id: ResolutionId;
  /** Nhan hien thi tren <select>. */
  label: string;
  width: number;
  height: number;
}

/**
 * TAT CA deu phai la 16:9. Xem `isSixteenNine` ben duoi ve ly do.
 *
 * Xep theo thu tu GIAM DAN — `suggestLowerPreset` dua vao thu tu nay.
 */
export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
  { id: "720p", label: "1280×720 — cao (mặc định)", width: 1280, height: 720 },
  { id: "540p", label: "960×540 — vừa", width: 960, height: 540 },
  { id: "360p", label: "640×360 — thấp (máy yếu / camera bị chặn fps)", width: 640, height: 360 },
];

export const DEFAULT_PRESET_ID: ResolutionId = "720p";

/** 60 khung / 3 giay. Duoi nguong nay thi clip khong du khung cho cua so model. */
export const MIN_FPS_FOR_60_FRAMES = 20;

const TARGET_ASPECT = 16 / 9;

/**
 * Sai so cho phep quanh 16:9. 2% du rong de nuot sai so lam tron cua tung
 * webcam, va con rat xa 4:3 (lech 25%) nen khong bao gio nham hai loai voi nhau.
 */
const ASPECT_TOLERANCE = 0.02;

/** Lay preset theo id; id la / thieu -> lui ve mac dinh thay vi nem loi. */
export function getPreset(id: string | null | undefined): ResolutionPreset {
  const found = RESOLUTION_PRESETS.find((p) => p.id === id);
  return found ?? RESOLUTION_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID)!;
}

/**
 * TI LE KHUNG HINH PHAI CO DINH 16:9 — day la rang buoc quan trong nhat o day.
 *
 * Do phan giai khac nhau thi khong sao vi landmark da chuan hoa. Nhung TI LE
 * khac nhau thi co: 1280x720 la 16:9, con 640x480 la 4:3.
 *
 * Doi ti le la co gian KHONG DEU — truc x bi nen khac truc y. Buoc chuan hoa
 * theo vai trong ONNX graph chia ca x lan y cho CUNG mot khoang cach vai, nen
 * no khu duoc co gian DEU (ngoi gan/xa, ong kinh rong/hep) nhung KHONG khu duoc
 * co gian khong deu. Mot vong tay tron quay o 16:9 se thanh hinh bau duc o 4:3,
 * va khong buoc nao trong graph go lai duoc.
 *
 * Khong test nao do. Chi thay accuracy thap ma khong truy duoc nguyen nhan.
 *
 * `getUserMedia` co the tra ve che do khac cai duoc xin, nen phai do lai thu
 * THUC SU nhan duoc (`video.videoWidth/videoHeight`), khong duoc tin loi xin.
 */
export function isSixteenNine(width: number, height: number): boolean {
  if (!(width > 0) || !(height > 0)) return false;
  const ratio = width / height;
  return Math.abs(ratio - TARGET_ASPECT) / TARGET_ASPECT <= ASPECT_TOLERANCE;
}

const TI_LE_QUEN_THUOC: ReadonlyArray<{ ratio: number; ten: string }> = [
  { ratio: 16 / 9, ten: "16:9" },
  { ratio: 4 / 3, ten: "4:3" },
  { ratio: 16 / 10, ten: "16:10" },
  { ratio: 3 / 2, ten: "3:2" },
  { ratio: 1, ten: "1:1" },
];

/** Ten ti le de hien trong thong bao loi, vi du "4:3". Khong nhan ra thi tra "1.55:1". */
export function describeAspect(width: number, height: number): string {
  if (!(width > 0) || !(height > 0)) return "?";
  const ratio = width / height;
  for (const { ratio: r, ten } of TI_LE_QUEN_THUOC) {
    if (Math.abs(ratio - r) / r <= ASPECT_TOLERANCE) return ten;
  }
  return `${ratio.toFixed(2)}:1`;
}

/** Muc thap hon ke tiep, hoac null neu da o muc thap nhat. */
export function suggestLowerPreset(current: ResolutionPreset): ResolutionPreset | null {
  const i = RESOLUTION_PRESETS.findIndex((p) => p.id === current.id);
  if (i < 0 || i >= RESOLUTION_PRESETS.length - 1) return null;
  return RESOLUTION_PRESETS[i + 1]!;
}
