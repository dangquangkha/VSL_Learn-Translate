import type { ReactNode } from 'react'
import { AdminIcon, type AdminIconName } from './AdminIcon'

interface AdminMetricCardProps {
  label: string
  value: string
  detail?: string
  icon: AdminIconName
  tone?: 'coral' | 'blue' | 'green' | 'amber'
}
const toneClass: Record<NonNullable<AdminMetricCardProps['tone']>, string> = {
  coral: 'metric-card--coral',
  blue: 'metric-card--blue',
  green: 'metric-card--green',
  amber: 'metric-card--amber',
}

export function AdminMetricCard({ label, value, detail, icon, tone = 'blue' }: AdminMetricCardProps) {
  return (
    <article className={`metric-card ${toneClass[tone]}`}>
      <div className="metric-card__header">
        <span className="metric-card__label">{label}</span>
        <span className="metric-card__icon" aria-hidden="true">
          <AdminIcon name={icon} size={18} />
        </span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      {detail && <span className="metric-card__detail">{detail}</span>}
    </article>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  action,
}: {
  id?: string
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
        <h2 className="section-heading__title" id={id}>{title}</h2>
      </div>
      {action}
    </div>
  )
}
