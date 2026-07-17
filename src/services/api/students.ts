import axiosInstance from '@/services/axios'
import type { BackendStudent, StudentStatus, PaginatedData } from '@/types'

export const studentsApi = {
  async list(page = 1, params?: Record<string, string | number>): Promise<PaginatedData<BackendStudent>> {
    const { data } = await axiosInstance.get('/students', { params: { page, ...params } })
    return {
      data: data.data as BackendStudent[],
      current_page: data.pagination.current_page,
      last_page: data.pagination.last_page,
      per_page: data.pagination.per_page,
      total: data.pagination.total,
    }
  },

  async get(id: number): Promise<BackendStudent> {
    const { data } = await axiosInstance.get(`/students/${id}`)
    return data.data as BackendStudent
  },

  async update(id: number, payload: Partial<BackendStudent>): Promise<BackendStudent> {
    const { data } = await axiosInstance.put(`/students/${id}`, payload)
    return data.data as BackendStudent
  },

  async updateStatus(id: number, status: StudentStatus, note?: string): Promise<BackendStudent> {
    // Convert frontend lowercase status to backend capitalized format
    const statusMap: Record<StudentStatus, string> = {
      'pending': 'Pending',
      'approved': 'Pending', // Frontend 'approved' maps to backend 'Pending'
      'enrolled': 'Enrolled',
      'rejected': 'Rejected',
      'graduated': 'Graduated',
      'dropped': 'Dropped',
      'inactive': 'Pending', // Map inactive to pending for now
    }
    const backendStatus = statusMap[status] || 'Pending'
    const { data } = await axiosInstance.patch(`/students/${id}/status`, { status: backendStatus, note })
    return data.data.student as BackendStudent
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/students/${id}`)
  },

  async bulkStatusUpdate(ids: number[], status: StudentStatus): Promise<void> {
    await axiosInstance.post('/students/bulk-status', { ids, status })
  },
}
