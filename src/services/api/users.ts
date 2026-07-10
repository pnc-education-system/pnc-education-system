import axiosInstance from '@/services/axios'
import type { BackendUser, PaginatedData } from '@/types'

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role_id?: number | null
  is_active?: boolean
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  password?: string
  role_id?: number | null
  is_active?: boolean
}

export const usersApi = {
  async list(page = 1): Promise<PaginatedData<BackendUser>> {
    const { data } = await axiosInstance.get('/users', { params: { page } })
    return data.data as PaginatedData<BackendUser>
  },

  async get(id: number): Promise<BackendUser> {
    const { data } = await axiosInstance.get(`/users/${id}`)
    return data.data as BackendUser
  },

  async create(payload: CreateUserPayload): Promise<BackendUser> {
    const { data } = await axiosInstance.post('/users', payload)
    return data.data as BackendUser
  },

  async update(id: number, payload: UpdateUserPayload): Promise<BackendUser> {
    const { data } = await axiosInstance.put(`/users/${id}`, payload)
    return data.data as BackendUser
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/users/${id}`)
  },

  async toggle(id: number): Promise<boolean> {
    const { data } = await axiosInstance.patch(`/users/${id}/toggle`)
    return (data.data as { is_active: boolean }).is_active
  },
}
