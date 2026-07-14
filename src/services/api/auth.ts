import axiosInstance from '@/services/axios'
import type { AuthResponse, LoginCredentials, ProfileResponse, PasswordResetRequest, PasswordResetConfirm } from '@/types'

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await axiosInstance.post<AuthResponse>('/auth/login', credentials)
    return data
  },

  async getProfile(): Promise<ProfileResponse> {
    const { data } = await axiosInstance.get<ProfileResponse>('/auth/me')
    return data
  },

  async logout(): Promise<void> {
    await axiosInstance.post('/auth/logout')
  },

  async refresh(refreshToken: string) {
    const { data } = await axiosInstance.post('/auth/refresh', { refresh_token: refreshToken })
    return data
  },

  async requestPasswordReset(request: PasswordResetRequest) {
    const { data } = await axiosInstance.post('/auth/password/reset', request)
    return data
  },

  async resetPassword(request: PasswordResetConfirm) {
    const { data } = await axiosInstance.post('/auth/password/reset/confirm', request)
    return data
  },
}
