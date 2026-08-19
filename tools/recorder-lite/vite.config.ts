import { defineConfig } from "vite";
import path from "node:path";

// recorder-lite song song, doc lap voi frontend/, nhung can doc chung
// shared/labels.json (nguon su that duy nhat cho 51 nhan - xem AGENTS.md).
// repoRoot = hai cap tren thu muc nay (tools/recorder-lite -> tools -> repo root).
// Dung path.resolve(__dirname) thay vi new URL() de tranh loi Windows voi
// duong dan co khoang trang / ky tu Unicode (loi vite:import-analysis).
const repoRoot = path.resolve(__dirname, "../..");
const sharedDir = path.resolve(__dirname, "../../shared");

export default defineConfig({
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  server: {
    fs: {
      // cho phep dev server doc file ngoai root cua project nay (shared/labels.json)
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
