import axiosInstance from '@/services/axios'
import type { StudentRecord, StudentAttachment } from '@/types'

export interface CreateStudentRecordPayload {
  student_id: number
  title: string
  description: string
  record_type: 'academic' | 'disciplinary' | 'medical' | 'general'
  recorded_by?: number
  recorded_at?: string
}

export interface UpdateStudentRecordPayload {
  title?: string
  description?: string
  record_type?: 'academic' | 'disciplinary' | 'medical' | 'general'
  recorded_at?: string
}

function unwrapData<T>(data: unknown): T {
  const response = data as { data?: unknown }
  return (response.data ?? data) as T
}

/** Normalize a backend record so it always has a camelCase-friendly field `record_type`.
 *  Some backends return `category` instead of `record_type`. */
function normalizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  if (record.category !== undefined && record.record_type === undefined) {
    record.record_type = record.category
  }
  return record
}

function normalizeRecords(records: unknown[]): unknown[] {
  return records.map(r => normalizeRecord(r as Record<string, unknown>))
}

export const recordsApi = {
  async list(studentId: number): Promise<StudentRecord[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/records`)
    const records = unwrapData<unknown[]>(data)
    return normalizeRecords(records) as StudentRecord[]
  },

  async get(studentId: number, recordId: number): Promise<StudentRecord> {
    const { data } = await axiosInstance.get(`/students/${studentId}/records/${recordId}`)
    const record = unwrapData<Record<string, unknown>>(data)
    return normalizeRecord(record) as unknown as StudentRecord
  },

  async create(studentId: number, payload: CreateStudentRecordPayload): Promise<StudentRecord> {
    const body = {
      title: payload.title,
      description: payload.description || '',
      record_type: payload.record_type,
      category: payload.record_type,
      recorded_by: payload.recorded_by ?? 1,
      recorded_at: payload.recorded_at || new Date().toISOString().split('T')[0],
      // Also send record_date for direct backend compatibility
      record_date: payload.recorded_at ? payload.recorded_at.split('T')[0] : new Date().toISOString().split('T')[0],
    }

    try {
      const { data } = await axiosInstance.post(`/students/${studentId}/records`, body)
      const record = unwrapData<Record<string, unknown>>(data)
      return normalizeRecord(record) as unknown as StudentRecord
    } catch (error: any) {
      if (error?.response?.status === 422) {
        const responseData = error.response.data
        console.error('[recordsApi.create] Server error:', JSON.stringify(responseData, null, 2))
        console.error('[recordsApi.create] Sent body:', JSON.stringify(body))
        throw new Error(responseData?.error?.message || responseData?.message || JSON.stringify(responseData))
      }
      throw error
    }
  },

  async update(studentId: number, recordId: number, payload: UpdateStudentRecordPayload): Promise<StudentRecord> {
    const body: Record<string, unknown> = {}
    if (payload.title !== undefined) body.title = payload.title
    if (payload.description !== undefined) body.description = payload.description
    if (payload.record_type !== undefined) {
      body.record_type = payload.record_type
      body.category = payload.record_type
    }
    if (payload.recorded_at !== undefined) {
      body.recorded_at = payload.recorded_at
      body.record_date = payload.recorded_at.split('T')[0]
    }

    const { data } = await axiosInstance.put(`/students/${studentId}/records/${recordId}`, body)
    const record = unwrapData<Record<string, unknown>>(data)
    return normalizeRecord(record) as unknown as StudentRecord
  },

  async delete(studentId: number, recordId: number): Promise<void> {
    await axiosInstance.delete(`/students/${studentId}/records/${recordId}`)
  },

  async listAttachments(studentId: number): Promise<StudentAttachment[]> {
    const { data } = await axiosInstance.get(`/students/${studentId}/attachments`)
    return unwrapData<StudentAttachment[]>(data)
  },

  async uploadAttachment(studentId: number, payload: { student_id: number; record_id?: number | null; file: File }): Promise<StudentAttachment> {
    // Log file details for debugging
    console.log('[uploadAttachment] File details:', {
      name: payload.file?.name,
      type: payload.file?.type,
      size: payload.file?.size,
      studentId,
      recordId: payload.record_id,
    })

    const formData = new FormData()
    formData.append('student_id', String(payload.student_id))
    if (payload.record_id != null) {
      formData.append('record_id', String(payload.record_id))
    }
    formData.append('file', payload.file)

    // Try the primary endpoint first — let axios auto-set multipart boundary
    const endpoint = `/students/${studentId}/attachments`

    try {
      const { data } = await axiosInstance.post(endpoint, formData, {
        // ⚠️ Do NOT set Content-Type manually — axios will add the correct
        // multipart boundary automatically when sending FormData.
        // Manually setting it would strip the boundary and break the upload.
      })
      return unwrapData<StudentAttachment>(data)
    } catch (error: any) {
      // Fall back to the record-specific endpoint if the student-scoped one fails
      if (payload.record_id != null && [404, 405].includes(error?.response?.status)) {
        const fallbackEndpoint = `/records/${payload.record_id}/attachments`
        try {
          const { data } = await axiosInstance.post(fallbackEndpoint, formData)
          return unwrapData<StudentAttachment>(data)
        } catch { /* fall through */ }
      }

      // Enhance 422 errors with readable message
      if (error?.response?.status === 422) {
        const resp = error.response.data

        // Log FULL response for debugging
        console.error('[uploadAttachment] Full 422 response:', JSON.stringify(resp, null, 2))

        // Try to get the most specific error message possible
        // Middleware returns: { error: { code: 422, message: "...", errors: { file: ["File too large"] } } }
        const fieldErrors = resp?.error?.errors
        const firstFieldMsg = fieldErrors && Object.values(fieldErrors).flat()[0]

        // Also check root-level errors (unwrapped format)
        const rootErrors = resp?.errors
        const firstRootMsg = rootErrors && Object.values(rootErrors).flat()[0]

        const msg =
          firstFieldMsg ||          // Most specific: "Unsupported file type." or "File too large."
          firstRootMsg ||           // Fallback: root-level field errors
          resp?.error?.message ||   // Envelope message: "The given data was invalid."
          resp?.message ||          // Laravel default message
          'Validation failed'

        console.error('[uploadAttachment] Extracted error message:', msg)

        const enhanced = new Error(msg)
        enhanced.name = 'ValidationError'
        throw enhanced
      }
      throw error
    }
  },

  async deleteAttachment(studentId: number, attachmentId: number): Promise<void> {
    await axiosInstance.delete(`/students/${studentId}/attachments/${attachmentId}`)
  },
}
