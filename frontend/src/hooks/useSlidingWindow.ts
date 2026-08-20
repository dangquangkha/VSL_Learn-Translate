import { useRef, useCallback } from 'react'
import type { LandmarkFrame } from '../types/landmarks'

// EARS[FR-A02] — Sliding window: mỗi 6 frame mới, cắt 32 frame gần nhất gửi infer

const STEP_SIZE   = 6   // cứ mỗi 6 frame thì slide
const WINDOW_SIZE = 32  // cắt 32 frame gần nhất

interface UseSlidingWindowOptions {
  /** Callback được gọi mỗi khi đủ STEP_SIZE frame mới, nhận 32 frames để infer */
  onWindow: (frames: LandmarkFrame[]) => void
}

interface UseSlidingWindowReturn {
  /** Thêm frame mới. Khi đủ STEP_SIZE, gọi onWindow tự động. */
  addFrame: (frame: LandmarkFrame, allFrames: LandmarkFrame[]) => void
  /** Reset counter */
  reset: () => void
}

export function useSlidingWindow({ onWindow }: UseSlidingWindowOptions): UseSlidingWindowReturn {
  const countRef = useRef(0)

  const addFrame = useCallback(
    (frame: LandmarkFrame, allFrames: LandmarkFrame[]) => {
      // Chỉ slide khi thấy tay (tránh gửi toàn bộ idle frames)
      if (!frame.handSeen) {
        countRef.current = 0
        return
      }

      countRef.current += 1
      if (countRef.current >= STEP_SIZE) {
        countRef.current = 0
        // Lấy 32 frame gần nhất từ ring buffer
        const window = allFrames.slice(-WINDOW_SIZE)
        if (window.length >= WINDOW_SIZE) {
          onWindow(window)
        }
      }
    },
    [onWindow],
  )

  const reset = useCallback(() => {
    countRef.current = 0
  }, [])

  return { addFrame, reset }
}
