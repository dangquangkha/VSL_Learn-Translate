/**
 * Khoi tao HandLandmarker + PoseLandmarker tu @mediapipe/tasks-vision.
 * Model .task va wasm tai tu CDN (chap nhan duoc vi day la cong cu noi bo -
 * xem plan.md muc "Quyet dinh trien khai").
 *
 * VI SAO NHAN MODULE QUA THAM SO thay vi import thang:
 * `shared/landmarks/` nam NGOAI cay thu muc cua tung app (tools/recorder-lite,
 * frontend). Package @mediapipe/tasks-vision chi duoc cai trong node_modules
 * cua tung app, khong co o repo root va repo khong dung npm workspaces.
 * Neu file nay import gia tri runtime tu "@mediapipe/tasks-vision" thi:
 *   - `vite dev` van chay (dev server resolve theo cach khac), NHUNG
 *   - `vite build` HONG: "Rollup failed to resolve import @mediapipe/tasks-vision"
 *     vi Rollup resolve theo vi tri FILE import, tuc shared/landmarks/.
 * Da kiem chung that: build hong tren ban clone sach.
 *
 * Nhan module qua tham so thi shared/landmarks khong con runtime import nao ->
 * moi app build duoc ma KHONG can them alias, symlink hay npm workspace.
 * Chi con `import type` (bi xoa hoan toan luc compile, Rollup khong thay).
 *
 * Loi ich them: moi app tu chon cau hinh rieng - recorder-lite uu tien GPU,
 * P2 co the muon CPU trong Web Worker.
 */
import type {
  FilesetResolver as FilesetResolverClass,
  HandLandmarker as HandLandmarkerClass,
  PoseLandmarker as PoseLandmarkerClass,
} from "@mediapipe/tasks-vision";

/**
 * Phan cua module @mediapipe/tasks-vision ma ham nay can. Ben goi truyen vao:
 *
 *   import * as tasksVision from "@mediapipe/tasks-vision";
 *   const landmarkers = await createLandmarkers(tasksVision);
 */
export interface TasksVisionModule {
  FilesetResolver: typeof FilesetResolverClass;
  HandLandmarker: typeof HandLandmarkerClass;
  PoseLandmarker: typeof PoseLandmarkerClass;
}

type VisionFileset = Awaited<ReturnType<typeof FilesetResolverClass.forVisionTasks>>;

// Ghim dung version voi package.json de dam bao wasm khop API JS.
const TASKS_VISION_VERSION = "1.0.1";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;

const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
// Dung ban "lite" cho pose de giu do tre thap, chay song song voi hand landmarker
// tren cung mot khung hinh moi vong lap requestAnimationFrame.
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/**
 * Nguong tin cay cua HandLandmarker. Mac dinh cua MediaPipe la 0.5 cho ca ba.
 *
 * Ha xuong 0.3 vi do do thuc te tren clip quay that: may chay ~24fps nen moi
 * khung cach nhau ~42ms, tay quet nhanh tao vet mo (motion blur) va nguong 0.5
 * loai luon nhung khung do. Do duoc: khung bi mat dau co toc do co tay nhanh
 * gap 6.7-11.1 lan trung binh, tap trung o luc dua tay vao va rut tay ra.
 *
 * Khong ha thap hon 0.3: landmark tren khung qua mo se lech nhieu, ma toa do
 * SAI kem mask=1 con hai hon la mat dau kem mask=0 - model khong the biet du
 * lieu do khong dang tin.
 */
const HAND_CONFIDENCE = {
  minHandDetectionConfidence: 0.3,
  minHandPresenceConfidence: 0.3,
  minTrackingConfidence: 0.3,
} as const;

export interface Landmarkers {
  handLandmarker: HandLandmarkerClass;
  poseLandmarker: PoseLandmarkerClass;
}

/**
 * Tao HandLandmarker/PoseLandmarker o che do VIDEO. Thu GPU truoc, neu khoi
 * tao GPU that bai (thuong gap tren mot so trinh duyet/driver) thi tu dong
 * lui ve CPU de recorder van chay duoc.
 */
export async function createLandmarkers(
  tasks: TasksVisionModule,
  onProgress?: (message: string) => void,
): Promise<Landmarkers> {
  onProgress?.("Đang tải MediaPipe Wasm runtime...");
  const vision = await tasks.FilesetResolver.forVisionTasks(WASM_BASE_URL);

  onProgress?.("Đang tải model Hand Landmarker...");
  const handLandmarker = await createHandLandmarker(tasks, vision);

  onProgress?.("Đang tải model Pose Landmarker...");
  const poseLandmarker = await createPoseLandmarker(tasks, vision);

  onProgress?.("Đã sẵn sàng.");
  return { handLandmarker, poseLandmarker };
}

async function createHandLandmarker(
  tasks: TasksVisionModule,
  vision: VisionFileset,
): Promise<HandLandmarkerClass> {
  try {
    return await tasks.HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      ...HAND_CONFIDENCE,
    });
  } catch (err) {
    console.warn(
      "[landmarks] Khong khoi tao duoc HandLandmarker voi GPU, thu lai bang CPU.",
      err,
    );
    return tasks.HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
      ...HAND_CONFIDENCE,
    });
  }
}

async function createPoseLandmarker(
  tasks: TasksVisionModule,
  vision: VisionFileset,
): Promise<PoseLandmarkerClass> {
  try {
    return await tasks.PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: false,
    });
  } catch (err) {
    console.warn(
      "[landmarks] Khong khoi tao duoc PoseLandmarker voi GPU, thu lai bang CPU.",
      err,
    );
    return tasks.PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: false,
    });
  }
}
