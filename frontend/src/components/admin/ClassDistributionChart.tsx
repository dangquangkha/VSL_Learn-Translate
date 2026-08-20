import { useMemo } from 'react'
import type { ClassCount } from '../../services/adminService'

interface ClassDistributionChartProps {
  data: ClassCount[]
}

// EARS[FR-013, FR-015] — Render every backend-provided class count; no missing label becomes an invented zero.
export function ClassDistributionChart({ data }: ClassDistributionChartProps) {
  const maxCount = useMemo(() => Math.max(...data.map((entry) => entry.count), 1), [data])

  if (data.length === 0) {
    return <p className="empty-state">Chưa có dữ liệu phân bố theo class.</p>
  }

  return (
    <div className="distribution-chart">
      {data.length !== 51 && (
        <p className="distribution-chart__warning" role="alert">
          STATS_CONTRACT_MISMATCH: backend trả {data.length}/51 class. Không tự điền số liệu còn thiếu.
        </p>
      )}
      <div className="distribution-chart__legend" aria-hidden="true">
        <span>Class</span>
        <span>Số clips</span>
      </div>
      <div className="distribution-chart__rows" role="list" aria-label="Số clips theo class">
        {data.map((entry) => (
          <div className="distribution-row" role="listitem" key={`${entry.labelId}-${entry.code}`}>
            <div className="distribution-row__label" title={entry.code}>
              <span>{entry.code}</span>
              <strong>{entry.count.toLocaleString('vi-VN')}</strong>
            </div>
            <progress
              className="distribution-row__bar"
              value={entry.count}
              max={maxCount}
              aria-label={`${entry.code}: ${entry.count.toLocaleString('vi-VN')} clips`}
            />
          </div>
        ))}
      </div>
      <p className="distribution-chart__note">Đã hiển thị {data.length} class theo catalog backend.</p>
    </div>
  )
}
