import axiosInstance from '@/services/axios'

export interface CardStudent {
  id: number
  student_id_no: string
  full_name: string
  gender: string
  photo_path?: string | null
  dob?: string | null
  province?: string | null
  selection_batch_name?: string | null
  enrollment_status: string
  intake_year?: number | null
}

export interface CardGenerationResult {
  student_id: number
  card_url?: string
  qr_data?: string
  status: 'success' | 'failed'
  error?: string
}

export const cardsApi = {
  /** Get list of students eligible for card generation */
  async listEligible(params?: {
    page?: number
    batch?: number
    status?: string
    search?: string
  }): Promise<{ data: CardStudent[]; current_page: number; last_page: number; total: number }> {
    const { data } = await axiosInstance.get('/students', {
      params: { page: params?.page || 1, ...params },
    })
    return {
      data: (data.data ?? data) as CardStudent[],
      current_page: data.pagination?.current_page || 1,
      last_page: data.pagination?.last_page || 1,
      total: data.pagination?.total || 0,
    }
  },

  /** Generate a single student ID card */
  async generate(studentId: number): Promise<CardGenerationResult> {
    const { data } = await axiosInstance.post(`/cards/generate/${studentId}`)
    return data.data as CardGenerationResult
  },

  /** Batch generate ID cards for multiple students */
  async batchGenerate(studentIds: number[]): Promise<{ results: CardGenerationResult[] }> {
    const { data } = await axiosInstance.post('/cards/batch-generate', { student_ids: studentIds })
    return data.data as { results: CardGenerationResult[] }
  },

  /** Reprint ID cards */
  async reprint(studentIds: number[]): Promise<{ results: CardGenerationResult[] }> {
    const { data } = await axiosInstance.post('/cards/reprint', { student_ids: studentIds })
    return data.data as { results: CardGenerationResult[] }
  },

  /** Get card preview URL/data for a student */
  async preview(studentId: number): Promise<{ card_url: string; qr_data: string }> {
    const { data } = await axiosInstance.get(`/cards/preview/${studentId}`)
    return data.data as { card_url: string; qr_data: string }
  },

  /** Download card PDF */
  async downloadPdf(studentId: number): Promise<Blob> {
    const { data } = await axiosInstance.get(`/cards/download/${studentId}`, {
      responseType: 'blob',
    })
    return data as Blob
  },

  /** Download batch PDF */
  async batchDownloadPdf(studentIds: number[]): Promise<Blob> {
    const { data } = await axiosInstance.post(
      '/cards/batch-download',
      { student_ids: studentIds },
      { responseType: 'blob' },
    )
    return data as Blob
  },

  /** Get student details by student_id_no (public — used for QR verification) */
  async getByStudentIdNo(studentIdNo: string): Promise<CardStudent> {
    const { data } = await axiosInstance.get(`/students/verify/${encodeURIComponent(studentIdNo)}`)
    return (data.data ?? data) as CardStudent
  },
}
