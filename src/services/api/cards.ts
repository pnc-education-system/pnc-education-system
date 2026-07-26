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
  selection_batch_id?: number | null
  enrollment_status: string
  intake_year?: number | null
  phone?: string | null
  email?: string | null
  high_school?: string | null
  qr_token?: string | null
}

export interface CardTemplate {
  id: number
  name: string
  layout_key: string | null
  layout_json: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface CardStats {
  total_generated: number
  total_templates: number
  total_students: number
  by_template: Array<{ id: number; name: string; count: number }>
}

export interface CardGenerationResult {
  student_id: number
  card_url?: string
  qr_data?: string
  status: 'success' | 'failed'
  error?: string
}

export interface BatchCardRequest {
  selection_batch_id: number
  template_id: number
}

export interface BatchCardResponse {
  status: string
  message: string
  data: {
    job_id: string
    selection_batch_id: number
    template_id: number
  }
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
  async generate(studentId: number, templateId?: number, layout?: string): Promise<CardGenerationResult> {
    const params: Record<string, string> = {}
    if (templateId) params.template_id = String(templateId)
    if (layout) params.layout = layout

    const { data } = await axiosInstance.post(`/cards/generate/${studentId}`, params)
    return data.data as CardGenerationResult
  },

  /** Batch generate ID cards for multiple students */
  async batchGenerateByIds(studentIds: number[]): Promise<{ results: CardGenerationResult[] }> {
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
  async downloadPdf(studentId: number, layout?: string): Promise<Blob> {
    const body: { layout?: string } = {}
    if (layout) body.layout = layout
    const { data } = await axiosInstance.post(`/cards/download/${studentId}`, body, {
      responseType: 'blob',
    })
    return data as Blob
  },  /** Download batch PDF */
  async batchDownloadPdf(studentIds: number[], layout?: string): Promise<Blob> {
    const { data } = await axiosInstance.post(
      '/cards/batch-download',
      { student_ids: studentIds, layout },
      { responseType: 'blob' },
    )
    return data as Blob
  },

  /** Get student details by student_id_no (public — used for QR verification) */
  async getByStudentIdNo(studentIdNo: string): Promise<CardStudent> {
    const { data } = await axiosInstance.get(`/student-cards/student/${encodeURIComponent(studentIdNo)}`)
    return (data.data ?? data) as CardStudent
  },

  /** Verify student by numeric ID (public — used for QR verification) */
  async verifyById(studentId: number): Promise<CardStudent> {
    const { data } = await axiosInstance.get(`/students/verify/${studentId}`)
    return (data.data ?? data) as CardStudent
  },

  /** Generate batch cards for a selection batch */
  async batchGenerate(request: BatchCardRequest): Promise<BatchCardResponse> {
    console.log('batchGenerate called with:', request)
    const { data } = await axiosInstance.post('/cards/batch', request)
    console.log('batchGenerate response:', data)
    return data as BatchCardResponse
  },

  /** Get available card templates */
  async getTemplates(): Promise<CardTemplate[]> {
    const { data } = await axiosInstance.get('/cards/templates')
    return data.data as CardTemplate[]
  },

  /** Get a single card template by ID */
  async getTemplate(id: number): Promise<CardTemplate> {
    const { data } = await axiosInstance.get(`/cards/templates/${id}`)
    return data.data as CardTemplate
  },

  /** Create a new card template */
  async createTemplate(payload: {
    name: string
    layout_key?: string
    layout_json: string
    is_default?: boolean
  }): Promise<CardTemplate> {
    const { data } = await axiosInstance.post('/cards/templates', payload)
    return data.data as CardTemplate
  },

  /** Update a card template */
  async updateTemplate(id: number, payload: {
    name?: string
    layout_key?: string
    layout_json?: string
    is_default?: boolean
  }): Promise<CardTemplate> {
    const { data } = await axiosInstance.put(`/cards/templates/${id}`, payload)
    return data.data as CardTemplate
  },

  /** Delete a card template */
  async deleteTemplate(id: number): Promise<void> {
    await axiosInstance.delete(`/cards/templates/${id}`)
  },

  /** Get card generation stats */
  async getStats(): Promise<CardStats> {
    const { data } = await axiosInstance.get('/cards/stats')
    return data.data as CardStats
  },

  /** Get students by batch for card generation */
  async getStudentsByBatch(batchId: number, filter?: 'all' | 'enrolled' | 'with_photo'): Promise<CardStudent[]> {
    const params: { batch_id: number; filter?: string } = { batch_id: batchId }
    if (filter) params.filter = filter
    const { data } = await axiosInstance.get('/cards/students-by-batch', { params })
    return data.data as CardStudent[]
  },

  /** Batch upload student photos */
  async batchUploadPhotos(photos: Array<{ student_id: number; file: File }>): Promise<{
    uploaded: Array<{ student_id: number; photo_path: string; url: string }>
    failed: Array<{ student_id: number; error: string }>
    total: number
    success_count: number
    failed_count: number
  }> {
    const formData = new FormData()
    photos.forEach((photo, index) => {
      formData.append(`photos[${index}][student_id]`, photo.student_id.toString())
      formData.append(`photos[${index}][file]`, photo.file)
    })

    const { data } = await axiosInstance.post('/cards/batch-upload-photos', formData, {
      headers: { 'Content-Type': undefined as unknown as string },
    })
    return data.data
  },
}
