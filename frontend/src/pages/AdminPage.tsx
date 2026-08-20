import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { AdminIcon } from '../components/admin/AdminIcon'
import { AdminMetricCard, SectionHeading } from '../components/admin/AdminMetricCard'
import { ClassDistributionChart } from '../components/admin/ClassDistributionChart'
import { ModelRegistryPanel } from '../components/admin/ModelRegistryPanel'
import {
  adminService,
  getAdminApiError,
  type AdminApiError,
  type AdminStats,
  type ModelHistoryPage,
} from '../services/adminService'
import './AdminPage.css'

// EARS[FR-015, FR-017, AC-017] — Admin dashboard consumes typed stats/model contracts and exposes stable errors.

const MODEL_PAGE_SIZE = 20

interface Notice {
  tone: 'success' | 'error' | 'info'
  message: string
  code?: string
  correlationId?: string
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function integer(value: unknown): string {
  const numeric = finiteNumber(value)
  return numeric === null ? '—' : Math.round(numeric).toLocaleString('vi-VN')
}

function decimal(value: unknown): string {
  const numeric = finiteNumber(value)
  return numeric === null ? '—' : numeric.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}

function percent(value: unknown): string {
  const numeric = finiteNumber(value)
  return numeric === null ? '—' : `${(numeric * 100).toFixed(1)}%`
}

function ratio(numerator: unknown, denominator: unknown): string {
  const top = finiteNumber(numerator)
  const bottom = finiteNumber(denominator)
  return top === null || bottom === null || bottom <= 0 ? '—' : `${((top / bottom) * 100).toFixed(1)}%`
}

function dateTime(value: unknown): { label: string; iso?: string } {
  if (typeof value !== 'string') return { label: 'Chưa có thời điểm' }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { label: 'Thời điểm không hợp lệ' }
  return {
    label: new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(parsed),
    iso: value,
  }
}

function ErrorNotice({ error, onRetry }: { error: AdminApiError; onRetry?: () => void }) {
  return (
    <div className="admin-notice admin-notice--error" role="alert">
      <div>
        <strong>{error.code}</strong>
        <p>{error.message}</p>
        {error.correlationId && <small>Mã đối soát: {error.correlationId}</small>}
      </div>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Thử lại</Button>}
    </div>
  )
}

