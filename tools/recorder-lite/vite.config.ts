import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// recorder-lite song song, doc lap voi frontend/, nhung can doc chung
// shared/labels.json (nguon su that duy nhat cho 51 nhan - xem AGENTS.md).
//
// Alias phai khai bao o DANG MANG ({ find, replacement }). Dang object
// { "@shared": ... } khong resolve duoc "@shared/labels.json" trong setup nay
// va gay loi vite:import-analysis "Failed to resolve import".
// Duong dan tuyet doi tinh tu vi tri file config nay: tools/recorder-lite -> repo root.
const _dirname = dirname(fileURLToPath(import.meta.url));

const sharedDir = resolve(_dirname, "../../shared");
const repoRoot = resolve(_dirname, "../../");

export default defineConfig({
  resolve: {
    alias: [
      // Dung mang de dam bao thu tu va tranh xung dot voi alias cua Vite
      { find: "@shared", replacement: sharedDir },
    ],
  },
  server: {
    fs: {
      // Cho phep dev server doc file ngoai root cua project nay (shared/labels.json).
      // KHONG dat strict: false - lam vay se tat han co che gioi han phuc vu file
      // cua Vite va khien `allow` ben duoi thanh vo nghia. `allow` mot minh la du.
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
