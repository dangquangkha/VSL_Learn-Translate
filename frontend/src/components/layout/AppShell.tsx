import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

// EARS[FR-A01] — App shell: sticky navbar + main content area

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f7f7f7' }}>
      <Navbar />
      <main style={{ flex: 1, width: '100%', maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        {children}
      </main>
      <footer
        style={{
          padding: '16px 24px',
          borderTop: '1px solid #eee',
          background: '#fff',
          fontSize: 12,
          color: '#999',
          textAlign: 'center',
        }}
      >
        VSL Learn &amp; Translate — Dự án phi lợi nhuận học Ngôn ngữ Ký hiệu Việt Nam
      </footer>
    </div>
  )
}
