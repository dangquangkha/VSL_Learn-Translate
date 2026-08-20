/**
 * Test cho computeSummary — tieu chi danh gia clip.
 *
 * Ca quan trong nhat la `clip chao that`: mot cai chop mat dau 2 khung o GIUA
 * dong tac tung lam clip TOT bi gan co "quay lai". Xem chu thich trong
 * summary.ts ve viec vi sao phai lap lo hong ngan.
 */
import { describe, expect, it } from "vitest";

import { computeSummary } from "./summary";
import type { FrameMask, FrameSample } from "./types";

/**
 * Dung danh sach khung tu mot chuoi ky tu cho de doc:
 *   "." = mat ca hai tay · "L" = chi tay trai · "R" = chi tay phai · "B" = ca hai
 * Pose luon = 1 (khop clip that: pose bam 100% khung).
 */
function framesFromPattern(pattern: string, durationMs: number): FrameSample[] {
  const stepSec = durationMs / 1000 / pattern.length;
  return Array.from(pattern, (ch, i) => {
    const left = ch === "L" || ch === "B" ? 1 : 0;
    const right = ch === "R" || ch === "B" ? 1 : 0;
    const mask: FrameMask = [1, left, right];
    return {
      points: new Float32Array(300),
      mask,
      timestampSec: i * stepSec,
    };
  });
}

/** Lap lai `ch` dung `n` lan. */
const rep = (ch: string, n: number): string => ch.repeat(n);

describe("computeSummary — do doan lien tuc co tay", () => {
  it("clip 'chao' that (P01, 2026-08-20): chop mat dau 2 khung giua dong tac -> VAN DAT", () => {
    // Timeline do duoc tu P01__chao__20260820T122413309Z.vslm:
    //   f0..f21  mat tay  (pha chuan bi, 22 khung)
    //   f22..f33 tay phai (12 khung)
    //   f34..f35 MAT      (2 khung ~90ms — tay vung nhanh gap ~5.8 lan trung vi)
    //   f36..f56 tay phai (21 khung)
    //   f57..f67 mat tay  (pha ha tay, 11 khung)
    const pattern = rep(".", 22) + rep("R", 12) + rep(".", 2) + rep("R", 21) + rep(".", 11);
    expect(pattern).toHaveLength(68);

    const summary = computeSummary(framesFromPattern(pattern, 3072), 3072, "chao");

    expect(summary.frameCount).toBe(68);
    expect(summary.fpsAvg).toBeCloseTo(22.1, 1);
    // Lo hong 2 khung duoc lap -> doan lien tuc that su la f22..f56 = 35 khung
    expect(summary.longestHandRunSec).toBeCloseTo(35 / 22.135, 2);
    expect(summary.tooManyMissingHands).toBe(false);
  });

  it("lo hong THAT su (10 khung ~450ms) giua dong tac -> KHONG lap, phai bao", () => {
    // 10 + 20 + 10 + 18 + 10 = 68 khung
    const pattern = rep(".", 10) + rep("R", 20) + rep(".", 10) + rep("R", 18) + rep(".", 10);
    expect(pattern).toHaveLength(68);

    const summary = computeSummary(framesFromPattern(pattern, 3072), 3072, "chao");

    // Doan dai nhat chi con 20 khung = 0.90s < 1s
    expect(summary.longestHandRunSec).toBeCloseTo(20 / 22.135, 2);
    expect(summary.tooManyMissingHands).toBe(true);
  });

  it("nhieu chop ngan lien tiep deu duoc lap", () => {
    // 10 + 12 + 2 + 12 + 2 + 12 + 2 + 12 + 4 = 68
    const pattern =
      rep(".", 10) +
      rep("R", 12) + rep(".", 2) +
      rep("R", 12) + rep(".", 2) +
      rep("R", 12) + rep(".", 2) +
      rep("R", 12) +
      rep(".", 4);
    expect(pattern).toHaveLength(68);

    const summary = computeSummary(framesFromPattern(pattern, 3072), 3072, "chao");

    // f10..f63 = 4 doan x 12 khung + 3 lo hong x 2 khung = 54 khung
    expect(summary.longestHandRunSec).toBeCloseTo(54 / 22.135, 2);
    expect(summary.tooManyMissingHands).toBe(false);
  });

  it("bien nguong 150ms: 3 khung (~136ms) duoc lap, 4 khung (~181ms) thi khong", () => {
    // fps ~22.135 -> 1 khung ~45.2ms.  3 khung = 135.5ms <= 150.  4 khung = 180.7ms > 150.
    const ba = rep(".", 5) + rep("R", 20) + rep(".", 3) + rep("R", 20) + rep(".", 20);
    const bon = rep(".", 5) + rep("R", 20) + rep(".", 4) + rep("R", 19) + rep(".", 20);
    expect(ba).toHaveLength(68);
    expect(bon).toHaveLength(68);

    // 3 khung -> lap -> 20 + 3 + 20 = 43 khung
    expect(computeSummary(framesFromPattern(ba, 3072), 3072, "chao").longestHandRunSec)
      .toBeCloseTo(43 / 22.135, 2);

    // 4 khung -> khong lap -> doan dai nhat chi con 20 khung
    expect(computeSummary(framesFromPattern(bon, 3072), 3072, "chao").longestHandRunSec)
      .toBeCloseTo(20 / 22.135, 2);
  });

  it("mat tay o dau va cuoi, giua lien mach -> DAT (hanh vi cu khong doi)", () => {
    const pattern = rep(".", 15) + rep("R", 38) + rep(".", 15);
    expect(pattern).toHaveLength(68);

    const summary = computeSummary(framesFromPattern(pattern, 3072), 3072, "chao");

    expect(summary.longestHandRunSec).toBeCloseTo(38 / 22.135, 2);
    expect(summary.tooManyMissingHands).toBe(false);
  });

  it("lop idle duoc mien tru du mat tay gan het clip", () => {
    // Clip idle that do duoc: 60.6% khung mat ca hai tay.
    const pattern = rep(".", 40) + rep("R", 6) + rep(".", 20);
    expect(pattern).toHaveLength(66);

    const summary = computeSummary(framesFromPattern(pattern, 3080), 3080, "idle");

    expect(summary.bothHandsMissingRatio).toBeCloseTo(60 / 66, 2);
    expect(summary.tooManyMissingHands).toBe(false);
  });

  it("khong thay tay khung nao (khong phai idle) -> bao", () => {
    const summary = computeSummary(framesFromPattern(rep(".", 68), 3072), 3072, "chao");

    expect(summary.longestHandRunSec).toBe(0);
    expect(summary.tooManyMissingHands).toBe(true);
  });

  it("mot khung duy nhat co tay khong duoc lap thanh doan dai", () => {
    // Hai lo hong 2 khung om lay dung 1 khung co tay: 1 + 2 + 1 + 2 + 1 = 5 khung
    // van la qua ngan, khong duoc bien thanh "dat".
    const pattern = rep(".", 30) + "R" + ".." + "R" + ".." + "R" + rep(".", 31);
    expect(pattern).toHaveLength(68);

    const summary = computeSummary(framesFromPattern(pattern, 3072), 3072, "chao");

    expect(summary.longestHandRunSec).toBeCloseTo(7 / 22.135, 2);
    expect(summary.tooManyMissingHands).toBe(true);
  });
});

