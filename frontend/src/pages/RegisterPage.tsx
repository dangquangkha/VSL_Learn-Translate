import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

// EARS[FR-B01] — Màn hình đăng ký

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    setLoading(true)
    try {
      await register(email, password, displayName || undefined)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Đăng ký thất bại. Email có thể đã tồn tại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <div
        style={{
          maxWidth: 420,
          margin: '40px auto',
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 14,
          padding: '36px 32px',
          boxShadow: '0 2px 16px rgba(0,0,0,.06)',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px', color: '#222' }}>
          Tạo tài khoản
        </h1>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 24px' }}>
          Tham gia cộng đồng học VSL 🤟
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

        <form onSubmit={(e) => { void handleSubmit(e) }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>Tên hiển thị (tùy chọn)</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              style={inputStyle}
            />
          </label>

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
              autoComplete="new-password"
              placeholder="Ít nhất 8 ký tự"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#444' }}>Xác nhận mật khẩu</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              style={inputStyle}
            />
          </label>

          <Button type="submit" variant="primary" size="md" loading={loading} style={{ width: '100%', marginTop: 4 }}>
            Đăng ký
          </Button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: '#ff385c', fontWeight: 600, textDecoration: 'none' }}>
            Đăng nhập
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
  background: '#fff',
  width: '100%',
}
