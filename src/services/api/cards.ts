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
  phone?: string | null
  email?: string | null
  high_school?: string | null
  qr_token?: string | null
}

export interface CardGenerationResult {
  student_id: number
  card_url?: string
  qr_data?: string
  status: 'success' | 'failed'
  error?: string
}

export interface StudentCard {
  id: number
  student_id: number
  qr_token: string
  issue_date: string
  expired_date: string
  manager_name?: string | null
  card_layout?: string | null
  generated_at?: string | null
  created_at: string
  updated_at: string
}

export interface StoreCardData {
  student_id: number
  issue_date?: string
  expired_date?: string
  manager_name?: string
  card_layout?: string
}

export interface QrResolveResult {
  student: CardStudent
  card: StudentCard | null
  valid: boolean
}

export interface VerifyResult {
  valid: boolean
  student?: CardStudent
  card?: StudentCard
  message?: string
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

  /** Store/Create a student card record */
  async store(cardData: StoreCardData): Promise<StudentCard> {
    const { data } = await axiosInstance.post('/student-cards', cardData)
    return (data.data ?? data) as StudentCard
  },

  /** Resolve QR token to get student and card information */
  async resolveQr(qrToken: string): Promise<QrResolveResult> {
    const { data } = await axiosInstance.get(`/student-cards/qr/${encodeURIComponent(qrToken)}`)
    if (data && data.success && data.data) {
      const studentData = data.data
      const firstCard = studentData.cards ? studentData.cards[0] : null
      return {
        valid: true,
        student: {
          id: studentData.id,
          student_id_no: studentData.student_id_no,
          full_name: studentData.full_name,
          gender: studentData.gender,
          photo_path: studentData.photo_path,
          dob: studentData.dob,
          province: studentData.province,
          selection_batch_name: studentData.selection_batch?.name || studentData.selection_batch_name || 'N/A',
          enrollment_status: studentData.enrollment_status,
          intake_year: studentData.intake_year,
          phone: studentData.phone,
          email: studentData.email,
          high_school: studentData.high_school,
          qr_token: studentData.qr_token,
        },
        card: firstCard ? {
          id: firstCard.id,
          student_id: firstCard.student_id,
          qr_token: firstCard.qr_token,
          issue_date: firstCard.issued_date || firstCard.issued_at,
          expired_date: firstCard.expired_date,
          created_at: firstCard.created_at,
          updated_at: firstCard.updated_at,
        } : null
      }
    }
    return {
      valid: false,
      student: {} as CardStudent,
      card: null
    }
  },

  /** Verify student card by QR token */
  async verify(qrToken: string): Promise<VerifyResult> {
    const { data } = await axiosInstance.get(`/student-cards/verify/${encodeURIComponent(qrToken)}`)
    if (data && data.success && data.data) {
      const studentData = data.data
      const firstCard = studentData.cards ? studentData.cards[0] : null
      return {
        valid: true,
        student: {
          id: studentData.id,
          student_id_no: studentData.student_id_no,
          full_name: studentData.full_name,
          gender: studentData.gender,
          photo_path: studentData.photo_path,
          dob: studentData.dob,
          province: studentData.province,
          selection_batch_name: studentData.selection_batch?.name || studentData.selection_batch_name || 'N/A',
          enrollment_status: studentData.enrollment_status,
          intake_year: studentData.intake_year,
          phone: studentData.phone,
          email: studentData.email,
          high_school: studentData.high_school,
          qr_token: studentData.qr_token,
        },
        card: firstCard ? {
          id: firstCard.id,
          student_id: firstCard.student_id,
          qr_token: firstCard.qr_token,
          issue_date: firstCard.issued_date || firstCard.issued_at,
          expired_date: firstCard.expired_date,
          created_at: firstCard.created_at,
          updated_at: firstCard.updated_at,
        } : undefined
      }
    }
    return {
      valid: false,
      message: data?.message || 'Invalid or expired QR token',
    }
  },
}
