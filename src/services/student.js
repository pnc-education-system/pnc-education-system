import axiosInstance from '@/services/axios'

/**
 * Service to handle student API requests.
 */
export const studentService = {
  /**
   * Fetch student details by ID from the backend API.
   * @param {number|string} id The student's database ID or student_id_no
   */
  async getStudent(id) {
    const { data } = await axiosInstance.get(`/students/${id}`)
    // The backend wraps the response in a 'data' property
    return data.data
  }
}
