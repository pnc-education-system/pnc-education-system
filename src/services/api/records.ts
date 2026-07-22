import axiosInstance from '@/services/axios'
import type { StudentRecord, StudentAttachment } from '@/types'

export interface CreateStudentRecordPayload {
  student_id: number
  title: string
  description: string
  record_type: 'academic' | 'disciplinary' | 'medical' | 'general'
}

export interface UpdateStudentRecordPayload {
  title?: string
  description?: string
  record_type?: 'academic' | 'disciplinary' | 'medical' | 'general'
}

export const recordsApi = {
  async list(studentId: number): Promise<StudentRecord[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/records`)
    return (data.data ?? data) as StudentRecord[]
  },

  async get(studentId: number, recordId: number): Promise<StudentRecord> {
    const { data } = await axiosInstance.get(`/students/${studentId}/records/${recordId}`)
    return (data.data ?? data) as StudentRecord
  },

  async create(studentId: number, payload: CreateStudentRecordPayload): Promise<StudentRecord> {
    const { data } = await axiosInstance.post(`/students/${studentId}/records`, payload)
    return (data.data ?? data) as StudentRecord
  },

  async update(studentId: number, recordId: number, payload: UpdateStudentRecordPayload): Promise<StudentRecord> {
    const { data } = await axiosInstance.put(`/students/${studentId}/records/${recordId}`, payload)
    return (data.data ?? data) as StudentRecord
  },

  async delete(studentId: number, recordId: number): Promise<void> {
    await axiosInstance.delete(`/students/${studentId}/records/${recordId}`)
  },

  async listAttachments(studentId: number): Promise<StudentAttachment[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/attachments`)
    return (data.data ?? data) as StudentAttachment[]
  },

  async uploadAttachment(studentId: number, payload: { student_id: number; record_id?: number | null; file: File }): Promise<StudentAttachment> {
    const formData = new FormData()
    formData.append('student_id', String(payload.student_id))
    if (payload.record_id != null) {
      formData.append('record_id', String(payload.record_id))
    }
    formData.append('file', payload.file)
    const { data } = await axiosInstance.post(`/students/${studentId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (data.data ?? data) as StudentAttachment
  },

  async deleteAttachment(studentId: number, attachmentId: number): Promise<void> {
    await axiosInstance.delete(`/students/${studentId}/attachments/${attachmentId}`)
  },
}
