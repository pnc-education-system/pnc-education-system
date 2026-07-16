import axiosInstance from '@/services/axios'

export interface SelectionBatch {
  id: number
  name: string
  year: number
<<<<<<< HEAD
}

export const selectionBatchesApi = {
  async list(): Promise<SelectionBatch[]> {
    console.log('Making GET request to /selection-batches')
    const { data } = await axiosInstance.get('/selection-batches')
    console.log('Raw API response data:', data)
    return data as SelectionBatch[]
=======
  description?: string
  created_by?: number
  created_at: string
  updated_at: string
  students_count?: number
  creator?: {
    id: number
    name: string
  }
}

export interface CreateBatchRequest {
  name: string
  year: number
}

export const selectionBatchesApi = {
  async list(year?: number): Promise<SelectionBatch[]> {
    const params = year ? { year } : {}
    const { data } = await axiosInstance.get('/selection-batches', { params })
    return data.data as SelectionBatch[]
>>>>>>> 3070163cdddbdbee51ed87b79488c1390a5fdc95
  },

  async get(id: number): Promise<SelectionBatch> {
    const { data } = await axiosInstance.get(`/selection-batches/${id}`)
    return data.data as SelectionBatch
  },

<<<<<<< HEAD
  async create(payload: { name: string; year: number; description?: string }): Promise<SelectionBatch> {
    const { data } = await axiosInstance.post('/selection-batches', payload)
    return data.data as SelectionBatch
  },

  async update(id: number, payload: { name?: string; year?: number; description?: string }): Promise<SelectionBatch> {
    const { data } = await axiosInstance.put(`/selection-batches/${id}`, payload)
    return data.data as SelectionBatch
  },

  async delete(id: number): Promise<void> {
    await axiosInstance.delete(`/selection-batches/${id}`)
  },
=======
  async create(request: CreateBatchRequest): Promise<SelectionBatch> {
    const { data } = await axiosInstance.post('/selection-batches', request)
    return data.data as SelectionBatch
  },
>>>>>>> 3070163cdddbdbee51ed87b79488c1390a5fdc95
}
