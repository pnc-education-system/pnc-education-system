import axiosInstance from '@/services/axios'
import type { ApiResponse } from '@/types'

export interface UpdateProfilePayload {
  name: string
  email: string
}

export const profileApi = {
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<{ user: Record<string, unknown> }>> {
    const { data } = await axiosInstance.put('/auth/profile', payload)
    return data
  },
}
