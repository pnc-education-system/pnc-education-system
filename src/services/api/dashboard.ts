import axios from '../axios'

export interface BatchEnrollment {
  id: number
  batch: string
  year: number
  total: number
  pending: number
  enrolled: number
  rejected: number
}

export interface DashboardData {
  total: number
  pending: number
  enrolled: number
  rejected: number
  rate: number
  by_batch: BatchEnrollment[]
}

export const dashboardApi = {
  async getDashboardData(): Promise<DashboardData> {
    const response = await axios.get('/api/v1/dashboard/enrollment')
    return response.data
  }
}
