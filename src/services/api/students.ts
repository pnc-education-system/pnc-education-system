import axiosInstance from '@/services/axios'
import type { BackendStudent, StudentStatus, PaginatedData } from '@/types'

export type EnrollmentStatusValue = 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped'
export type StudentRecordCategory = 'general' | 'note' | 'incident' | 'achievement'

export interface StudentRecord {
  id: number
  student_id: number
  category: StudentRecordCategory
  title: string
  description: string
  record_date: string
  created_by: number | null
  created_at: string
  updated_at: string
  creator?: {
    id: number
    name: string
  } | null
}

export interface StudentActivity {
  id: string
  type: 'status_change' | 'record_update' | 'evaluation'
  title: string
  description: string
  performed_by: string
  date: string
}

export interface StudentRecordPayload {
  category: StudentRecordCategory
  title: string
  description: string
  record_date: string
}

export interface StudentFormPayload {
  student_id_no: string
  full_name: string
  gender: 'Male' | 'Female'
  dob: string | null
  phone: string | null
  email: string | null
  province: string | null
  high_school: string | null
  selection_batch_id: number
  enrollment_status: EnrollmentStatusValue
  intake_year: number | null
  enrolled_at?: string | null
  photo?: File | null
}

export type CreateStudentPayload = StudentFormPayload
export type UpdateStudentPayload = StudentFormPayload

function hasPhotoPayload(payload: UpdateStudentPayload): payload is UpdateStudentPayload {
  return 'photo' in payload && payload.photo instanceof File
}

function appendNullable(formData: FormData, key: string, value: string | number | null | undefined) {
  formData.append(key, value === null || value === undefined ? '' : String(value))
}

function toFormData(payload: UpdateStudentPayload): FormData {
  const formData = new FormData()

  appendNullable(formData, 'student_id_no', payload.student_id_no)
  appendNullable(formData, 'full_name', payload.full_name)
  appendNullable(formData, 'gender', payload.gender)
  appendNullable(formData, 'dob', payload.dob)
  appendNullable(formData, 'phone', payload.phone)
  appendNullable(formData, 'email', payload.email)
  appendNullable(formData, 'province', payload.province)
  appendNullable(formData, 'high_school', payload.high_school)
  appendNullable(formData, 'selection_batch_id', payload.selection_batch_id)
  appendNullable(formData, 'enrollment_status', payload.enrollment_status)
  appendNullable(formData, 'intake_year', payload.intake_year)
  appendNullable(formData, 'enrolled_at', payload.enrolled_at)

  if (payload.photo) {
    formData.append('photo', payload.photo)
  }

  return formData
}

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

  async create(payload: CreateStudentPayload): Promise<BackendStudent> {
    const { data } = await axiosInstance.post('/students', payload)
    return data.data as BackendStudent
  },

  async update(id: number, payload: UpdateStudentPayload): Promise<BackendStudent> {
    if (hasPhotoPayload(payload)) {
      const formData = toFormData(payload)
      const { data } = await axiosInstance.post(`/students/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return data.data as BackendStudent
    }
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

  async bulkStatusUpdate(ids: number[], status: StudentStatus, note?: string): Promise<{ updated_count: number; status: string }> {
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
    const { data } = await axiosInstance.post('/students/bulk-status', { 
      student_ids: ids, 
      status: backendStatus,
      note
    })
    return data.data as { updated_count: number; status: string }
  },

  async bulkConfirm(ids: number[]): Promise<{ confirmed_count: number }> {
    const { data } = await axiosInstance.post('/students/bulk-confirm', { 
      student_ids: ids
    })
    return data.data as { confirmed_count: number }
  },
  async listRecords(studentId: number): Promise<StudentRecord[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/records`)
    return data.data as StudentRecord[]
  },

  async createRecord(studentId: number, payload: StudentRecordPayload): Promise<StudentRecord> {
    const { data } = await axiosInstance.post(`/students/${studentId}/records`, payload)
    return data.data as StudentRecord
  },

  async updateRecord(studentId: number, recordId: number, payload: StudentRecordPayload): Promise<StudentRecord> {
    const { data } = await axiosInstance.put(`/students/${studentId}/records/${recordId}`, payload)
    return data.data as StudentRecord
  },

  async deleteRecord(studentId: number, recordId: number): Promise<void> {
    await axiosInstance.delete(`/students/${studentId}/records/${recordId}`)
  },

  async uploadPhoto(id: number, photo: File): Promise<{ photo_url: string }> {
    const formData = new FormData()
    formData.append('photo', photo)
    const { data } = await axiosInstance.post(`/students/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data.data as { photo_url: string }
  },

  async getHistory(id: number): Promise<StudentActivity[]> {
    const { data } = await axiosInstance.get(`/students/${id}/history`)
    return data.data as StudentActivity[]
  },
}
