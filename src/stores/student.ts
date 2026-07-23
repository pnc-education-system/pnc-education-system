import { defineStore } from 'pinia'
import { ref } from 'vue'
import { studentService, type BackendStudentDetail } from '@/services/student'

export const useStudentDetailStore = defineStore('studentDetail', () => {
  // State variables for student details, loading status, and errors
  const student = ref<BackendStudentDetail | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)

  /**
   * Action to fetch student information from the backend using the API service.
   * @param id The database ID of the student
   */
  async function fetchStudent(id: number | string) {
    loading.value = true
    error.value = null
    try {
      const data = await studentService.getStudent(id)
      student.value = data
    } catch (err: any) {
      console.error('Error fetching student details:', err)
      // Extract user-friendly error message from backend response if available
      error.value = err.response?.data?.message || 'Failed to load student identity details. Please check the ID or try again.'
      student.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    student,
    loading,
    error,
    fetchStudent,
  }
})
