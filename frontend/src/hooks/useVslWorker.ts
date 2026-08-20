import { useEffect, useRef, useState, useCallback } from 'react'
import type { WorkerOutMessage, LandmarkFrame } from '../types/landmarks'

// EARS[FR-A02] — Hook quản lý Web Worker VSL, expose infer() và status

export type WorkerStatus = 'idle' | 'loading' | 'ready' | 'error'

interface UseVslWorkerReturn {
  status: WorkerStatus
  error: string | null
  topLabel: string
  confidence: number
  /** Gửi 32 frames vào worker để infer */
  infer: (frames: LandmarkFrame[]) => void
  /** Nạp (hoặc reload) model — truyền URL của file ONNX */
  loadModel: (modelUrl: string) => void
}

export function useVslWorker(): UseVslWorkerReturn {
  const workerRef = useRef<Worker | null>(null)
  const [status, setStatus]         = useState<WorkerStatus>('idle')
  const [error, setError]           = useState<string | null>(null)
  const [topLabel, setTopLabel]     = useState<string>('idle')
  const [confidence, setConfidence] = useState<number>(0)

  useEffect(() => {
    // Vite: ?worker suffix bundles the file as a Web Worker module
    // Using URL constructor for compatibility
    const worker = new Worker(
      new URL('../workers/vslWorker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data
      if (msg.type === 'READY') {
        setStatus('ready')
        setError(null)
      } else if (msg.type === 'RESULT') {
        setTopLabel(msg.topLabel)
        setConfidence(msg.confidence)
      } else if (msg.type === 'ERROR') {
        setStatus('error')
        setError(msg.message)
        console.error('[vslWorker]', msg.message)
      }
    }

    worker.onerror = (e: ErrorEvent) => {
      setStatus('error')
      setError(e.message)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const loadModel = useCallback((modelUrl: string) => {
    if (!workerRef.current) return
    setStatus('loading')
    setError(null)
    workerRef.current.postMessage({ type: 'INIT', modelUrl })
  }, [])

  const infer = useCallback((frames: LandmarkFrame[]) => {
    if (!workerRef.current || status !== 'ready') return
    workerRef.current.postMessage({ type: 'INFER', frames })
  }, [status])

  return { status, error, topLabel, confidence, infer, loadModel }
}
