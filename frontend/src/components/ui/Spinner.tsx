// EARS[FR-A02] — Shared Spinner loading indicator

interface SpinnerProps {
  size?: number
  color?: string
  style?: React.CSSProperties
}

export function Spinner({ size = 24, color = '#ff385c', style }: SpinnerProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'vsl-spin 0.7s linear infinite', display: 'block', ...style }}
      aria-label="Đang tải..."
      role="status"
    >
      <style>{`@keyframes vsl-spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity=".2" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
