/**
 * Test cho preset do phan giai + kiem tra ti le khung hinh.
 *
 * Ca quan trong nhat la `isSixteenNine` tu choi 640x480. Do la che do webcam
 * hay chay 30fps nhat — tuc dung cai ma nguoi dang thieu fps de voi tay lay
 * nhat — nhung no la 4:3 va se lam hong du lieu mot cach am tham.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRESET_ID,
  MIN_FPS_FOR_60_FRAMES,
  RESOLUTION_PRESETS,
  describeAspect,
  getPreset,
  isSixteenNine,
  suggestLowerPreset,
} from "@shared/landmarks";

describe("RESOLUTION_PRESETS", () => {
  it("co dung 3 muc", () => {
    expect(RESOLUTION_PRESETS).toHaveLength(3);
  });

  it("MOI muc deu la 16:9 — rang buoc quan trong nhat cua spec 012", () => {
    for (const p of RESOLUTION_PRESETS) {
      expect(isSixteenNine(p.width, p.height), `${p.id} = ${p.width}x${p.height}`).toBe(true);
    }
  });

  it("khong muc nao la 640x480 (4:3)", () => {
    for (const p of RESOLUTION_PRESETS) {
      expect(`${p.width}x${p.height}`).not.toBe("640x480");
    }
  });

  it("xep giam dan theo chieu rong — suggestLowerPreset dua vao thu tu nay", () => {
    const widths = RESOLUTION_PRESETS.map((p) => p.width);
    expect(widths).toEqual([...widths].sort((a, b) => b - a));
  });

  it("id khong trung nhau", () => {
    const ids = RESOLUTION_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nguong fps la 20 = 60 khung / 3 giay", () => {
    expect(MIN_FPS_FOR_60_FRAMES).toBe(60 / 3);
  });
});

describe("isSixteenNine", () => {
  it.each([
    [1280, 720],
    [960, 540],
    [640, 360],
    [1920, 1080],
    [854, 480], // 16:9 lam tron thuc te cua nhieu webcam
  ])("nhan %ix%i", (w, h) => {
    expect(isSixteenNine(w, h)).toBe(true);
  });

  it.each([
    [640, 480], // 4:3 — cai bay chinh
    [800, 600], // 4:3
    [1024, 768], // 4:3
    [1280, 800], // 16:10
    [1440, 960], // 3:2
    [720, 720], // 1:1
  ])("TU CHOI %ix%i", (w, h) => {
    expect(isSixteenNine(w, h)).toBe(false);
  });

  it.each([
    [0, 0],
    [1280, 0],
    [0, 720],
    [-1280, -720],
  ])("tu choi kich thuoc khong hop le %ix%i", (w, h) => {
    expect(isSixteenNine(w, h)).toBe(false);
  });
});

describe("describeAspect", () => {
  it.each([
    [1280, 720, "16:9"],
    [640, 480, "4:3"],
    [1280, 800, "16:10"],
    [1440, 960, "3:2"],
    [720, 720, "1:1"],
  ])("%ix%i -> %s", (w, h, ten) => {
    expect(describeAspect(w, h)).toBe(ten);
  });

  it("ti le la thi tra dang so", () => {
    expect(describeAspect(1000, 700)).toBe("1.43:1");
  });

  it("kich thuoc khong hop le tra '?'", () => {
    expect(describeAspect(0, 0)).toBe("?");
  });
});

describe("getPreset", () => {
  it("lay dung preset theo id", () => {
    expect(getPreset("360p").width).toBe(640);
  });

  it.each([["khong-ton-tai"], [""], [null], [undefined]])(
    "id la (%s) thi lui ve mac dinh thay vi nem loi",
    (id) => {
      expect(getPreset(id as string).id).toBe(DEFAULT_PRESET_ID);
    },
  );

  it("mac dinh la muc cao nhat", () => {
    expect(getPreset(DEFAULT_PRESET_ID).width).toBe(1280);
  });
});

describe("suggestLowerPreset", () => {
  it("720p -> 540p", () => {
    expect(suggestLowerPreset(getPreset("720p"))?.id).toBe("540p");
  });

  it("540p -> 360p", () => {
    expect(suggestLowerPreset(getPreset("540p"))?.id).toBe("360p");
  });

  it("360p da thap nhat -> null", () => {
    expect(suggestLowerPreset(getPreset("360p"))).toBeNull();
  });
});
