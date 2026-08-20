// EARS[FR-A02.1] — Shared Badge component

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: React.CSSProperties
}

const colors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#d1fae5', text: '#065f46' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  error:   { bg: '#fee2e2', text: '#991b1b' },
  info:    { bg: '#dbeafe', text: '#1e40af' },
  muted:   { bg: '#f3f4f6', text: '#6b7280' },
}

export function Badge({ variant = 'muted', children, style }: BadgeProps) {
  const { bg, text } = colors[variant]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: text,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
