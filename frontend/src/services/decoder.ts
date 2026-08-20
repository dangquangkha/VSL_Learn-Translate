// EARS[FR-A02] — Bộ giải mã chuỗi ký hiệu (Sequence Decoder)
//
// Quy tắc phát từ:
//   1. confidence >= THRESHOLD (0.7)
//   2. Cùng nhãn xuất hiện ở REPEAT_WINDOWS cửa sổ liên tiếp (3)
//   3. Sau khi phát từ: khóa LOCK_MS (1000ms) để chờ `idle`
//   4. Chỉ phát từ tiếp theo sau khi thấy `idle` (bộ phân loại trả về "idle")

const THRESHOLD      = 0.7    // ngưỡng confidence tối thiểu
const REPEAT_WINDOWS = 3      // số cửa sổ liên tiếp phải cùng nhãn
const LOCK_MS        = 1000   // ms khóa sau khi phát từ (chờ idle)

export interface DecoderState {
  words: string[]         // chuỗi từ đã phát ra
  locked: boolean         // đang trong thời gian khóa
  pendingLabel: string    // nhãn đang được theo dõi
  pendingCount: number    // số cửa sổ liên tiếp của pendingLabel
  seenIdleAfterLock: boolean  // đã thấy idle sau khi phát từ chưa
}

export function createDecoderState(): DecoderState {
  return {
    words: [],
    locked: false,
    pendingLabel: '',
    pendingCount: 0,
    seenIdleAfterLock: true, // ban đầu coi như đã thấy idle
  }
}

/** Immutable update: trả về state mới + (optional) từ vừa phát ra */
export function decoderStep(
  state: DecoderState,
  label: string,
  confidence: number,
  now: number,
  lockedUntilRef: { value: number },
): { newState: DecoderState; emitted: string | null } {
  const next = { ...state }
  let emitted: string | null = null

  // Kiểm tra khóa hết chưa
  if (next.locked && now >= lockedUntilRef.value) {
    next.locked = false
  }

  if (next.locked) {
    // Trong thời gian khóa: theo dõi idle
    if (label === 'idle' && confidence >= THRESHOLD) {
      next.seenIdleAfterLock = true
    }
    return { newState: next, emitted: null }
  }

  // Bỏ qua nếu confidence thấp
  if (confidence < THRESHOLD) {
    next.pendingLabel = ''
    next.pendingCount = 0
    return { newState: next, emitted: null }
  }

  // Bỏ qua idle (không phát ra từ idle, chỉ dùng để reset)
  if (label === 'idle') {
    next.pendingLabel = ''
    next.pendingCount = 0
    next.seenIdleAfterLock = true
    return { newState: next, emitted: null }
  }

  // Phải thấy idle trước khi phát từ mới (sau lần phát cuối)
  if (!next.seenIdleAfterLock) {
    return { newState: next, emitted: null }
  }

  // Theo dõi pending
  if (label === next.pendingLabel) {
    next.pendingCount += 1
  } else {
    next.pendingLabel = label
    next.pendingCount = 1
  }

  // Đủ REPEAT_WINDOWS cửa sổ → phát từ
  if (next.pendingCount >= REPEAT_WINDOWS) {
    emitted = label
    next.words = [...next.words, label]
    next.pendingLabel = ''
    next.pendingCount = 0
    next.locked = true
    next.seenIdleAfterLock = false
    lockedUntilRef.value = now + LOCK_MS
  }

  return { newState: next, emitted }
}
