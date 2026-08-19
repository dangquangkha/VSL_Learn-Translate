import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// recorder-lite song song, doc lap voi frontend/, nhung can doc chung
// shared/labels.json (nguon su that duy nhat cho 51 nhan - xem AGENTS.md).
// repoRoot = hai cap tren thu muc nay (tools/recorder-lite -> tools -> repo root).
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const sharedDir = fileURLToPath(new URL("../../shared", import.meta.url));

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
