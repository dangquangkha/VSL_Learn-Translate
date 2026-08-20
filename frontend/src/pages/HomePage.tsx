import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'

// EARS[FR-A01] — Trang chủ: 3 lối vào (Học / Dịch / Đóng góp/Ghi)

const FEATURES = [
  {
    icon: '🤙',
    title: 'Chế độ Dịch',
    desc: 'Bật webcam, thực hiện ký hiệu, từ tương ứng hiện ngay trên màn hình. Chạy 100% trên máy bạn — video không bao giờ rời khỏi thiết bị.',
    cta: 'Dịch ngay',
    href: '/translate',
    auth: false,
    primary: true,
  },
  {
    icon: '📚',
    title: 'Chế độ Học',
    desc: 'Xem video mẫu cho từng ký hiệu, luyện tập và nhận phản hồi tức thì. Hệ thống Leitner nhắc bạn ôn đúng lúc.',
    cta: 'Bắt đầu học',
    href: '/learn',
    auth: true,
    primary: false,
  },
  {
    icon: '🎥',
    title: 'Đóng góp dữ liệu',
    desc: 'Quay ký hiệu của bạn để cải thiện độ chính xác của model. Dữ liệu được tải trực tiếp lên cloud — không đi qua server.',
    cta: 'Tham gia ghi',
    href: '/recorder',
    auth: true,
    primary: false,
  },
]

export default function HomePage() {
  const { isAuthenticated } = useAuth()

  return (
    <AppShell>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '48px 16px 32px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🤟</div>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px', color: '#222' }}>
          Học và Dịch Ngôn ngữ Ký hiệu Việt Nam
        </h1>
        <p style={{ fontSize: 16, color: '#666', maxWidth: 540, margin: '0 auto 32px' }}>
          Hệ thống nhận dạng ký hiệu chạy hoàn toàn trên trình duyệt — không cần cài đặt,
          không cần máy chủ AI, video webcam không rời khỏi máy bạn.
        </p>
        <Link to="/translate">
          <Button variant="primary" size="lg">
            🤙 Thử Dịch Ngay
          </Button>
        </Link>
      </div>

      {/* Privacy notice */}
      <div
        style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 10,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 640,
          margin: '0 auto 40px',
          fontSize: 14,
          color: '#166534',
        }}
      >
        <span style={{ fontSize: 18 }}>🔒</span>
        <span>
          <strong>Video không rời khỏi máy bạn.</strong> Toàn bộ quá trình nhận dạng diễn ra
          ngay trên trình duyệt, không gửi dữ liệu về server.
        </span>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f.href}
            style={{
              background: '#fff',
              border: f.primary ? '2px solid #ff385c' : '1px solid #eee',
              borderRadius: 14,
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: f.primary
                ? '0 4px 20px rgba(255,56,92,.12)'
                : '0 1px 4px rgba(0,0,0,.04)',
            }}
          >
            <div style={{ fontSize: 36 }}>{f.icon}</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#222' }}>
              {f.title}
            </h2>
            <p style={{ fontSize: 14, color: '#555', margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            <Link
              to={(!f.auth || isAuthenticated) ? f.href : '/login'}
              style={{ marginTop: 'auto', textDecoration: 'none' }}
            >
              <Button variant={f.primary ? 'primary' : 'secondary'} size="md">
                {f.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 48,
          margin: '48px 0 0',
          flexWrap: 'wrap',
          fontSize: 13,
          color: '#888',
        }}
      >
        {[
          ['51', 'ký hiệu VSL'],
          ['100%', 'client-side AI'],
          ['QIPEDC', 'nguồn từ điển'],
        ].map(([num, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#ff385c' }}>{num}</div>
            <div>{label}</div>
          </div>
        ))}
      </div>
    </AppShell>
  )
}
