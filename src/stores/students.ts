import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { studentsApi } from '@/services/api'
import type { Student, BackendStudent, StudentStatus } from '@/types'

/** Map a backend student to the frontend Student format */
function mapBackendStudent(backend: BackendStudent): Student {
  return {
    id: String(backend.id),
    studentIdNo: backend.student_id_no,
    fullName: backend.full_name,
    gender: backend.gender,
    dob: backend.dob ?? '',
    province: backend.province ?? undefined,
    phone: backend.phone ?? undefined,
    email: backend.email ?? undefined,
    highSchool: backend.high_school ?? undefined,
    program: undefined,
    batch: undefined,
    intakeYear: backend.intake_year ? String(backend.intake_year) : undefined,
    selectionBatchId: backend.selection_batch_id ?? undefined,
    selectionBatchName: backend.selection_batch_name ?? undefined,
    status: ((backend.enrollment_status || backend.status || 'Pending') as string).toLowerCase() as StudentStatus,
    enrolledAt: undefined,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    importLogId: undefined,
  }
}

export const useStudentsStore = defineStore('students', () => {
  const students = ref<Student[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentPage = ref(1)
  const lastPage = ref(1)
  const total = ref(0)

  // ── Computed Stats ──
  const totalStudents = computed(() => total.value)
  const pendingCount = computed(() => students.value.filter(s => s.status === 'pending').length)
  const approvedCount = computed(() => students.value.filter(s => s.status === 'approved').length)
  const enrolledCount = computed(() => students.value.filter(s => s.status === 'enrolled').length)
  const inactiveCount = computed(() => students.value.filter(s => s.status === 'inactive').length)

  // ── Actions ──
  async function fetchAll(params?: { page?: number; status?: string; search?: string }) {
    loading.value = true
    error.value = null
    try {
      const paginated = await studentsApi.list(params?.page || 1, {
        ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
        ...(params?.search ? { search: params.search } : {}),
      })
      students.value = paginated.data.map(mapBackendStudent)
      currentPage.value = paginated.current_page
      lastPage.value = paginated.last_page
      total.value = paginated.total
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) {
        students.value = []
        error.value = null
        return
      }
      console.error('[students store] fetchAll failed:', err)
      error.value = 'Failed to load students from server.'
    } finally {
      loading.value = false
    }
  }

  function getById(id: string): Student | undefined {
    return students.value.find(s => s.id === id)
  }

  async function updateStatus(id: string, status: StudentStatus): Promise<boolean> {
    const index = students.value.findIndex(s => s.id === id)
    if (index === -1) return false

    try {
      const backend = await studentsApi.updateStatus(Number(id), status)
      students.value[index] = mapBackendStudent(backend)
      return true
    } catch {
      return false
    }
  }

  return {
    students,
    loading,
    error,
    currentPage,
    lastPage,
    total,
    totalStudents,
    pendingCount,
    approvedCount,
    enrolledCount,
    inactiveCount,
    fetchAll,
    getById,
    updateStatus,
  }
})
