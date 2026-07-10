import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface LoginResponse {
  status: string
  message: string
  user: {
    id: number
    name: string
    email: string
    role: string
  }
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  permissions: string[]
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  email: string
  token: string
  password: string
  password_confirmation: string
}

export interface PasswordResetResponse {
  status: string
  message: string
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    return response.data
  },

  async logout(): Promise<void> {
    const response = await api.post('/auth/logout')
    return response.data
  },

  async me(): Promise<LoginResponse> {
    const response = await api.get<LoginResponse>('/auth/me')
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  async requestPasswordReset(data: PasswordResetRequest): Promise<PasswordResetResponse> {
    const response = await api.post<PasswordResetResponse>('/auth/password/reset', data)
    return response.data
  },

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<PasswordResetResponse> {
    const response = await api.post<PasswordResetResponse>('/auth/password/reset/confirm', data)
    return response.data
  },
}

export default api
