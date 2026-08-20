import type { ButtonHTMLAttributes } from 'react'

// EARS[FR-A01] — Shared Button component

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'background:#ff385c;color:#fff;border:none;',
  secondary:
    'background:#fff;color:#222;border:1.5px solid #dddddd;',
  ghost:
    'background:transparent;color:#222;border:none;',
  danger:
    'background:#ef4444;color:#fff;border:none;',
}

const sizeStyles: Record<Size, string> = {
  sm: 'padding:6px 14px;font-size:13px;',
  md: 'padding:12px 22px;font-size:15px;',
  lg: 'padding:14px 28px;font-size:16px;',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const base =
    'display:inline-flex;align-items:center;gap:8px;border-radius:8px;font-weight:500;cursor:pointer;transition:opacity .15s,transform .1s;line-height:1.25;'
  const computedStyle = `${base}${variantStyles[variant]}${sizeStyles[size]}${
    disabled || loading ? 'opacity:0.5;cursor:not-allowed;' : ''
  }`

  return (
    <button
      style={{ ...parseStyle(computedStyle), ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

/** Parse inline style string to CSSProperties (simple key:value pairs) */
function parseStyle(css: string): Record<string, string> {
  return Object.fromEntries(
    css
      .split(';')
      .filter(Boolean)
      .map((s) => {
        const [k, ...v] = s.split(':')
        const key = k.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        return [key, v.join(':').trim()]
      }),
  )
}

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity=".25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
