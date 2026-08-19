import { defineConfig } from "vite";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// recorder-lite song song, doc lap voi frontend/, nhung can doc chung
// shared/labels.json (nguon su that duy nhat cho 51 nhan - xem AGENTS.md).
//
// Tren Windows voi duong dan co khoang trang/Unicode, ca __dirname lan
// import.meta.url co the bi encode sai khi qua Vite alias resolver.
// Giai phap: dung createRequire de lay duong dan tuyet doi an toan.
const _require = createRequire(import.meta.url);
const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

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
      // Tat strict mode de cho phep doc file ngoai root (shared/labels.json)
      strict: false,
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
