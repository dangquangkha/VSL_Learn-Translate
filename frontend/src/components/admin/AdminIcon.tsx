import type { SVGProps } from 'react'

export type AdminIconName = 'chart' | 'check' | 'clock' | 'database' | 'model' | 'upload' | 'refresh'

interface AdminIconProps extends SVGProps<SVGSVGElement> {
  name: AdminIconName
  size?: number
}
// EARS[FR-017] — Vector-only icons keep controls legible without emoji dependencies.
export function AdminIcon({ name, size = 20, ...props }: AdminIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      focusable="false"
      {...props}
    >
      {name === 'chart' && (
        <>
          <path {...common} d="M4 19V5M4 19h17" />
          <path {...common} d="m7 15 3-4 3 2 5-7" />
          <circle {...common} cx="18" cy="6" r="1" />
        </>
      )}
      {name === 'check' && <path {...common} d="m5 12 4.2 4.2L19 6.5" />}
      {name === 'clock' && (
        <>
          <circle {...common} cx="12" cy="12" r="8.5" />
          <path {...common} d="M12 7v5l3.2 2" />
        </>
      )}
      {name === 'database' && (
        <>
          <ellipse {...common} cx="12" cy="5.5" rx="7.5" ry="3" />
          <path {...common} d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
        </>
      )}
      {name === 'model' && (
        <>
          <rect {...common} x="5" y="5" width="14" height="14" rx="2" />
          <path {...common} d="M9 9h6v6H9zM9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </>
      )}
      {name === 'upload' && (
        <>
          <path {...common} d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
          <path {...common} d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
        </>
      )}
      {name === 'refresh' && (
        <>
          <path {...common} d="M19 8a7.5 7.5 0 0 0-13.3-2L4 8" />
          <path {...common} d="M4 4v4h4M5 16a7.5 7.5 0 0 0 13.3 2L20 16" />
          <path {...common} d="M20 20v-4h-4" />
        </>
      )}
    </svg>
  )
}
