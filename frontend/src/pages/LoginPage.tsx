import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

// EARS[FR-B01] — Màn hình đăng nhập

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại. Kiểm tra email và mật khẩu.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div
        style={{
          maxWidth: 400,
          margin: '40px auto',
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 14,
          padding: '36px 32px',
          boxShadow: '0 2px 16px rgba(0,0,0,.06)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#222' }}>
          Đăng nhập
        </h1>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>
          Chào mừng trở lại 👋
        </p>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputStyle}
            />
          </label>

          <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%' }}>
            Đăng nhập
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: '#ff385c', fontWeight: 600, textDecoration: 'none' }}>
            Đăng ký
          </Link>
        </p>
      </div>
    </AppShell>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #ddd',
  fontSize: 15,
  outline: 'none',
  transition: 'border-color .15s',
  background: '#fff',
  width: '100%',
}
