import { useEffect, useRef, useState, useCallback } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Spinner } from '../components/ui/Spinner'
import { useVslWorker } from '../hooks/useVslWorker'
import { useRingBuffer } from '../hooks/useRingBuffer'
import { useSlidingWindow } from '../hooks/useSlidingWindow'
import { useDecoder } from '../hooks/useDecoder'
import { LABELS } from '../generated/labels'
import type { LandmarkFrame } from '../types/landmarks'

// EARS[FR-A02, FR-A02.1, FR-A02.2] — Chế độ Dịch: webcam → landmark → ONNX → từ

// Model URL — P1 sẽ cung cấp file ONNX giả tại path này
const MODEL_URL = '/models/vsl_model.onnx'

/** Lấy displayName tiếng Việt từ code */
function getDisplayName(code: string): string {
  return LABELS.find((l) => l.code === code)?.displayNameVi ?? code
}

/** Giả lập LandmarkFrame từ webcam (stub — khi P1-4 giao useLandmarks sẽ dùng thật) */
function makeMockFrame(handSeen: boolean): LandmarkFrame {
  return {
    timestamp: performance.now(),
    leftHand: null,
    rightHand: null,
    pose: [],
    handSeen,
  }
}

export default function TranslatePage() {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const fpsCountRef = useRef({ count: 0, last: performance.now(), fps: 0 })
  const outputRef   = useRef<HTMLDivElement>(null)

  const [camActive, setCamActive]   = useState(false)
  const [camError, setCamError]     = useState<string | null>(null)
  const [fps, setFps]               = useState(0)
  const [copied, setCopied]         = useState(false)

  // Worker + ONNX
  const { status: workerStatus, error: workerError, topLabel, confidence, infer, loadModel } = useVslWorker()

  // Ring buffer + sliding window
  const { push, getFrames, clear: clearBuffer } = useRingBuffer()
  const { feed, words, clear: clearDecoder } = useDecoder()

  // Sliding window → infer khi đủ 6 frame mới với tay
  const { addFrame } = useSlidingWindow({
    onWindow: useCallback((frames: LandmarkFrame[]) => {
      infer(frames)
    }, [infer]),
  })

  // Khi worker trả kết quả → đưa vào decoder
  useEffect(() => {
    if (topLabel) {
      feed(topLabel, confidence)
    }
  }, [topLabel, confidence, feed])

  // Tự động load model khi trang mở
  useEffect(() => {
    loadModel(MODEL_URL)
  }, [loadModel])

  // Tự scroll output dải từ sang phải khi có từ mới
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollLeft = outputRef.current.scrollWidth
    }
  }, [words])

  // Bật webcam
  async function startCamera() {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCamActive(true)
      // Bắt đầu vòng lặp xử lý frame
      requestAnimationFrame(processFrame)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không mở được webcam'
      setCamError(msg)
    }
  }

  // Tắt webcam
  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamActive(false)
    clearBuffer()
  }

  // Vòng lặp xử lý frame
  // Hiện tại dùng mock frame — khi P1-4 cung cấp useLandmarks sẽ thay thế
  const processFrame = useCallback(() => {
    if (!streamRef.current) return

    // FPS counter
    const now = performance.now()
    fpsCountRef.current.count += 1
    if (now - fpsCountRef.current.last >= 1000) {
      fpsCountRef.current.fps   = fpsCountRef.current.count
      fpsCountRef.current.count = 0
      fpsCountRef.current.last  = now
      setFps(fpsCountRef.current.fps)
    }

    // TODO: khi P1-4 giao useLandmarks, thay dòng này bằng kết quả thật từ MediaPipe
    const frame = makeMockFrame(false /* handSeen = false khi chưa có MediaPipe */)
    push(frame)
    addFrame(frame, getFrames())

    requestAnimationFrame(processFrame)
  }, [push, addFrame, getFrames])

  // Copy chuỗi từ ra clipboard
  async function copyWords() {
    const text = words.map(getDisplayName).join(' ')
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Xóa
  function handleClear() {
    clearDecoder()
    clearBuffer()
  }

  // Màu status worker
  const workerBadge =
    workerStatus === 'ready'   ? 'success' :
    workerStatus === 'loading' ? 'warning' :
    workerStatus === 'error'   ? 'error'   : 'muted'

  const workerLabel =
    workerStatus === 'ready'   ? '✅ Model sẵn sàng' :
    workerStatus === 'loading' ? '⏳ Đang nạp model…' :
    workerStatus === 'error'   ? '❌ Lỗi model'       : '⬜ Chưa khởi động'

  return (
    <AppShell>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Tiêu đề */}
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', color: '#222' }}>
          🤙 Chế độ Dịch
        </h1>
        <p style={{ color: '#888', fontSize: 14, margin: '0 0 20px' }}>
          Thực hiện ký hiệu VSL trước webcam — từ tương ứng sẽ hiện ngay bên dưới.
        </p>

        {/* Privacy notice — FR-A02.2 */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            fontSize: 13,
            color: '#166534',
          }}
        >
          🔒&nbsp;<strong>Video không rời khỏi máy bạn.</strong>
          &nbsp;Toàn bộ nhận dạng diễn ra ngay trên trình duyệt.
        </div>

        {/* Layout: webcam trái, output phải */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Cột trái: webcam */}
          <div>
            <div
              style={{
                position: 'relative',
                background: '#111',
                borderRadius: 12,
                overflow: 'hidden',
                aspectRatio: '4/3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <video
                ref={videoRef}
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: camActive ? 'block' : 'none',
                  transform: 'scaleX(-1)', // gương
                }}
              />
              {!camActive && (
                <div style={{ color: '#888', textAlign: 'center', padding: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
                  <div style={{ fontSize: 14 }}>Nhấn "Bật webcam" để bắt đầu</div>
                </div>
              )}

              {/* FPS overlay */}
              {camActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,.6)',
                    color: '#fff',
                    fontSize: 12,
                    padding: '3px 8px',
                    borderRadius: 6,
                  }}
                >
                  {fps} fps
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {!camActive ? (
                <Button variant="primary" size="md" onClick={() => { void startCamera() }}>
                  📷 Bật webcam
                </Button>
              ) : (
                <Button variant="secondary" size="md" onClick={stopCamera}>
                  ⏹ Dừng
                </Button>
              )}
            </div>

            {camError && (
              <div
                style={{
                  marginTop: 8,
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                }}
              >
                {camError}
              </div>
            )}
          </div>

          {/* Cột phải: status + output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Status bar — FR-A02.1 */}
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: '#555', marginBottom: 2 }}>
                📊 Trạng thái thời gian thực
              </div>

              <StatusRow label="Model">
                <Badge variant={workerBadge}>{workerLabel}</Badge>
              </StatusRow>

              <StatusRow label="Fps">
                <Badge variant={camActive ? 'info' : 'muted'}>
                  {camActive ? `${fps} fps` : '—'}
                </Badge>
              </StatusRow>

              <StatusRow label="Tay">
                <Badge variant="muted">—</Badge>
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>
                  (cần MediaPipe)
                </span>
              </StatusRow>

              <StatusRow label="Confidence">
                <Badge variant={confidence >= 0.7 ? 'success' : 'muted'}>
                  {camActive && workerStatus === 'ready'
                    ? `${(confidence * 100).toFixed(0)}%`
                    : '—'}
                </Badge>
              </StatusRow>

              <StatusRow label="Nhãn hiện tại">
                <Badge variant="info">
                  {camActive && workerStatus === 'ready' ? getDisplayName(topLabel) : '—'}
                </Badge>
              </StatusRow>
            </div>

            {/* Worker error */}
            {workerError && (
              <div
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                }}
              >
                {workerError}
              </div>
            )}

            {/* Spinner khi loading */}
            {workerStatus === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}>
                <Spinner size={18} />
                Đang nạp model ONNX…
              </div>
            )}

            {/* Chuỗi từ output */}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#555',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>📝 Chuỗi từ</span>
                <span style={{ color: '#aaa', fontWeight: 400 }}>{words.length} từ</span>
              </div>

              {/* Word strip */}
              <div
                ref={outputRef}
                style={{
                  minHeight: 80,
                  background: words.length ? '#fff' : '#f9fafb',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 8,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  maxHeight: 160,
                }}
              >
                {words.length === 0 ? (
                  <span style={{ color: '#bbb', fontSize: 14, alignSelf: 'center' }}>
                    Chưa nhận dạng được từ nào…
                  </span>
                ) : (
                  words.map((w, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#fff0f2',
                        color: '#ff385c',
                        border: '1px solid #fecdd3',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 15,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getDisplayName(w)}
                    </span>
                  ))
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { void copyWords() }}
                  disabled={words.length === 0}
                >
                  {copied ? '✅ Đã sao chép' : '📋 Sao chép'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={words.length === 0}
                >
                  🗑 Xóa
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Hướng dẫn sử dụng */}
        <div
          style={{
            marginTop: 28,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '14px 18px',
            fontSize: 13,
            color: '#92400e',
          }}
        >
          <strong>💡 Cách sử dụng:</strong>
          <ol style={{ margin: '6px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Bật webcam, đứng cách camera ~60–90cm để thấy thân trên.</li>
            <li>Thực hiện ký hiệu VSL rõ ràng và giữ ~1 giây.</li>
            <li>Buông tay về vị trí trung lập (idle) giữa các ký hiệu.</li>
            <li>Từ nhận dạng được sẽ xuất hiện trong ô bên dưới.</li>
          </ol>
        </div>

      </div>
    </AppShell>
  )
}

/** Helper row trong status bar */
function StatusRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ color: '#888', minWidth: 110 }}>{label}</span>
      {children}
    </div>
  )
}
