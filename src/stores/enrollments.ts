import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { enrollmentsApi } from '@/services/api'
import type { Enrollment, BackendEnrollment, CreateEnrollmentPayload, UpdateEnrollmentPayload, EnrollmentStatus } from '@/types'

/** Map a backend enrollment to the frontend Enrollment format */
function mapBackendEnrollment(backend: BackendEnrollment): Enrollment {
  return {
    id: String(backend.id),
    studentName: backend.student_name,
    studentId: backend.student_id,
    program: backend.program,
    batch: backend.batch,
    academicYear: backend.academic_year,
    status: backend.status,
    submittedAt: backend.submitted_at,
    processedAt: backend.processed_at ?? undefined,
    processedBy: backend.processed_by ?? undefined,
    notes: backend.notes ?? undefined,
  }
}

export const useEnrollmentsStore = defineStore('enrollments', () => {
  const enrollments = ref<Enrollment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalEnrollments = computed(() => enrollments.value.length)
  const pendingCount = computed(() => enrollments.value.filter(e => e.status === 'pending').length)
  const approvedCount = computed(() => enrollments.value.filter(e => e.status === 'approved').length)
  const enrolledCount = computed(() => enrollments.value.filter(e => e.status === 'enrolled').length)
  const rejectedCount = computed(() => enrollments.value.filter(e => e.status === 'rejected').length)

  /** Fetch enrollments from the backend API */
  async function fetchAll(params?: { page?: number; status?: string; search?: string }) {
    loading.value = true
    error.value = null
    try {
      const paginated = await enrollmentsApi.list(params?.page || 1, {
        ...(params?.status && params.status !== 'all' ? { status: params.status } : {}),
        ...(params?.search ? { search: params.search } : {}),
      })
      enrollments.value = paginated.data.map(mapBackendEnrollment)
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number } }
      const status = apiErr?.response?.status
      if (status === 403) {
        enrollments.value = []
        error.value = null
        return
      }
      console.error('[enrollments store] fetchAll failed:', err)
      error.value = 'Failed to load enrollments from server.'
    } finally {
      loading.value = false
    }
  }

  function getById(id: string): Enrollment | undefined {
    return enrollments.value.find(e => e.id === id)
  }

  async function create(payload: CreateEnrollmentPayload): Promise<Enrollment> {
    const backend = await enrollmentsApi.create(payload)
    const mapped = mapBackendEnrollment(backend)
    enrollments.value.unshift(mapped)
    return mapped
  }

  async function update(id: string, updates: UpdateEnrollmentPayload): Promise<boolean> {
    const index = enrollments.value.findIndex(e => e.id === id)
    if (index === -1) return false

    const backend = await enrollmentsApi.update(Number(id), updates)
    enrollments.value[index] = mapBackendEnrollment(backend)
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const index = enrollments.value.findIndex(e => e.id === id)
    if (index === -1) return false

    try {
      await enrollmentsApi.delete(Number(id))
    } catch {
      // fall through to local delete
    }
    enrollments.value.splice(index, 1)
    return true
  }

  async function updateStatus(id: string, status: EnrollmentStatus): Promise<boolean> {
    return update(id, { status })
  }

  return {
    enrollments,
    loading,
    error,
    totalEnrollments,
    pendingCount,
    approvedCount,
    enrolledCount,
    rejectedCount,
    fetchAll,
    getById,
    create,
    update,
    remove,
    updateStatus,
  }
})
