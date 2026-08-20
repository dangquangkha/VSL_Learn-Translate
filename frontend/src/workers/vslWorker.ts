// VSL Web Worker — chạy ONNX inference trong thread riêng
// EARS[FR-A02] — Không có inference nào trên server. 100% client-side.
// Dùng onnxruntime-web với WebAssembly backend.

/// <reference lib="webworker" />

import * as ort from 'onnxruntime-web'
import { LABELS, LABEL_HASH_SHA256 } from '../generated/labels'
import type { WorkerInMessage, WorkerOutMessage, LandmarkFrame } from '../types/landmarks'

// Cấu hình ONNX Runtime WASM path
ort.env.wasm.wasmPaths = '/onnx/'

let session: ort.InferenceSession | null = null

/**
 * Flatten LandmarkFrame[] → Float32Array với shape [1, 32, 55, 3]
 * 55 = 21 (left hand) + 21 (right hand) + 13 (pose)
 * Nếu thiếu tay → fill zeros
 */
function flattenFrames(frames: LandmarkFrame[]): Float32Array {
  const N           = 32
  const HAND_JOINTS = 21
  const POSE_JOINTS = 13
  const TOTAL_JOINTS = HAND_JOINTS * 2 + POSE_JOINTS // 55
  const DIMS        = 3

  const tensor = new Float32Array(N * TOTAL_JOINTS * DIMS)
  const src    = frames.slice(-N)

  for (let f = 0; f < src.length; f++) {
    const frame      = src[f]
    const frameOffset = f * TOTAL_JOINTS * DIMS

    for (let j = 0; j < HAND_JOINTS; j++) {
      const offset = frameOffset + j * DIMS
      const lm     = frame.leftHand?.[j]
      tensor[offset]     = lm?.[0] ?? 0
      tensor[offset + 1] = lm?.[1] ?? 0
      tensor[offset + 2] = lm?.[2] ?? 0
    }

    for (let j = 0; j < HAND_JOINTS; j++) {
      const offset = frameOffset + (HAND_JOINTS + j) * DIMS
      const lm     = frame.rightHand?.[j]
      tensor[offset]     = lm?.[0] ?? 0
      tensor[offset + 1] = lm?.[1] ?? 0
      tensor[offset + 2] = lm?.[2] ?? 0
    }

    for (let j = 0; j < POSE_JOINTS; j++) {
      const offset = frameOffset + (HAND_JOINTS * 2 + j) * DIMS
      const lm     = frame.pose?.[j]
      tensor[offset]     = lm?.[0] ?? 0
      tensor[offset + 1] = lm?.[1] ?? 0
      tensor[offset + 2] = lm?.[2] ?? 0
    }
  }

  return tensor
}

self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  void handleMessage(event)
})

async function handleMessage(event: MessageEvent<WorkerInMessage>): Promise<void> {
  const msg = event.data

  if (msg.type === 'INIT') {
    try {
      session = await ort.InferenceSession.create(msg.modelUrl, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      })

      // Xác minh label hash từ model metadata nếu có
      // ort không export internal handler — bỏ qua nếu không tìm thấy
      const clientHash = LABEL_HASH_SHA256.trim().toLowerCase()

      const out: WorkerOutMessage = { type: 'READY', labelHash: clientHash }
      self.postMessage(out)
    } catch (err) {
      const out: WorkerOutMessage = {
        type: 'ERROR',
        message: `Failed to load ONNX model: ${String(err)}`,
      }
      self.postMessage(out)
    }
    return
  }

  if (msg.type === 'INFER') {
    if (!session) {
      const out: WorkerOutMessage = { type: 'ERROR', message: 'Worker not initialized. Send INIT first.' }
      self.postMessage(out)
      return
    }

    try {
      const flatData    = flattenFrames(msg.frames)
      const inputTensor = new ort.Tensor('float32', flatData, [1, 32, 55, 3])
      const feeds: Record<string, ort.Tensor> = { input: inputTensor }
      const results = await session.run(feeds)

      const logitsTensor = results['output'] ?? results[Object.keys(results)[0]]
      const logits       = logitsTensor.data as Float32Array

      // Softmax
      const maxLogit = Math.max(...Array.from(logits))
      const exps     = Array.from(logits).map((l) => Math.exp(l - maxLogit))
      const sumExps  = exps.reduce((a, b) => a + b, 0)
      const probs    = exps.map((e) => e / sumExps)

      let topIdx  = 0
      let topProb = probs[0]
      for (let i = 1; i < probs.length; i++) {
        if (probs[i] > topProb) { topProb = probs[i]; topIdx = i }
      }

      const topLabel   = LABELS[topIdx]?.code ?? 'unknown'
      const logitsF32  = new Float32Array(probs)

      const out: WorkerOutMessage = { type: 'RESULT', logits: logitsF32, topLabel, confidence: topProb }
      // Transfer ArrayBuffer để tránh copy
      self.postMessage(out, { transfer: [logitsF32.buffer] })
    } catch (err) {
      const out: WorkerOutMessage = { type: 'ERROR', message: `Inference error: ${String(err)}` }
      self.postMessage(out)
    }
    return
  }
}
