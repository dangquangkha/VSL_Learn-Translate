import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import type { ReactNode } from 'react'

// EARS[FR-B01] — Bảo vệ route yêu cầu đăng nhập

interface ProtectedRouteProps {
  children: ReactNode
  /** role yêu cầu — mặc định chỉ cần đăng nhập */
  requiredRole?: 'USER' | 'ADMIN'
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole === 'ADMIN' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
