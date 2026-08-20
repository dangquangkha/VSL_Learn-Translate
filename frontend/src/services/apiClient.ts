import axios from 'axios'

// EARS[FR-B01] — API client dùng chung cho toàn bộ app, tự gắn JWT Bearer token

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// Request interceptor: tự gắn Authorization header từ localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('vsl_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: 401 → xóa token, redirect về /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vsl_token')
      localStorage.removeItem('vsl_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
