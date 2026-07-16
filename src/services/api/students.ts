import axiosInstance from '@/services/axios'
import type { PaginatedData } from '@/types'

export interface Student {
  id: number
  student_id_no: string
  full_name: string
  gender: 'Male' | 'Female'
  dob: string | null
  phone: string | null
  email: string | null
  province: string | null
  high_school: string | null
  selection_batch_id: number
  enrollment_status: 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped'
  intake_year: number | null
  photo_path: string | null
  created_by: number
  created_at: string
  updated_at: string
  selection_batch?: {
    id: number
    name: string
  }
}

export interface CreateStudentPayload {
  student_id_no: string
  full_name: string
  gender: 'Male' | 'Female'
  dob?: string | null
  phone?: string | null
  email?: string | null
  province?: string | null
  high_school?: string | null
  selection_batch_id: number
  enrollment_status: 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped'
  intake_year?: number | null
  photo_path?: string | null
}

export interface UpdateStudentPayload {
  student_id_no?: string
  full_name?: string
  gender?: 'Male' | 'Female'
  dob?: string | null
  phone?: string | null
  email?: string | null
  province?: string | null
  high_school?: string | null
  selection_batch_id?: number
  enrollment_status?: 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped'
  intake_year?: number | null
  photo_path?: string | null
}

export const studentsApi = {
  async list(params?: {
    page?: number
    status?: string
    batch?: number
    province?: string
    search?: string
  }): Promise<PaginatedData<Student>> {
    const { data } = await axiosInstance.get('/students', { params })
    return data as PaginatedData<Student>
  },

  async get(id: number): Promise<Student> {
    const { data } = await axiosInstance.get(`/students/${id}`)
    return data.data as Student
  },

  async create(payload: CreateStudentPayload): Promise<Student> {
    const { data } = await axiosInstance.post('/students', payload)
    return data.data as Student
  },

  async update(id: number, payload: UpdateStudentPayload): Promise<Student> {
    const { data } = await axiosInstance.put(`/students/${id}`, payload)
    return data.data as Student
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/students/${id}`)
  },
}
