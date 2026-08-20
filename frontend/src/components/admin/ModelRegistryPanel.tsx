import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { AdminIcon } from './AdminIcon'
import type { JsonValue, ModelAdmin } from '../../services/adminService'

interface ModelRegistryPanelProps {
  models: ModelAdmin[]
  page: number
  totalPages: number
  totalElements: number
  historyAvailable: boolean
  loading: boolean
  submitting: boolean
  activatingId: string | null
  onPageChange: (page: number) => void
  onUpload: (file: File, semver: string, metrics: string) => Promise<boolean>
  onActivate: (id: string) => Promise<boolean>
}

const MAX_MODEL_BYTES = 5 * 1024 * 1024
const REQUIRED_METRICS = [
  'top1AccuracyTestA',
  'top3AccuracyTestA',
  'worstClassRecall',
  'idleFalsePositivesPer60s',
  'browserLatencyMs',
  'throughputPredictionsPerSecond',
  'quantization',
  'goldenSampleCount',
  'goldenMaxLogitDiff',
  'benchmarkEnvironment',
  'datasetManifestSha256',
  'splitManifestSha256',
  'trainingCodeCommit',
  'trainedAt',
  'subjectSplitAssignments',
  'perSubjectAccuracy',
  'accuracyByMetadata',
  'knownLimitations',
] as const

const initialMetrics = '{\n  \n}'

function formatBytes(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return '—'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(2)} MB`
}

function metricNumber(metrics: Record<string, JsonValue>, key: string): number | null {
  const value = metrics[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function formatMetric(value: number | null, suffix = ''): string {
  return value === null ? '—' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}${suffix}`
}

function containsValidationFailure(value: JsonValue): boolean {
  if (typeof value === 'string') return value === 'FAILED' || value === 'FAIL'
  if (Array.isArray(value)) return value.some(containsValidationFailure)
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(containsValidationFailure)
  }
  return false
}

function validationState(model: ModelAdmin): { label: string; variant: 'success' | 'warning' | 'error' } {
  if (model.releaseEligible) return { label: 'Đủ điều kiện', variant: 'success' }
  const hasFailure = containsValidationFailure(model.validationResults)
  return hasFailure
    ? { label: 'Chưa đạt gate', variant: 'error' }
    : { label: 'Chờ xác minh', variant: 'warning' }
}

function validateUpload(file: File | null, semver: string, metricsText: string): string | null {
  if (!file) return 'Chọn file model ONNX trước khi upload.'
  if (!file.name.toLowerCase().endsWith('.onnx')) return 'File model phải có đuôi .onnx.'
  if (file.size <= 0 || file.size > MAX_MODEL_BYTES) return 'File model phải lớn hơn 0 và không quá 5 MiB.'
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(semver.trim())) {
    return 'Semver phải có dạng x.y.z, có thể kèm pre-release/build metadata.'
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(metricsText)
  } catch {
    return 'Metrics phải là JSON hợp lệ.'
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'Metrics phải là một JSON object.'
  }
  const metrics = parsed as Record<string, unknown>
  const missing = REQUIRED_METRICS.filter((field) => !(field in metrics))
  if (missing.length > 0) return `Metrics còn thiếu: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}.`
  if (metrics.goldenSampleCount !== 20) return 'goldenSampleCount phải đúng bằng 20 theo T-02.'
  if (typeof metrics.goldenMaxLogitDiff !== 'number' || metrics.goldenMaxLogitDiff >= 0.001) {
    return 'goldenMaxLogitDiff phải nhỏ hơn 0.001 theo T-02.'
  }
  return null
}

function modelDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function ModelRegistryPanel({
  models,
  page,
  totalPages,
  totalElements,
  historyAvailable,
  loading,
  submitting,
  activatingId,
  onPageChange,
  onUpload,
  onActivate,
}: ModelRegistryPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [semver, setSemver] = useState('')
  const [metricsText, setMetricsText] = useState(initialMetrics)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setFormError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const validationError = validateUpload(file, semver, metricsText)
    if (validationError || !file) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    const uploaded = await onUpload(file, semver.trim(), metricsText)
    if (uploaded) {
      setFile(null)
      setSemver('')
      setMetricsText(initialMetrics)
      form.reset()
    }
  }

  async function handleActivate(id: string) {
    setConfirmingId(null)
    await onActivate(id)
  }

  return (
    <section className="admin-section" aria-labelledby="models-heading">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">Registry</p>
          <h2 className="section-heading__title" id="models-heading">Phiên bản model</h2>
        </div>
        <span className="section-heading__meta">{totalElements.toLocaleString('vi-VN')} phiên bản</span>
      </div>

      <details className="upload-card" open>
        <summary className="upload-card__summary">
          <span className="upload-card__title">
            <span className="upload-card__icon" aria-hidden="true"><AdminIcon name="upload" size={18} /></span>
            Đăng ký model mới
          </span>
          <span className="upload-card__hint">ONNX ≤ 5 MiB · kiểm tra T-02 bắt buộc</span>
        </summary>
        <form className="upload-form" onSubmit={(event) => { void handleSubmit(event) }}>
          <div className="upload-form__grid">
            <label className="field">
              <span className="field__label">Semver <span aria-hidden="true">*</span></span>
              <input
                className="field__input"
                value={semver}
                onChange={(event) => setSemver(event.target.value)}
                placeholder="1.2.0"
                inputMode="decimal"
                required
                aria-describedby="semver-help"
              />
              <span className="field__help" id="semver-help">Dùng SemVer x.y.z (có thể kèm -rc.1/+build) và không trùng phiên bản đã có.</span>
            </label>
            <label className="field">
              <span className="field__label">File model ONNX <span aria-hidden="true">*</span></span>
              <input
                className="field__input field__input--file"
                type="file"
                accept=".onnx,application/octet-stream"
                onChange={handleFileChange}
                required
                aria-describedby="model-help"
              />
              <span className="field__help" id="model-help">
                {file ? `${file.name} · ${formatBytes(file.size)}` : 'Chọn file .onnx, tối đa 5 MiB.'}
              </span>
            </label>
          </div>
          <label className="field">
            <span className="field__label">Metrics JSON <span aria-hidden="true">*</span></span>
            <textarea
              className="field__input field__textarea"
              value={metricsText}
              onChange={(event) => setMetricsText(event.target.value)}
              rows={8}
              spellCheck={false}
              required
              aria-describedby="metrics-help"
            />
            <span className="field__help" id="metrics-help">
              Cần đủ contract metrics, gồm benchmark environment, split assignments, per-subject accuracy và T-02.
            </span>
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <div className="upload-form__actions">
            <Button type="submit" size="md" loading={submitting}>
              <AdminIcon name="upload" size={16} />
              {submitting ? 'Đang kiểm tra…' : 'Upload model'}
            </Button>
          </div>
        </form>
      </details>

      <div className="table-card">
        <div className="table-card__header">
          <h3 className="table-card__title">Lịch sử đăng ký</h3>
          <span className="table-card__note">Mới nhất trước</span>
        </div>
        {loading ? (
          <div className="table-loading" role="status">Đang tải lịch sử model…</div>
        ) : !historyAvailable ? (
          <p className="empty-state table-card__empty">Không thể xác định lịch sử model. Dùng nút “Thử lại” ở thông báo lỗi.</p>
        ) : models.length === 0 ? (
          <p className="empty-state table-card__empty">Chưa có model nào được đăng ký.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Lịch sử phiên bản model ONNX</caption>
              <thead>
                <tr>
                  <th scope="col">Phiên bản</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Metrics chính</th>
                  <th scope="col">Tạo lúc</th>
                  <th scope="col"><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => {
                  const state = validationState(model)
                  const top1 = metricNumber(model.metrics, 'top1AccuracyTestA')
                  const latency = metricNumber(model.metrics, 'browserLatencyMs')
                  const size = metricNumber(model.metrics, 'modelSizeBytes')
                  const confirming = confirmingId === model.id
                  return (
                    <tr key={model.id}>
                      <th scope="row">
                        <div className="model-version">{model.semver}</div>
                        <div className="model-hash" title={model.artifactSha256}>SHA {model.artifactSha256.slice(0, 10)}…</div>
                      </th>
                      <td>
                        <div className="status-stack">
                          {model.active && <Badge variant="info">Đang active</Badge>}
                          <Badge variant={state.variant}>{state.label}</Badge>
                        </div>
                      </td>
                      <td>
                        <div className="model-metrics">
                          <span>Test A <strong>{formatPercent(top1)}</strong></span>
                          <span>Latency <strong>{formatMetric(latency, ' ms')}</strong></span>
                          <span>Size <strong>{formatBytes(size)}</strong></span>
                        </div>
                      </td>
                      <td className="model-date">{modelDate(model.createdAt)}</td>
                      <td className="model-action">
                        {model.active ? (
                          <span className="active-label"><AdminIcon name="check" size={15} /> Đang dùng</span>
                        ) : confirming ? (
                          <span className="confirm-actions">
                            <Button
                              size="sm"
                              onClick={() => { void handleActivate(model.id) }}
                              loading={activatingId === model.id}
                            >
                              Xác nhận
                            </Button>
                            <button className="link-button" type="button" onClick={() => setConfirmingId(null)}>
                              Hủy
                            </button>
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!model.releaseEligible || activatingId !== null}
                            onClick={() => setConfirmingId(model.id)}
                            aria-label={`Kích hoạt model phiên bản ${model.semver}`}
                            title={!model.releaseEligible ? 'Model chưa đạt toàn bộ activation gates' : undefined}
                          >
                            Kích hoạt
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <nav className="pagination" aria-label="Phân trang model">
            <button
              className="pagination__button"
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0 || loading}
            >
              Trước
            </button>
            <span aria-live="polite">Trang {page + 1} / {totalPages}</span>
            <button
              className="pagination__button"
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages || loading}
            >
              Sau
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}