function NoticeBanner({ notice }: { notice: Notice }) {
  return (
    <div className={`admin-notice admin-notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <div>
        {notice.code && <strong>{notice.code}</strong>}
        <p>{notice.message}</p>
        {notice.correlationId && <small>Mã đối soát: {notice.correlationId}</small>}
      </div>
    </div>
  )
}

function MetadataDistribution({ stats }: { stats: AdminStats }) {
  const axes = ['region', 'handedness', 'knowsVsl', 'ageGroup']
  return (
    <div className="metadata-grid">
      {axes.map((axis) => {
        const values = stats.metadataDistribution?.[axis] ?? []
        const max = Math.max(...values.map((entry) => entry.count), 1)
        return (
          <article className="metadata-card" key={axis}>
            <h3>{axisLabel(axis)}</h3>
            {values.length === 0 ? (
              <p className="empty-state">Chưa có dữ liệu</p>
            ) : (
              <ul className="metadata-list">
                {values.map((entry) => (
                  <li key={entry.key}>
                    <div className="metadata-list__label"><span>{entry.key}</span><strong>{integer(entry.count)}</strong></div>
                    <progress value={entry.count} max={max} aria-label={`${axisLabel(axis)} ${entry.key}: ${entry.count} bản ghi`} />
                  </li>
                ))}
              </ul>
            )}
          </article>
        )
      })}
    </div>
  )
}

function axisLabel(axis: string): string {
  const labels: Record<string, string> = {
    region: 'Khu vực',
    handedness: 'Tay thuận',
    knowsVsl: 'Đã biết VSL',
    ageGroup: 'Nhóm tuổi',
  }
  return labels[axis] ?? axis
}

function AdminStatsSections({ stats, onRefresh, loading }: { stats: AdminStats; onRefresh: () => void; loading: boolean }) {
  const generated = dateTime(stats.generatedAt)
  const acceptedRate = ratio(stats.acceptedClips, stats.totalClips)
  const topRejections = useMemo(
    () => [...(stats.rejectionRateBySign ?? [])].sort((a, b) => b.rejectionRate - a.rejectionRate).slice(0, 8),
    [stats.rejectionRateBySign],
  )

  return (
    <>
      <section className="admin-section" aria-labelledby="overview-heading" aria-busy={loading}>
        <SectionHeading
          id="overview-heading"
          eyebrow="Tổng quan dữ liệu"
          title="Sức khỏe dataset"
          action={(
            <button className="icon-button" type="button" onClick={onRefresh} disabled={loading} aria-label="Làm mới số liệu">
              <AdminIcon name="refresh" size={18} />
              <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
            </button>
          )}
        />
        <p className="section-caption">
          Phạm vi <strong>{stats.scope || 'ADMIN_INTERNAL'}</strong> · cập nhật <time dateTime={generated.iso}>{generated.label}</time>
        </p>
        <div className="metric-grid">
          <AdminMetricCard label="Tổng clips" value={integer(stats.totalClips)} detail="Tất cả trạng thái" icon="database" tone="blue" />
          <AdminMetricCard label="Đã chấp nhận" value={integer(stats.acceptedClips)} detail={`Tỷ lệ ${acceptedRate}`} icon="check" tone="green" />
          <AdminMetricCard label="Cần review" value={integer(stats.needsReviewClips)} detail={`${integer(stats.pendingClips)} clips pending`} icon="clock" tone="amber" />
          <AdminMetricCard label="Đóng góp viên" value={integer(stats.totalContributors)} detail={`${integer(stats.totalClasses)} classes · TB ${decimal(stats.averageClipsPerContributor)} clips`} icon="model" tone="coral" />
          <AdminMetricCard label="Tỷ lệ từ chối" value={percent(stats.rejectionRate)} detail={`${integer(stats.rejectedClips)} clips rejected`} icon="chart" tone="coral" />
        </div>
      </section>

      <section className="admin-grid admin-grid--wide" aria-label="Phân bố dataset">
        <article className="panel panel--chart">
          <SectionHeading eyebrow="FR-013 / FR-015" title="Clips theo class" />
          <p className="section-caption">Giữ nguyên thứ tự catalog và cả class có count bằng 0.</p>
          <ClassDistributionChart data={stats.clipsPerClass ?? []} />
        </article>
        <article className="panel">
          <SectionHeading eyebrow="Metadata" title="Phân bố người đóng góp" />
          <p className="section-caption">Chỉ hiển thị aggregate trong phạm vi nội bộ.</p>
          <MetadataDistribution stats={stats} />
        </article>
      </section>

      <section className="admin-grid admin-grid--wide" aria-label="Theo dõi chất lượng">
        <article className="panel">
          <SectionHeading eyebrow="Contributor progress" title="Tiến độ đóng góp" />
          {(stats.contributorProgress ?? []).length === 0 ? (
            <p className="empty-state">Chưa có tiến độ contributor.</p>
          ) : (
            <div className="progress-list">
              {stats.contributorProgress.map((entry) => (
                <div className="progress-row" key={entry.participantCode}>
                  <div className="progress-row__header">
                    <span>{entry.participantCode}</span>
                    <strong>{percent(entry.completionPercentage / 100)}</strong>
                  </div>
                  <progress value={entry.completionPercentage} max={100} aria-label={`${entry.participantCode}: ${entry.completionPercentage}% hoàn thành`} />
                  <small>{integer(entry.acceptedCount)} / {integer(entry.targetCount)} clips accepted</small>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="panel">
          <SectionHeading eyebrow="Quality signal" title="Class có tỷ lệ từ chối cao" />
          {topRejections.length === 0 ? (
            <p className="empty-state">Chưa có dữ liệu rejection theo class.</p>
          ) : (
            <div className="rejection-list">
              {topRejections.map((entry) => (
                <div className="rejection-row" key={`${entry.labelId}-${entry.code}`}>
                  <div>
                    <strong>{entry.code}</strong>
                    <small>{integer(entry.rejectedCount)} rejected · {integer(entry.acceptedCount)} accepted</small>
                  </div>
                  <span className="rejection-row__rate">{percent(entry.rejectionRate)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  )
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [models, setModels] = useState<ModelHistoryPage | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [statsError, setStatsError] = useState<AdminApiError | null>(null)
  const [modelsError, setModelsError] = useState<AdminApiError | null>(null)
  const [modelPage, setModelPage] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const loadStats = useCallback(async (signal?: AbortSignal) => {
    setStatsLoading(true)
    try {
      const result = await adminService.getStats({ signal })
      if (!signal?.aborted) {
        setStats(result)
        setStatsError(null)
      }
    } catch (error: unknown) {
      if (!signal?.aborted) setStatsError(getAdminApiError(error, 'Không tải được thống kê admin.'))
    } finally {
      if (!signal?.aborted) setStatsLoading(false)
    }
  }, [])

  const loadModels = useCallback(async (page: number, signal?: AbortSignal) => {
    setModelsLoading(true)
    try {
      const result = await adminService.getModelHistory(page, MODEL_PAGE_SIZE, { signal })
      if (!signal?.aborted) {
        setModels(result)
        setModelPage(result.number)
        setModelsError(null)
      }
    } catch (error: unknown) {
      if (!signal?.aborted) setModelsError(getAdminApiError(error, 'Không tải được lịch sử model.'))
    } finally {
      if (!signal?.aborted) setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([loadStats(controller.signal), loadModels(0, controller.signal)])
    return () => controller.abort()
  }, [loadModels, loadStats])

  async function handleUpload(file: File, semver: string, metrics: string): Promise<boolean> {
    setSubmitting(true)
    setNotice(null)
    try {
      await adminService.uploadModel(file, semver, metrics)
      setNotice({ tone: 'success', message: `Đã đăng ký model ${semver}. Model chỉ được kích hoạt khi vượt toàn bộ release gates.` })
      await Promise.all([loadStats(), loadModels(modelPage)])
      return true
    } catch (error: unknown) {
      const parsed = getAdminApiError(error, 'Upload model thất bại.')
      setNotice({ tone: 'error', ...parsed })
      if (parsed.code === 'REQUEST_TIMEOUT') {
        await Promise.all([loadStats(), loadModels(0)])
      }
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(id: string): Promise<boolean> {
    setActivatingId(id)
    setNotice(null)
    try {
      const activated = await adminService.activateModel(id)
      setNotice({ tone: 'success', message: `Đã kích hoạt model ${activated.semver}.` })
      await Promise.all([loadStats(), loadModels(modelPage)])
      return true
    } catch (error: unknown) {
      const parsed = getAdminApiError(error, 'Kích hoạt model thất bại.')
      setNotice({ tone: 'error', ...parsed })
      return false
    } finally {
      setActivatingId(null)
    }
  }

  const hasInitialStatsFailure = !stats && statsError !== null && !statsLoading

  return (
    <AppShell>
      <div className="admin-page">
        <header className="admin-hero">
          <div>
            <p className="admin-hero__eyebrow">P5 · Admin operations</p>
            <h1>Admin Dashboard</h1>
            <p className="admin-hero__description">
              Theo dõi dữ liệu đã consent, kiểm tra release gate và quản lý model chạy trên trình duyệt.
            </p>
          </div>
          <span className="admin-hero__scope">
            <Badge
              variant="info"
              style={{ background: 'rgba(255,255,255,.14)', color: '#fff', border: '1px solid rgba(255,255,255,.24)' }}
            >
              <AdminIcon name="database" size={14} /> ADMIN_INTERNAL
            </Badge>
          </span>
        </header>

        {notice && <NoticeBanner notice={notice} />}
        {statsError && stats && <ErrorNotice error={statsError} onRetry={() => { void loadStats() }} />}

        {statsLoading && !stats ? (
          <div className="admin-loading" role="status">
            <span className="loading-skeleton loading-skeleton--wide" />
            <span className="loading-skeleton" />
            <span className="loading-skeleton" />
            <p>Đang tải số liệu nội bộ…</p>
          </div>
        ) : hasInitialStatsFailure ? (
          <ErrorNotice error={statsError} onRetry={() => { void loadStats() }} />
        ) : stats ? (
          <AdminStatsSections stats={stats} onRefresh={() => { void loadStats() }} loading={statsLoading} />
        ) : null}

        {modelsError && <ErrorNotice error={modelsError} onRetry={() => { void loadModels(modelPage) }} />}
        <ModelRegistryPanel
          models={models?.content ?? []}
          page={modelPage}
          totalPages={models?.totalPages ?? 0}
          totalElements={models?.totalElements ?? 0}
          historyAvailable={models !== null}
          loading={modelsLoading}
          submitting={submitting}
          activatingId={activatingId}
          onPageChange={(page) => { void loadModels(page) }}
          onUpload={handleUpload}
          onActivate={handleActivate}
        />
      </div>
    </AppShell>
  )
}
