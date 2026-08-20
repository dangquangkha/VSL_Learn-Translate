import { useState, useCallback, useRef } from 'react'
import { createDecoderState, decoderStep, type DecoderState } from '../services/decoder'

// EARS[FR-A02] — Hook bọc decoder, expose words + controls

interface UseDecoderReturn {
  words: string[]
  decoderState: DecoderState
  /** Đưa kết quả infer mới vào decoder */
  feed: (label: string, confidence: number) => void
  /** Xóa chuỗi từ */
  clear: () => void
}

export function useDecoder(): UseDecoderReturn {
  const [state, setState] = useState<DecoderState>(createDecoderState)
  const lockedUntilRef = useRef({ value: 0 })

  const feed = useCallback((label: string, confidence: number) => {
    const now = performance.now()
    setState((prev) => {
      const { newState } = decoderStep(prev, label, confidence, now, lockedUntilRef.current)
      return newState
    })
  }, [])

  const clear = useCallback(() => {
    setState(createDecoderState())
    lockedUntilRef.current.value = 0
  }, [])

  return {
    words: state.words,
    decoderState: state,
    feed,
    clear,
  }
}
