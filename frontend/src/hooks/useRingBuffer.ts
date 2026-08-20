import { useRef, useCallback } from 'react'
import type { LandmarkFrame } from '../types/landmarks'

// EARS[FR-A02] — Ring buffer 2 giây giữ landmark frames gần nhất

const RING_DURATION_MS = 2000

interface UseRingBufferReturn {
  /** Thêm một frame mới. Tự xóa frame cũ hơn RING_DURATION_MS. */
  push: (frame: LandmarkFrame) => void
  /** Trả về slice của buffer hiện tại (copy) */
  getFrames: () => LandmarkFrame[]
  /** Xóa toàn bộ buffer */
  clear: () => void
}

/**
 * Ring buffer based on timestamp.
 * Giữ tất cả frames trong RING_DURATION_MS gần nhất.
 * Không gây re-render — dùng ref.
 */
export function useRingBuffer(): UseRingBufferReturn {
  const bufferRef = useRef<LandmarkFrame[]>([])

  const push = useCallback((frame: LandmarkFrame) => {
    const buf = bufferRef.current
    buf.push(frame)

    // Prune frames older than RING_DURATION_MS
    const cutoff = frame.timestamp - RING_DURATION_MS
    let i = 0
    while (i < buf.length && buf[i].timestamp < cutoff) i++
    if (i > 0) buf.splice(0, i)
  }, [])

  const getFrames = useCallback((): LandmarkFrame[] => {
    return [...bufferRef.current]
  }, [])

  const clear = useCallback(() => {
    bufferRef.current = []
  }, [])

  return { push, getFrames, clear }
}
