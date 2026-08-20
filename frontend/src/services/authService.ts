import apiClient from './apiClient'

// EARS[FR-B01] — Auth service: login, register, logout

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  displayName?: string
}

export interface AuthResponse {
  token: string
  user: {
    id: number
    email: string
    displayName: string
    role: 'USER' | 'ADMIN'
  }
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', data)
    localStorage.setItem('vsl_token', res.data.token)
    localStorage.setItem('vsl_user', JSON.stringify(res.data.user))
    return res.data
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', data)
    localStorage.setItem('vsl_token', res.data.token)
    localStorage.setItem('vsl_user', JSON.stringify(res.data.user))
    return res.data
  },

  logout(): void {
    localStorage.removeItem('vsl_token')
    localStorage.removeItem('vsl_user')
  },

  getCurrentUser(): AuthResponse['user'] | null {
    const raw = localStorage.getItem('vsl_user')
    if (!raw) return null
    try {
      return JSON.parse(raw) as AuthResponse['user']
    } catch {
      return null
    }
  },

  getToken(): string | null {
    return localStorage.getItem('vsl_token')
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('vsl_token')
  },
}
