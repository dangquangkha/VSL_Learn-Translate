// Types for landmark data shared between frontend and workers
// Interface đặt sẵn — khi P1-4 giao module useLandmarks sẽ dùng thật
// EARS[FR-A02] — ring buffer thu thập landmark thô từ MediaPipe

/** Một bàn tay với 21 landmarks, mỗi landmark là [x, y, z] */
export type Hand = [number, number, number][] // length = 21

/** Điểm pose: [x, y, z, visibility] cho các keypoint vai, khuỷu, cổ tay */
export type PosePoint = [number, number, number, number]

/**
 * Một frame landmark thô từ MediaPipe.
 * Shape tương ứng với tensor ONNX input [1, 60, 55, 3]:
 *   - 60 frames (ring buffer)
 *   - 55 = 21 (left hand) + 21 (right hand) + 13 (pose upper body)
 *   - 3 = x, y, z
 */
export interface LandmarkFrame {
  timestamp: number      // performance.now()
  leftHand: Hand | null   // null nếu không thấy tay trái
  rightHand: Hand | null  // null nếu không thấy tay phải
  /** 13 pose keypoints thân trên: shoulders, elbows, wrists, hips (x4), nose */
  pose: PosePoint[]       // length = 13, null-filled nếu không thấy người
  handSeen: boolean       // true nếu có ít nhất 1 tay
}

/** Message protocol Worker ↔ Main thread */
export type WorkerInMessage =
  | { type: 'INIT'; modelUrl: string }
  | { type: 'INFER'; frames: LandmarkFrame[] }  // 32 frames đã được sliding window cắt ra
  | { type: 'RESET' }

export type WorkerOutMessage =
  | { type: 'READY'; labelHash: string }
  | { type: 'RESULT'; logits: Float32Array; topLabel: string; confidence: number }
  | { type: 'ERROR'; message: string }
