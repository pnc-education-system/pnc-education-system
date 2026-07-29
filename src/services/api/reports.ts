import axiosInstance from '@/services/axios'

export interface ReportSummary {
  total_students: number
  total_cards: number
  total_evaluations: number
  total_records: number
}

// ── Full dashboard aggregates (includes chart data) ──
export interface DashboardEnrollmentFlow {
  months: string[]
  submitted: number[]
  enrolled: number[]
}

export interface DashboardBatchGroup {
  batch_name: string
  year: number
  count: number
}

export interface DashboardAggregateData {
  demographics: {
    total_students: number
    by_enrollment_status: Record<string, number>
    by_gender: Record<string, number>
    by_province: Record<string, number>
    by_intake_year: Record<string, number>
  }
  card_stats: {
    total_cards: number
  }
  evaluation_stats: {
    total_evaluations: number
    average_score: number
    by_status: Record<string, number>
    by_period: Record<string, number>
    students_with_evaluations: number
  }
  record_summary: {
    total_records: number
    by_category: Record<string, number>
    recent_records_30_days: number
    students_with_records: number
  }
  enrollment_flow: DashboardEnrollmentFlow
  by_batch: DashboardBatchGroup[]
}

export const reportsApi = {
  /**
   * Get full dashboard aggregates including chart data (enrollment flow, batch breakdown, demographics).
   */
  async getFullAggregates(): Promise<DashboardAggregateData> {
    const { data } = await axiosInstance.get('/dashboard/aggregates')
    return data.data as DashboardAggregateData
  },

  /**
   * Download students as PDF via backend (the only backend-exported report type).
   */
  async downloadStudentsPdf(params?: {
    batch_id?: number
    status?: string
  }): Promise<Blob> {
    const { data } = await axiosInstance.get('/exports/students/pdf', {
      params: { ...(params ?? {}) },
      responseType: 'blob',
    })
    return data as Blob
  },

  /**
   * Download students as Excel via backend.
   */
  async downloadStudentsExcel(params?: {
    batch_id?: number
    status?: string
  }): Promise<Blob> {
    const { data } = await axiosInstance.get('/exports/students/excel', {
      params: { ...(params ?? {}) },
      responseType: 'blob',
    })
    return data as Blob
  },
}

export default reportsApi
