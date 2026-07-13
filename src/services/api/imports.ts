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
    email: string
  } | null
  created_at: string
  updated_at: string
}

export interface ImportLogDetail extends ImportLog {
  errors: ImportError[]
}

export interface ImportsMeta {
  current_page: number
  per_page: number
  total: number
  last_page: number
}

export const importsApi = {
  async list(page = 1, status = ''): Promise<{ data: ImportLog[]; meta: ImportsMeta }> {
    const params: Record<string, string | number> = { page, per_page: 15 }
    if (status) params.status = status
    const { data } = await axiosInstance.get('/imports', { params })
    return { data: data.data, meta: data.meta }
  },

  async get(id: number): Promise<ImportLogDetail> {
    const { data } = await axiosInstance.get(`/imports/${id}`)
    return data.data as ImportLogDetail
  },

  async downloadErrors(id: number, fileName: string): Promise<void> {
    const detail = await importsApi.get(id)
    const errors = detail.errors

    if (!errors || errors.length === 0) return

    const rows = [
      ['Row', 'Field', 'Error Message'],
      ...errors.map(e => [String(e.row_number), e.field, e.error_message]),
    ]

    const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
