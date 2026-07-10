import axiosInstance from '@/services/axios'
import type { BackendRole, BackendPermission } from '@/types'

export interface CreateRolePayload {
  name: string
  slug?: string
  description?: string
  permissions?: string[]
}

export interface UpdateRolePayload {
  name?: string
  slug?: string
  description?: string
  permissions?: string[]
}

export const rolesApi = {
  async list(): Promise<BackendRole[]> {
    const { data } = await axiosInstance.get('/roles')
    return data.data as BackendRole[]
  },

  async get(id: number): Promise<BackendRole> {
    const { data } = await axiosInstance.get(`/roles/${id}`)
    return data.data as BackendRole
  },

  async create(payload: CreateRolePayload): Promise<BackendRole> {
    const { data } = await axiosInstance.post('/roles', payload)
    return data.data as BackendRole
  },

  async update(id: number, payload: UpdateRolePayload): Promise<BackendRole> {
    const { data } = await axiosInstance.put(`/roles/${id}`, payload)
    return data.data as BackendRole
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/roles/${id}`)
  },

  async permissions(): Promise<BackendPermission[]> {
    const { data } = await axiosInstance.get('/permissions')
    return data.data as BackendPermission[]
  },
}
