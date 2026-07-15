import axiosInstance from '@/services/axios'
import type { BackendEnrollment, PaginatedData, CreateEnrollmentPayload, UpdateEnrollmentPayload } from '@/types'

export const enrollmentsApi = {
  async list(page = 1, params?: Record<string, string | number>): Promise<PaginatedData<BackendEnrollment>> {
    const { data } = await axiosInstance.get('/enrollments', { params: { page, ...params } })
    return data.data as PaginatedData<BackendEnrollment>
  },

  async get(id: number): Promise<BackendEnrollment> {
    const { data } = await axiosInstance.get(`/enrollments/${id}`)
    return data.data as BackendEnrollment
  },

  async create(payload: CreateEnrollmentPayload): Promise<BackendEnrollment> {
    const { data } = await axiosInstance.post('/enrollments', payload)
    return data.data as BackendEnrollment
  },

  async update(id: number, payload: UpdateEnrollmentPayload): Promise<BackendEnrollment> {
    const { data } = await axiosInstance.put(`/enrollments/${id}`, payload)
    return data.data as BackendEnrollment
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/enrollments/${id}`)
  },

  async bulkStatusUpdate(ids: number[], status: string): Promise<void> {
    await axiosInstance.post('/enrollments/bulk-status', { ids, status })
  },
}
