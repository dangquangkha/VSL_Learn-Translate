import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { lazy, Suspense } from 'react'
import { Spinner } from './components/ui/Spinner'

// EARS[FR-A01, FR-B01] — App root: Router + AuthProvider + lazy routes

// Lazy load pages để giảm initial bundle size
const HomePage      = lazy(() => import('./pages/HomePage'))
const LoginPage     = lazy(() => import('./pages/LoginPage'))
const RegisterPage  = lazy(() => import('./pages/RegisterPage'))
const TranslatePage = lazy(() => import('./pages/TranslatePage'))
const LearnPage     = lazy(() => import('./pages/LearnPage'))
const RecorderPage  = lazy(() => import('./pages/RecorderPage'))
const AdminPage     = lazy(() => import('./pages/AdminPage'))

function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spinner size={36} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"          element={<HomePage />} />
            <Route path="/login"     element={<LoginPage />} />
            <Route path="/register"  element={<RegisterPage />} />
            <Route path="/translate" element={<TranslatePage />} />

            {/* Protected routes — cần đăng nhập */}
            <Route
              path="/learn"
              element={
                <ProtectedRoute>
                  <LearnPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recorder"
              element={
                <ProtectedRoute>
                  <RecorderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
