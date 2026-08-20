/**
 * Tinh cac chi so hien thi o man hinh Review sau khi ket thuc mot lan ghi
 * (R-07) va canh bao khong chan (R-10): fps_avg < 15 hoac doan lien tuc dai
 * nhat co tay < 1 giay.
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

/**
 * Lo hong ngan hon nguong nay duoc coi la NHIEU BAM DAU, khong phai mat tay,
 * va duoc lap lai truoc khi do doan lien tuc.
 *
 * VI SAO CAN: MediaPipe chop mat dau vai khung khi tay vung nhanh. Do tren
 * clip that P01__chao__20260820T122413309Z.vslm: tay mat dung 2 khung (~90ms)
 * o giua dong tac, va toc do co tay tai dung hai khung do la 1.56 / 1.50
 * (chieu rong khung hinh / giay) so voi trung vi 0.27 khi bam duoc — tuc gap
 * ~5.8 lan. Ro rang la mot nhip vung nhanh, khong phai tay roi khoi khung.
 *
 * Neu khong lap, cai chop 2 khung do CHE DOI mot doan 1.77 giay lien mach
 * thanh 0.55s + 0.95s. Lay doan dai nhat = 0.95s < 1.0s -> clip TOT bi gan co
 * "quay lai".
 *
 * Chon 150ms vi hai loai sai khong can xung nhau:
 *   - Lap hut  -> canh bao sai -> nguoi quay tu sua dong tac cho vua long
 *     canh bao -> hong phan phoi ca 600 clip (xem frontend/AGENTS.md §3)
 *   - Lap thua -> nhan mot clip co lo nho, ma model van doc duoc mask = 0 o
 *     dung nhung khung do nen biet la rong
 * Hai cua ve dau lon hon han. 150ms van thap hon nhieu so voi mot lan tay
 * that su ra khoi khung roi quay lai (thuong >= 300ms).
 *
 * Tinh theo THOI GIAN chu khong theo SO KHUNG vi may trong nhom chay 20-30fps:
 * 2 khung o 22fps la 90ms nhung o 30fps chi la 67ms.
 */
const MAX_BRIDGED_GAP_SEC = 0.15;

/**
 * Danh dau khung nao co it nhat mot tay, sau khi lap cac lo hong ngan nam
 * GIUA hai doan co tay. Lo hong o dau/cuoi khong duoc lap — chung la pha
 * chuan bi / ha tay, va viec loai chung ra chinh la muc dich cua thuoc do
 * "doan lien tuc dai nhat".
 */
function bridgeShortGaps(hasHand: boolean[], frameIntervalSec: number): boolean[] {
  const bridged = [...hasHand];
  let i = 0;

  while (i < bridged.length) {
    if (bridged[i]) {
      i++;
      continue;
    }

    // Tim het lo hong [i, j)
    let j = i;
    while (j < bridged.length && !bridged[j]) j++;

    const oCuoi = j >= bridged.length;
    const oDau = i === 0;
    const doDaiSec = (j - i) * frameIntervalSec;

    if (!oDau && !oCuoi && doDaiSec <= MAX_BRIDGED_GAP_SEC) {
      bridged.fill(true, i, j);
    }

    i = j;
  }

  return bridged;
}

/** Do dai doan `true` lien tuc dai nhat, tinh bang so phan tu. */
function longestTrueRun(flags: boolean[]): number {
  let best = 0;
  let current = 0;

  for (const flag of flags) {
    current = flag ? current + 1 : 0;
    if (current > best) best = current;
  }

  return best;
}

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

  const hasHand: boolean[] = [];

  for (const frame of frames) {
    const leftSeen = frame.mask[1] === 1;
    const rightSeen = frame.mask[2] === 1;
    if (leftSeen) leftSeenCount++;
    if (rightSeen) rightSeenCount++;
    if (!leftSeen && !rightSeen) bothMissingCount++;
    hasHand.push(leftSeen || rightSeen);
  }

  // Doan lien tuc dai nhat co tay — thuoc do that su cho biet clip co ghi tron
  // pha nhan hay khong. Lap cac lo hong ngan truoc khi do, xem
  // MAX_BRIDGED_GAP_SEC.
  const frameIntervalSec = fpsAvg > 0 ? 1 / fpsAvg : 0;
  const longestRun =
    frameIntervalSec > 0 ? longestTrueRun(bridgeShortGaps(hasHand, frameIntervalSec)) : 0;
  const longestHandRunSec = longestRun * frameIntervalSec;

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
