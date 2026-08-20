import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { authService, type AuthResponse } from '../services/authService'

// EARS[FR-B01] — JWT context cho toàn app

interface User {
  id: number
  email: string
  displayName: string
  role: 'USER' | 'ADMIN'
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser())

  const login = useCallback(async (email: string, password: string) => {
    const res: AuthResponse = await authService.login({ email, password })
    setUser(res.user)
  }, [])

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const res: AuthResponse = await authService.register({ email, password, displayName })
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
