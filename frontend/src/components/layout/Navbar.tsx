import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'

// EARS[FR-A01] — Top navigation bar: logo + links + auth state

const NAV_LINKS = [
  { to: '/translate', label: '🤙 Dịch', auth: false },
  { to: '/learn',     label: '📚 Học',  auth: true  },
  { to: '/recorder',  label: '🎥 Ghi',  auth: true  },
]

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <nav
      style={{
        background: '#fff',
        borderBottom: '1px solid #ddd',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          fontWeight: 700,
          fontSize: 18,
          color: '#ff385c',
          textDecoration: 'none',
          marginRight: 32,
          flexShrink: 0,
        }}
      >
        VSL<span style={{ color: '#222', fontWeight: 400 }}> Learn & Translate</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {NAV_LINKS.filter((l) => !l.auth || isAuthenticated).map((link) => {
          const active = pathname.startsWith(link.to)
          return (
            <Link
              key={link.to}
              to={link.to}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                color: active ? '#ff385c' : '#444',
                textDecoration: 'none',
                background: active ? '#fff0f2' : 'transparent',
                transition: 'background .15s',
              }}
            >
              {link.label}
            </Link>
          )
        })}
        {isAuthenticated && user?.role === 'ADMIN' && (
          <Link
            to="/admin"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: pathname.startsWith('/admin') ? 600 : 400,
              fontSize: 14,
              color: pathname.startsWith('/admin') ? '#ff385c' : '#444',
              textDecoration: 'none',
              background: pathname.startsWith('/admin') ? '#fff0f2' : 'transparent',
            }}
          >
            ⚙️ Admin
          </Link>
        )}
      </div>

      {/* Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isAuthenticated ? (
          <>
            <span style={{ fontSize: 13, color: '#666' }}>{user?.displayName ?? user?.email}</span>
            <Button variant="secondary" size="sm" onClick={logout}>
              Đăng xuất
            </Button>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost" size="sm">Đăng nhập</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Đăng ký</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