describe("computeSummary — cac chi so con lai", () => {
  it("fps thap van duoc bao rieng", () => {
    const summary = computeSummary(framesFromPattern(rep("R", 40), 3300), 3300, "chao");

    expect(summary.fpsAvg).toBeCloseTo(12.1, 1);
    expect(summary.lowFps).toBe(true);
  });

  it("ty le tay trai / phai / mat ca hai tinh dung", () => {
    const pattern = rep("L", 10) + rep("R", 20) + rep("B", 30) + rep(".", 40);
    expect(pattern).toHaveLength(100);

    const summary = computeSummary(framesFromPattern(pattern, 4000), 4000, "chao");

    expect(summary.leftHandRatio).toBeCloseTo(0.4, 5); // 10 L + 30 B
    expect(summary.rightHandRatio).toBeCloseTo(0.5, 5); // 20 R + 30 B
    expect(summary.bothHandsMissingRatio).toBeCloseTo(0.4, 5);
  });

  it("danh sach khung rong khong lam vo ham", () => {
    const summary = computeSummary([], 0, "chao");

    expect(summary.frameCount).toBe(0);
    expect(summary.fpsAvg).toBe(0);
    expect(summary.longestHandRunSec).toBe(0);
  });
});

/**
 * Moc hoi quy lay tu DU LIEU QUAY THAT (P01, 2026-08-20). Timeline mask duoi
 * day trich thang tu file .vslm bang ai_pipeline/data/landmark_io.py, khong
 * phai so bia. Ca 6 clip deu ghi tron dong tac -> khong clip nao duoc bi bao.
 */
describe("computeSummary — clip quay that (moc hoi quy)", () => {
  const CLIP_THAT: ReadonlyArray<{
    ten: string;
    signCode: string;
    pattern: string;
    durationMs: number;
  }> = [
    {
      ten: "xin_chao 041110025 — gan nhu khong mat tay",
      signCode: "xin_chao",
      pattern: "...RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      durationMs: 3018,
    },
    {
      ten: "xin_chao 041419384 — mat 16.2% nhung toan bo o duoi",
      signCode: "xin_chao",
      pattern: "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR............",
      durationMs: 3013,
    },
    {
      ten: "xin_chao 041429046 — lo 6 khung sat duoi, khong duoc lap nhung van dat",
      signCode: "xin_chao",
      pattern: "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR......RR.RRRBBB",
      durationMs: 3060,
    },
    {
      ten: "idle 114808502 — thay tay ca clip",
      signCode: "idle",
      pattern: "LLLLLLLRLLLLLLLBBLRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
      durationMs: 3014,
    },
    {
      ten: "idle 115051286 — 60.6% khung mat ca hai tay, van hop le",
      signCode: "idle",
      pattern: "............LBBBBBBBBBBBBBBBBBBBBBBBBL............................",
      durationMs: 3086,
    },
    {
      ten: "chao 122413309 — chop 2 khung giua dong tac (ca gay ra ban sua nay)",
      signCode: "chao",
      pattern: "......................RRRRRRRRRRRR..RRRRRRRRRRRRRRRRRRRRR...........",
      durationMs: 3072,
    },
  ];

  for (const clip of CLIP_THAT) {
    it(`khong bao nham: ${clip.ten}`, () => {
      const frames = framesFromPattern(clip.pattern, clip.durationMs);
      const summary = computeSummary(frames, clip.durationMs, clip.signCode);

      expect(summary.tooManyMissingHands).toBe(false);
    });
  }
});
