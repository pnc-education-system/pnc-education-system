import axiosInstance from '@/services/axios'

export interface ImportError {
  row_number: number
  field: string
  error_message: string
}

export interface ImportLog {
  id: number
  file_name: string
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed'
  total_rows: number
  success_count: number
  error_count: number
  selection_batch: {
    id: number
    name: string
    year: number
  } | null
  imported_by: {
    id: number
    name: string
  } | null
  created_at: string
  updated_at: string
}

export interface ImportLogDetail extends ImportLog {
  errors: ImportError[]
}

export interface ImportPreviewRow {
  student_id_no: string
  full_name: string
  gender: string
  dob: string
  selection_batch_id: string
  intake_year: string
  enrollment_status?: string
  province?: string
  phone?: string
  email?: string
  high_school?: string
}

export interface ImportValidationError {
  row: number
  data: Record<string, string>
  errors: Record<string, string[]>
}

export interface ImportValidation {
  validRows: ImportPreviewRow[]
  invalidRows: ImportValidationError[]
  summary: {
    total: number
    valid: number
    invalid: number
  }
}

export interface ImportPreview {
  import_log_id: number
  file_name: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  validation: ImportValidation
  rows: ImportPreviewRow[]
}

export interface ImportErrorsResponse {
  import_log_id: number
  file_name: string
  total_errors: number
  errors: ImportError[]
}

export interface ImportsMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export const importsApi = {
  async list(page = 1, status?: string): Promise<{ data: ImportLog[]; meta: ImportsMeta }> {
    const { data } = await axiosInstance.get('/imports', { params: { page, per_page: 15, status } })
    return { data: data.data, meta: data.meta }
  },

  async get(id: number): Promise<ImportLogDetail> {
    const { data } = await axiosInstance.get(`/imports/${id}`)
    return data.data as ImportLogDetail
  },

  async preview(file: File, selectionBatchId?: number): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    if (selectionBatchId) {
      formData.append('selection_batch_id', String(selectionBatchId))
    }
    const { data } = await axiosInstance.post('/imports', formData, {
      headers: {
        'Content-Type': undefined,
      },
    })
    return data.data as ImportPreview
  },

  async commit(importId: number, rows: any[], batchId?: number): Promise<ImportLog> {
    const payload: { rows: any[]; selection_batch_id?: number } = { rows }
    if (batchId) {
      payload.selection_batch_id = batchId
    }
    const { data } = await axiosInstance.post(`/imports/${importId}/commit`, payload)
    return data.data as ImportLog
  },

  async getErrors(id: number): Promise<ImportErrorsResponse> {
    const { data } = await axiosInstance.get(`/imports/${id}/errors`)
    return data.data as ImportErrorsResponse
  },

  async downloadErrors(id: number, fileName: string): Promise<void> {
    const { errors } = await this.getErrors(id)

    // Build CSV from error data
    const bom = '\uFEFF'
    const header = 'Row,Field,Error Message'
    const rows = errors.map((e) => `${e.row_number},"${e.field}","${e.error_message.replace(/"/g, '""')}"`).join('\n')
    const csvContent = bom + header + '\n' + rows + '\n'

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `errors_${fileName.replace(/\.[^.]+$/, '')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
