import axiosInstance from '@/services/axios'

export interface SelectionBatch {
  id: number
  name: string
  year: number
}

export const selectionBatchesApi = {
  async list(): Promise<SelectionBatch[]> {
    console.log('Making GET request to /selection-batches')
    const { data } = await axiosInstance.get('/selection-batches')
    console.log('Raw API response data:', data)
    return data as SelectionBatch[]
  },

  async get(id: number): Promise<SelectionBatch> {
    const { data } = await axiosInstance.get(`/selection-batches/${id}`)
    return data.data as SelectionBatch
  },

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
}
