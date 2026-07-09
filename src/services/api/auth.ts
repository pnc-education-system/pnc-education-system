import axiosInstance from '@/services/axios'
import type { AuthResponse, LoginCredentials, User } from '@/types'

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async getProfile(): Promise<User> {
    const { data } = await axiosInstance.get<User>('/auth/me')
    return data
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async refresh(refreshToken: string) {
    const { data } = await axiosInstance.post('/auth/refresh', { refresh_token: refreshToken })
    return data
  },
}
