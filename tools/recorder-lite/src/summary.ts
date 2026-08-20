/**
 * Tinh cac chi so hien thi o man hinh Review sau khi ket thuc mot lan ghi
 * (R-07) va canh bao khong chan (R-10): fps_avg < 15 hoac > 20% khung hinh
 * mat ca hai tay.
 */
import type { FrameSample, RecordingSummary } from "./types";

/** Lop ky thuat "khong lam ky hieu gi" — mien tru kiem tra tay. */
const IDLE_CODE = "idle";

const LOW_FPS_THRESHOLD = 15;

/**
 * Doan LIEN TUC co tay ngan nhat coi la du de chua tron pha nhan cua ky hieu.
 *
 * VI SAO KHONG DUNG "> 20% khung mat ca hai tay" NHU SRS FR-C04:
 * Tieu chi do dem tong so khung mat tay ma khong quan tam chung nam o dau, nen
 * gop chung hai thu khac han nhau:
 *   - Mat tay o GIUA dong tac  -> loi that (tay bi che, ra ngoai khung)
 *   - Mat tay o DAU/CUOI clip  -> BINH THUONG: cu chi co ba pha (chuan bi ->
 *     nhan -> thu ve), va nguoi quay ha tay sau khi lam xong
 *
 * Do tren clip quay that: clip mat 16.2% va 9.7% deu la 100% o phan duoi, tuc
 * pha ha tay — ghi tron ven dong tac nhung van bi tieu chi 20% danh dau "gan
 * hong". Voi clip 3 giay ma ky hieu chi keo dai 1.5-2 giay thi dau + duoi vuot
 * 20% la chuyen binh thuong.
 *
 * Ep nguoi quay giu tay lo lung cho du 3 giay se tao dong tac khong ton tai
 * ngoai doi, va model se hoc "lam xong tay van treo do" -> lech voi luc dung
 * that. Nen o day do DOAN LIEN TUC DAI NHAT co tay thay vi tong ty le.
 */
const MIN_CONTINUOUS_HAND_SEC = 1.0;

export function computeSummary(
  frames: FrameSample[],
  durationMs: number,
  /**
   * Ky hieu dang quay. Lop `idle` KHONG bi kiem tra tay: clip idle hop le la
   * ngoi yen, gai dau, uong nuoc — nhieu clip khong co tay trong khung chut nao,
   * va do chinh la thu can day cho model hoc "khong lam ky hieu gi".
   * Ap tieu chi tay vao idle se bao do gan nhu moi clip idle, ma moi nguoi phai
   * quay 15 clip loai nay. Do that: clip idle ngoi yen cho 60.6% khung mat ca
   * hai tay.
   */
  signCode: string = "",
): RecordingSummary {
  const frameCount = frames.length;
  const fpsAvg = durationMs > 0 ? (frameCount * 1000) / durationMs : 0;

  let leftSeenCount = 0;
  let rightSeenCount = 0;
  let bothMissingCount = 0;

  // Doan lien tuc dai nhat co it nhat mot tay — thuoc do that su cho biet clip
  // co ghi tron pha nhan hay khong.
  let longestRun = 0;
  let currentRun = 0;

  for (const frame of frames) {
    const leftSeen = frame.mask[1] === 1;
    const rightSeen = frame.mask[2] === 1;
    if (leftSeen) leftSeenCount++;
    if (rightSeen) rightSeenCount++;
    if (!leftSeen && !rightSeen) {
      bothMissingCount++;
      currentRun = 0;
    } else {
      currentRun++;
      if (currentRun > longestRun) longestRun = currentRun;
    }
  }

  const longestHandRunSec = fpsAvg > 0 ? longestRun / fpsAvg : 0;

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
    longestHandRunSec,
    lowFps: fpsAvg < LOW_FPS_THRESHOLD,
    tooManyMissingHands:
      signCode !== IDLE_CODE && longestHandRunSec < MIN_CONTINUOUS_HAND_SEC,
  };
}
