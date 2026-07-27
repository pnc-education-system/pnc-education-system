import axiosInstance from '@/services/axios'

export type BackendReportType = 'enrollment' | 'student-list' | 'card' | 'eval' | 'incident'
export type ReportFormat = 'excel' | 'pdf'

export interface ReportTypeMeta {
  key: BackendReportType
  name: string
  description: string
  formats: ReportFormat[]
  filters: ReportFilter[]
}

export interface ReportFilter {
  key: string
  type: 'select' | 'text'
  label: string
  source?: string
  options?: string[]
}

export interface FilterSources {
  batches: Array<{ id: number; name: string; year: number }>
  templates: Array<{ id: number; name: string }>
  evaluation_forms: Array<{ id: number; name: string }>
}

export interface ReportGeneratePayload {
  type: BackendReportType
  format: ReportFormat
  filters?: {
    batch_id?: number
    status?: string
    search?: string
    province?: string
    template_id?: number
    form_id?: number
    category?: string
  }
}

export interface ReportGenerateResult {
  type: string
  format: string
  filename: string | null
  path: string | null
  url: string | null
}

export interface ReportSummary {
  total_students: number
  total_cards: number
  total_evaluations: number
  total_records: number
}

/**
 * Maps frontend report type names to backend report type keys.
 */
export function mapReportTypeToBackend(frontendType: string): BackendReportType {
  const mapping: Record<string, BackendReportType> = {
    enrollment: 'enrollment',
    'student-list': 'student-list',
    cards: 'card',
    evaluation: 'eval',
    incidents: 'incident',
  }
  return mapping[frontendType] || 'enrollment'
}

/**
 * Maps backend report type keys back to frontend type names.
 */
export function mapBackendToReportType(backendType: BackendReportType): string {
  const mapping: Record<BackendReportType, string> = {
    enrollment: 'enrollment',
    'student-list': 'student-list',
    card: 'cards',
    eval: 'evaluation',
    incident: 'incidents',
  }
  return mapping[backendType] || backendType
}

export const reportsApi = {
  /**
   * Get all supported report types with metadata.
   */
  async getTypes(): Promise<ReportTypeMeta[]> {
    const { data } = await axiosInstance.get('/reports/types')
    return data.data as ReportTypeMeta[]
  },

  /**
   * Get available filter source data (batches, templates, evaluation forms).
   */
  async getFilterSources(): Promise<FilterSources> {
    const { data } = await axiosInstance.get('/reports/filter-sources')
    return data.data as FilterSources
  },

  /**
   * Get summary stats for the dashboard/overview.
   */
  async getSummary(): Promise<ReportSummary> {
    const { data } = await axiosInstance.get('/reports/summary')
    return data.data as ReportSummary
  },

  /**
   * Generate a report in the specified format.
   * The backend saves the file and returns a URL for download.
   */
  async generate(payload: ReportGeneratePayload): Promise<ReportGenerateResult> {
    const { data } = await axiosInstance.post('/reports/generate', payload)
    return data.data as ReportGenerateResult
  },

  /**
   * Directly download a PDF report (streams to browser).
   * Returns the response as a Blob for client-side download.
   */
  async downloadPdf(payload: {
    type: BackendReportType
    filters?: ReportGeneratePayload['filters']
  }): Promise<Blob> {
    const { data } = await axiosInstance.get('/reports/download-pdf', {
      params: {
        type: payload.type,
        ...(payload.filters ? { filters: payload.filters } : {}),
      },
      responseType: 'blob',
    })
    return data as Blob
  },
}

export default reportsApi
