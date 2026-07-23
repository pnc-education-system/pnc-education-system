import axiosInstance from '@/services/axios'

/**
 * Interface representing the student details returned by the backend.
 */
export interface BackendStudentDetail {
  id: number
  student_id_no: string
  full_name: string
  gender: string
  dob: string | null
  phone: string | null
  email: string | null
  province: string | null
  high_school: string | null
  selection_batch_id: number
  enrollment_status: string
  photo_path: string | null
  intake_year: number | null
  created_by: number
  created_at: string
  updated_at: string
  qr_token: string | null
}

/**
 * Service to handle student API requests.
 */
export const studentService = {
  /**
   * Fetch student details by ID from the backend API.
   * @param id The student's database ID or student_id_no
   */
  async getStudent(id: number | string): Promise<BackendStudentDetail> {
    const { data } = await axiosInstance.get(`/students/${id}`)
    // The backend wraps the response in a 'data' property
    return data.data as BackendStudentDetail
  }
}
