/**
 * Khoi tao HandLandmarker + PoseLandmarker tu @mediapipe/tasks-vision.
 * Model .task va wasm tai tu CDN (chap nhan duoc vi day la cong cu noi bo -
 * xem plan.md muc "Quyet dinh trien khai").
 */
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision";

// Ghim dung version voi package.json de dam bao wasm khop API JS.
const TASKS_VISION_VERSION = "1.0.1";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;

const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
// Dung ban "lite" cho pose de giu do tre thap, chay song song voi hand landmarker
// tren cung mot khung hinh moi vong lap requestAnimationFrame.
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export interface Landmarkers {
  handLandmarker: HandLandmarker;
  poseLandmarker: PoseLandmarker;
}

/**
 * Tao HandLandmarker/PoseLandmarker o che do VIDEO. Thu GPU truoc, neu khoi
 * tao GPU that bai (thuong gap tren mot so trinh duyet/driver) thi tu dong
 * lui ve CPU de recorder van chay duoc.
 */
export async function createLandmarkers(
  onProgress?: (message: string) => void,
): Promise<Landmarkers> {
  onProgress?.("Đang tải MediaPipe Wasm runtime...");
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  onProgress?.("Đang tải model Hand Landmarker...");
  const handLandmarker = await createHandLandmarker(vision);

  onProgress?.("Đang tải model Pose Landmarker...");
  const poseLandmarker = await createPoseLandmarker(vision);

  onProgress?.("Đã sẵn sàng.");
  return { handLandmarker, poseLandmarker };
}

async function createHandLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
): Promise<HandLandmarker> {
  try {
    return await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
  } catch (err) {
    console.warn(
      "[recorder-lite] Khong khoi tao duoc HandLandmarker voi GPU, thu lai bang CPU.",
      err,
    );
    return HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numHands: 2,
    });
  }
}

async function createPoseLandmarker(
  vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
): Promise<PoseLandmarker> {
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: false,
    });
  } catch (err) {
    console.warn(
      "[recorder-lite] Khong khoi tao duoc PoseLandmarker voi GPU, thu lai bang CPU.",
      err,
    );
    return PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      outputSegmentationMasks: false,
    });
  }
}
