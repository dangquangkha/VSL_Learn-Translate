# shared/landmarks

Module TypeScript thuần trích landmark (MediaPipe HandLandmarker + PoseLandmarker)
dùng chung cho recorder-lite (P1-1), chế độ Dịch (P2), Recorder thật (P3) và chế độ
Học (P4). Không import React, không dùng API riêng của Vite, không phụ thuộc bất kỳ
thứ gì của `tools/recorder-lite/`.

Nguồn sự thật: `specs/010-p1-foundation/spec.md` §3 (định dạng `.vslm`) và §4 (P1-1).

## 1. Cài đặt trong project của bạn

### Peer dependency bắt buộc

```json
"dependencies": {
  "@mediapipe/tasks-vision": "1.0.1"
}
```

**Phải ghim đúng version `1.0.1`** — wasm runtime tải từ CDN
(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm`, xem comment
trong `mediapipe.ts`) phải khớp API JS của package cài local. Lệch version dễ gây
lỗi khởi tạo model khó debug.

### Alias + tsconfig

`shared/landmarks` không có `package.json`/`node_modules` riêng — nó được biên dịch
trực tiếp như source của project bạn. Cần:

**Vite** — thêm alias trỏ `@shared` về thư mục `shared/` ở gốc repo (xem
`tools/recorder-lite/vite.config.ts` để lấy nguyên mẫu, dùng `path.resolve` +
`createRequire`/`fileURLToPath`, KHÔNG dùng `new URL()` trực tiếp — dự án này chạy
trên đường dẫn Windows có dấu tiếng Việt và khoảng trắng, `new URL()` bị lỗi encode):

```ts
resolve: { alias: [{ find: "@shared", replacement: resolve(__dirname, "../../shared") }] }
```

**tsconfig.json** — `tsc --noEmit` không đọc alias của Vite, phải khai báo riêng:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["../../shared/*"],
      // Bắt buộc: file trong shared/landmarks/ dùng `import type` từ
      // @mediapipe/tasks-vision. Type-only nên KHÔNG vào bundle, nhưng tsc vẫn
      // phải resolve được khai báo type — mà package chỉ nằm trong node_modules
      // của app này. Thiếu dòng dưới, tsc báo TS2307 "Cannot find module".
      "@mediapipe/tasks-vision": ["node_modules/@mediapipe/tasks-vision"]
    }
  },
  "include": ["src", "../../shared/landmarks"]
}
```

### Vì sao bạn phải tự truyền module MediaPipe vào

`createLandmarkers()` nhận module `@mediapipe/tasks-vision` qua **tham số** thay vì tự
import. Trông hơi vòng, nhưng có lý do bắt buộc:

`shared/landmarks/` nằm **ngoài** cây thư mục của mọi app, và repo không dùng npm
workspaces — package `@mediapipe/tasks-vision` chỉ có trong `node_modules` của từng
app. Nếu file trong `shared/landmarks/` import giá trị runtime từ package đó thì:

- `vite dev` vẫn chạy (dev server resolve theo cách khác), **nhưng**
- `vite build` **hỏng**: `Rollup failed to resolve import "@mediapipe/tasks-vision"`,
  vì Rollup resolve theo vị trí **file đang import**, tức `shared/landmarks/`.

Đã kiểm chứng thật trên bản clone sạch. Cái bẫy ở đây là dev chạy ngon nên lỗi chỉ lộ
lúc build production — dễ phát hiện muộn.

Nhận module qua tham số thì `shared/landmarks/` không còn runtime import nào (chỉ còn
`import type`, bị xoá hoàn toàn lúc compile), nên **mọi app build được mà không cần
thêm alias, symlink hay workspace**.

Trong app của bạn, dùng **named import** rồi gom lại, đừng dùng `import * as`:

```ts
// ĐÚNG — tree-shaking giữ nguyên, bundle không phình
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
const landmarkers = await createLandmarkers({ FilesetResolver, HandLandmarker, PoseLandmarker });

// TRÁNH — kéo cả FaceLandmarker, ImageSegmenter... vào bundle (+~11 KB)
import * as tasksVision from "@mediapipe/tasks-vision";
```

Lợi ích kèm theo: mỗi app tự chọn cấu hình riêng — recorder-lite ưu tiên GPU, P2 có thể
muốn CPU trong Web Worker.

## 2. Ví dụ dùng

```ts
import { FilesetResolver, HandLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";
import {
  startWebcam,
  createLandmarkers,
  createLandmarkStream,
  type FrameSample,
  type Presence,
} from "@shared/landmarks";

const video = document.querySelector("video")!;

async function main() {
  const [{ width, height }, { handLandmarker, poseLandmarker }] = await Promise.all([
    startWebcam(video),
    createLandmarkers(
      { FilesetResolver, HandLandmarker, PoseLandmarker },
      (msg) => console.log("[landmarks]", msg),
    ),
  ]);

  const stream = createLandmarkStream({
    video,
    handLandmarker,
    poseLandmarker,
    onFrame: (sample: FrameSample, presence: Presence) => {
      // sample.points: Float32Array(300) = 75 diem * 4 gia tri
      // sample.mask: [pose, leftHand, rightHand] — 0 hoac 1
      // sample.timestampSec: giay ke tu resetClock() gan nhat (hoac tu start())
      pushIntoRingBuffer(sample); // vi du: P2 nap ring buffer 2 giay cho ONNX
    },
  });

  stream.start();
  // stream.resetClock();      // dat lai moc t0 (vd luc bat dau ghi that su)
  // stream.getStats();        // { fps, poseSeen, leftHandSeen, rightHandSeen }
  // stream.stop();            // dung capture khi khong con can
}
```

`CaptureLoop` (class cấp thấp hơn) và `assembleFrame`/`detectPresence` vẫn được
export riêng nếu bạn cần tự ghép vòng lặp (vd: `main.ts` của recorder-lite hiện đang
dùng cách này, không qua `createLandmarkStream`).

## 3. Layout 75 điểm landmark

Mỗi `FrameSample.points` là `Float32Array` độ dài cố định `300` (`75 điểm * 4 giá
trị: x, y, z, visibility`), thứ tự:

| Khoảng    | Nhóm          | Số điểm |
| --------- | ------------- | ------- |
| `0..32`   | pose          | 33      |
| `33..53`  | tay trái      | 21      |
| `54..74`  | tay phải      | 21      |

Hằng số tương ứng: `POSE_START = 0`, `LEFT_HAND_START = 33`, `RIGHT_HAND_START = 54`,
`POSE_POINT_COUNT = 33`, `HAND_POINT_COUNT = 21`, `POINTS_PER_FRAME = 75`,
`VALUES_PER_POINT = 4`.

**Quy ước nhóm không thấy**: nếu MediaPipe không phát hiện được pose/tay trái/tay
phải ở một khung hình, toàn bộ toạ độ của nhóm đó ghi `0.0` (không phải `NaN`) và
`FrameSample.mask` tương ứng ghi `0` (vị trí `[pose, leftHand, rightHand]`).
Pose dùng `visibility` do MediaPipe trả về; tay không có `visibility` có ý nghĩa nên
ghi `1.0` nếu phát hiện được, `0.0` nếu không.

## 4. Ghi chú cho P2 (chế độ Dịch, ONNX)

Model ONNX nhận input hình dạng `[1, 60, 75, 4]` (batch=1, 60 khung, 75 điểm, 4 giá
trị) — xem `models/DUMMY.md`. Khi ring buffer chưa đầy 60 khung:

- Ô đệm (khung chưa có dữ liệu thật) phải điền `timestamps = -1.0`.
- **Các khung hợp lệ phải dồn về đầu mảng** — graph tiền xử lý giả định thứ tự này,
  không được để xen kẽ khung thật/khung đệm.

## 5. Ghi file `.vslm` (`vslmWriter.ts`)

`buildVslmFile()` đóng gói `FrameSample[]` thành nhị phân `.vslm` đúng layout spec.md
§3 (`[uint32 headerLen][header JSON][landmarks f32][timestamps f32][mask u8]`,
little-endian). Đã verify chéo với `ai_pipeline/data/landmark_io.py` (ghi 91 khung,
đọc lại khớp `atol=1e-6`) — **không tự viết lại logic này**, dùng nguyên hàm có sẵn.

`VslmWriteInput.recorderVersion` là tham số bắt buộc (không còn hằng số cố định)
— mỗi ứng dụng ghi tự truyền giá trị của mình vào `header.recorder_version`, ví dụ
recorder-lite truyền `"lite-1"` (hằng số `RECORDER_VERSION` vẫn ở
`tools/recorder-lite/src/types.ts`, không chuyển sang đây). Recorder thật của P3
truyền một giá trị khác phù hợp với nó.

```ts
import { buildVslmFile, downloadVslmFile } from "@shared/landmarks";

const file = buildVslmFile({
  participantCode: "P01",
  signCode: "chao",
  labelIndex: 1,   // PHAI khop id trong shared/labels.json (chao = 1, idle = 0)
  frames /* FrameSample[] thu thap tu createLandmarkStream */,
  durationMs: 3000,
  fpsAvg: 24.5,
  videoWidth: 1280,
  videoHeight: 720,
  recordedAt: new Date().toISOString(),
  recorderVersion: "p3-recorder-1", // vi du cho Recorder that cua P3
});
downloadVslmFile(file);
```

## 6. Bọc thành React hook (mẫu tham khảo — repo chưa có React)

Repo hiện chưa có `frontend/` thật (P2-1 chưa xong) nên module này **không** kèm file
React. Khi frontend sẵn sàng, bọc `createLandmarkStream` bằng một hook đơn giản kiểu:

```tsx
function useLandmarks(video: HTMLVideoElement | null, landmarkers: Landmarkers | null) {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [frame, setFrame] = useState<FrameSample | null>(null);

  useEffect(() => {
    if (!video || !landmarkers) return;
    const stream = createLandmarkStream({
      video,
      handLandmarker: landmarkers.handLandmarker,
      poseLandmarker: landmarkers.poseLandmarker,
      onFrame: (sample) => {
        setFrame(sample);
        setStats(stream.getStats());
      },
    });
    stream.start();
    return () => stream.stop();
  }, [video, landmarkers]);

  return { frame, stats };
}
```
