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
  row: number
  student_id_no: string | null
  full_name: string | null
  province: string | null
  gender: string | null
  dob: string | null
  phone: string | null
  email: string | null
  high_school: string | null
  validation: string // 'ok' or error message
  status: string | null
  errors?: { field: string; message: string }[]
}

export interface ImportPreview {
  import_id: number
  file_name: string
  total_rows: number
  valid_count: number
  error_count: number
  rows: ImportPreviewRow[]
}

export interface ImportsMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export const importsApi = {
  async list(page = 1): Promise<{ data: ImportLog[]; meta: ImportsMeta }> {
    const { data } = await axiosInstance.get('/imports', { params: { page, per_page: 15 } })
    return { data: data.data, meta: data.meta }
  },

  async get(id: number): Promise<ImportLogDetail> {
    const { data } = await axiosInstance.get(`/imports/${id}`)
    return data.data as ImportLogDetail
  },

  async preview(file: File): Promise<ImportPreview> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await axiosInstance.post('/imports/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data as ImportPreview
  },

  async commit(importId: number): Promise<ImportLog> {
    const { data } = await axiosInstance.post(`/imports/${importId}/commit`)
    return data.data as ImportLog
  },

  async downloadErrors(id: number, fileName: string): Promise<void> {
    const response = await axiosInstance.get(`/imports/${id}/download-errors`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `errors_${fileName.replace(/\.[^.]+$/, '')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}
