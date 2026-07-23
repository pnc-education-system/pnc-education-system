<script setup lang="ts">
defineOptions({ name: 'TrackingListPage' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudentsStore } from '@/stores/students'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import type { StudentStatus, Student } from '@/types'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import { studentsApi } from '@/services/api'
import { getCachedBatches, prefetchBatches, getFetchPromise } from '@/utils/batchesCache'

import {
  Search,
  UserCheck,
  XCircle,
  FileText,
  UserPlus,
  Eye,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Pencil,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const store = useStudentsStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()
const { t } = useI18n()
const hasExplicitBatchQuery = Object.prototype.hasOwnProperty.call(route.query, 'batch')

const batches = ref<SelectionBatch[]>([])
const selectedBatchId = ref<number | null>(parseOptionalNumber(route.query.batch))
const loadingBatches = ref(false)

const searchQuery = ref(getQueryString(route.query.search))
const statusFilter = ref<string>(getQueryString(route.query.status) || 'all')
const provinceFilter = ref<string>(getQueryString(route.query.province) || 'all')
const statusChangeId = ref<string | null>(null)
const statusChangeTarget = ref<StudentStatus>('enrolled')
const statusChangeNote = ref('')
const showDetailModal = ref(false)
const detailStudentObj = ref<Student | null>(null)
const selectedStudentIds = ref<Set<string>>(new Set())
const selectAllCheckbox = ref<HTMLInputElement | null>(null)

const showBulkStatusModal = ref(false)
const bulkStatusTarget = ref<StudentStatus>('enrolled')
const bulkStatusNote = ref('')
const isBulkUpdating = ref(false)

const showAddStudentModal = ref(false)
const isAddingStudent = ref(false)
const newStudent = ref({
  studentIdNo: '',
  fullName: '',
  gender: 'Male' as 'Male' | 'Female',
  dob: '',
  phone: '',
  email: '',
  province: '',
  highSchool: '',
  selectionBatchId: null as number | null,
  enrollmentStatus: 'Pending' as 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped',
  intakeYear: new Date().getFullYear(),
  enrolledAt: '',
})

const canManage = computed(() => authStore.hasPermission('students.edit'))
const canImport = computed(() => authStore.hasPermission('students.import'))

const filteredStudents = computed<Student[]>(() => {
  return store.students.filter(s => {
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.studentIdNo.toLowerCase().includes(q) ||
      (s.email && s.email.toLowerCase().includes(q))

    const matchesStatus = statusFilter.value === 'all' || s.status === statusFilter.value

    return matchesSearch && matchesStatus
  })
})

const isAllSelected = computed(() => {
  return filteredStudents.value.length > 0 && selectedStudentIds.value.size === filteredStudents.value.length
})

const isSomeSelected = computed(() => {
  return selectedStudentIds.value.size > 0 && selectedStudentIds.value.size < filteredStudents.value.length
})

const hasSelectedStudents = computed(() => selectedStudentIds.value.size > 0)
async function loadBatches() {
  loadingBatches.value = true
  try {
    const cached = getCachedBatches()
    if (cached) {
      batches.value = cached
      loadingBatches.value = false
    }

    if (!cached) {
      prefetchBatches()
      const inFlight = getFetchPromise()
      const data = inFlight ? await inFlight : await selectionBatchesApi.list()
      batches.value = data
    } else {
      prefetchBatches()
    }
    if (batches.value.length > 0 && !selectedBatchId.value && hasExplicitBatchQuery) {
      selectedBatchId.value = batches.value[0]?.id ?? null
    }
  } catch (error) {
    console.error('Failed to load batches:', error)
  } finally {
    loadingBatches.value = false
  }
}

function loadStudents(page = 1) {
  store.fetchAll({
    page,
    status: statusFilter.value,
    search: searchQuery.value || undefined,
    batch: selectedBatchId.value ?? undefined,
    province: provinceFilter.value || undefined,
  })
}

watch([selectedBatchId, statusFilter, provinceFilter], () => {
  loadStudents()
  selectedStudentIds.value.clear()
})

watch(searchQuery, () => {
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value)
  }
  searchDebounce.value = setTimeout(() => {
    loadStudents()
    selectedStudentIds.value.clear()
  }, 300)
})
watch([isAllSelected, isSomeSelected], () => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = isSomeSelected.value
  }
})

const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

onMounted(() => {
  loadBatches()
  loadStudents(parseOptionalNumber(route.query.page) ?? 1)
})
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedStudentIds.value.clear()
  } else {
    filteredStudents.value.forEach(student => {
      selectedStudentIds.value.add(student.id)
    })
  }
}

function toggleStudentSelection(studentId: string) {
  if (selectedStudentIds.value.has(studentId)) {
    selectedStudentIds.value.delete(studentId)
  } else {
    selectedStudentIds.value.add(studentId)
  }
}

function isStudentSelected(studentId: string): boolean {
  return selectedStudentIds.value.has(studentId)
}

function openBulkStatusModal() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast('Please select at least one student.', 'Selection Required')
    return
  }
  const selectedStudents = store.students.filter(s => selectedStudentIds.value.has(String(s.id)))
  const firstStudent = selectedStudents[0]
  if (firstStudent) {
    bulkStatusTarget.value = firstStudent.status
  }
  showBulkStatusModal.value = true
}

function closeBulkStatusModal() {
  showBulkStatusModal.value = false
  bulkStatusTarget.value = 'enrolled'
  bulkStatusNote.value = ''
}

async function executeBulkStatusUpdate() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast('Please select at least one student.', 'Selection Required')
    return
  }

  isBulkUpdating.value = true
  try {
    const ids = Array.from(selectedStudentIds.value).map(id => Number(id))
    const result = await studentsApi.bulkStatusUpdate(ids, bulkStatusTarget.value, bulkStatusNote.value)

    showSuccessToast(`Successfully updated status for ${result.updated_count} student(s).`, 'Bulk Update Complete')
    selectedStudentIds.value.clear()
    closeBulkStatusModal()
    loadStudents()
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = apiError?.response?.data?.message || apiError?.message || 'Failed to update student status.'
    showErrorToast(errorMessage, 'Error')
  } finally {
    isBulkUpdating.value = false
  }
}
const STATUS_STYLES = {
  pending:   { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  rejected:  { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  enrolled:  { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' },
  graduated: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6' },
  dropped:   { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
} as const

type StatusStyle = (typeof STATUS_STYLES)[keyof typeof STATUS_STYLES]

function getStatusStyle(status: string): StatusStyle {
  return STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.pending
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  rejected: 'Rejected',
  enrolled: 'Enrolled',
  graduated: 'Graduated',
  dropped: 'Dropped',
}

const provinces = [
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Phnom Penh',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Preah Sihanouk',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Otdar Meanchey',
  'Kep',
  'Pailin',
  'Tboung Khmum'
]

function confirmStatusChange(id: string, newStatus: StudentStatus) {
  statusChangeId.value = id
  statusChangeTarget.value = newStatus
}

function cancelStatusChange() {
  statusChangeId.value = null
  statusChangeTarget.value = 'enrolled'
  statusChangeNote.value = ''
}

async function executeStatusChange() {
  if (!statusChangeId.value) return
  const success = await store.updateStatus(statusChangeId.value, statusChangeTarget.value, statusChangeNote.value)
  if (success) {
    showSuccessToast(`Student status updated to ${statusChangeTarget.value} successfully.`, 'Status Updated')
  } else {
    showErrorToast('Failed to update student status.', 'Error')
  }
  statusChangeId.value = null
  statusChangeTarget.value = 'enrolled'
  statusChangeNote.value = ''
}

// ── Navigate to Profile Page ──
function openDetail(student: Student) {
  router.push({
    name: 'StudentProfile',
    params: { id: student.id },
  })
}

// ── Navigation ──
function navigateToImport() {
  router.push('/enrollment')
}

function openDetailModal(student: Student) {
  detailStudentObj.value = student
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  detailStudentObj.value = null
}


function openAddStudentModal() {
  showAddStudentModal.value = true
}

function closeAddStudentModal() {
  showAddStudentModal.value = false
  newStudent.value = {
    studentIdNo: '',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '',
    phone: '',
    email: '',
    province: '',
    highSchool: '',
    selectionBatchId: null as number | null,
    enrollmentStatus: 'Pending' as 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped',
    intakeYear: new Date().getFullYear(),
    enrolledAt: '',
  }
}

async function submitNewStudent() {
  if (!newStudent.value.studentIdNo || !newStudent.value.fullName) {
    showErrorToast('Student ID and Full Name are required.', 'Validation Error')
    return
  }

  isAddingStudent.value = true
  try {
    const payload: any = {
      student_id_no: newStudent.value.studentIdNo,
      full_name: newStudent.value.fullName,
      gender: newStudent.value.gender,
      dob: newStudent.value.dob,
      phone: newStudent.value.phone,
      email: newStudent.value.email,
      province: newStudent.value.province,
      high_school: newStudent.value.highSchool,
      enrollment_status: newStudent.value.enrollmentStatus,
      intake_year: newStudent.value.intakeYear,
      enrolled_at: newStudent.value.enrolledAt,
    }

    if (newStudent.value.selectionBatchId) {
      payload.selection_batch_id = newStudent.value.selectionBatchId
    }

    await studentsApi.create(payload)

    showSuccessToast('Student added successfully.', 'Success')
    closeAddStudentModal()
    loadStudents()
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = apiError?.response?.data?.message || apiError?.message || 'Failed to add student.'
    showErrorToast(errorMessage, 'Error')
  } finally {
    isAddingStudent.value = false
  }
}

function openEdit(student: Student) {
  router.push({
    name: 'StudentEdit',
    params: { id: student.id },
    query: getListQuery(),
  })
}

function getQueryString(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function parseOptionalNumber(value: unknown): number | null {
  const rawValue = getQueryString(value)
  if (!rawValue || rawValue === 'all') return null

  const numericValue = Number(rawValue)
  return Number.isFinite(numericValue) ? numericValue : null
}

function getListQuery(): Record<string, string> {
  return {
    batch: selectedBatchId.value === null ? 'all' : String(selectedBatchId.value),
    status: statusFilter.value,
    province: provinceFilter.value,
    ...(searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {}),
    page: String(store.currentPage || 1),
  }
}
const pageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const current = store.currentPage
  const last = store.lastPage
  const delta = 2

  if (last <= 7) {
    for (let i = 1; i <= last; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)

    if (current > delta + 3) {
      pages.push('...')
    }

    const start = Math.max(2, current - delta)
    const end = Math.min(last - 1, current + delta)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (current < last - delta - 2) {
      pages.push('...')
    }
    pages.push(last)
  }

  return pages
})
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function goToPage(page: number) {
  if (page < 1 || page > store.lastPage) return
  loadStudents(page)
}
</script>

<template>
  <div class="space-y-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">{{ t('students.title') }}</h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1 flex items-center gap-2">
          {{ t('students.subtitle') }}
          <span v-if="store.total > 0" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            {{ store.total }} Students
          </span>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="canManage && hasSelectedStudents"
          @click="openBulkStatusModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-sm shadow-emerald-500/20 cursor-pointer"
        >
          <RefreshCw :size="16" />
          Change Status ({{ selectedStudentIds.size }})
        </button>
        <button
          v-if="canImport"
          @click="navigateToImport"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {{ t('students.import') }}
        </button>
        <button
          v-if="canManage"
          @click="openAddStudentModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gray-800 rounded-xl hover:bg-gray-900 transition-all duration-200 cursor-pointer"
        >
          <UserPlus :size="16" />
          {{ t('students.add_student') }}
        </button>
      </div>
    </div>
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or Student ID..."
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div class="flex gap-2">
        <div class="relative">
          <Filter :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <select
            v-model="selectedBatchId"
            :disabled="loadingBatches || batches.length === 0"
            class="pl-10 pr-8 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
          >
            <option :value="null">All Batches</option>
            <option v-for="batch in batches" :key="batch.id" :value="batch.id">
              {{ batch.name }} ({{ batch.year }})
            </option>
          </select>
        </div>
        <select
          v-model="statusFilter"
          class="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <select
          v-model="provinceFilter"
          class="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[150px]"
        >
          <option value="all">{{ t('students.filter_province') }}</option>
          <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
        </select>
      </div>
    </div>
    <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 overflow-hidden" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <div v-if="store.loading" class="flex items-center justify-center py-16">
        <svg class="w-8 h-8 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      </div>

      <template v-if="!store.loading">
        <!-- Desktop Table Header -->
        <div class="hidden md:grid grid-cols-[repeat(15,minmax(0,1fr))] gap-4 px-6 py-3.5 bg-[#F8FAFC] dark:bg-white/[0.02] border-b border-[#E5E7EB] dark:border-gray-800">
          <div class="col-span-1 flex items-center">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Student ID</span>
          <span class="col-span-3 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Student Name</span>
          <span class="col-span-1 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Gender</span>
          <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('students.table_province') }}</span>
          <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Batch</span>
          <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Status</span>
          <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase text-right">Action</span>
        </div>

        <!-- Students List -->
        <div class="divide-y divide-[#E5E7EB] dark:divide-gray-800">
          <div
            v-for="student in filteredStudents"
            :key="student.id"
            class="group px-4 md:px-6 py-4 hover:bg-[#F9FAFB] transition-colors duration-150 dark:hover:bg-white/[0.02]"
          >
            <!-- Mobile Layout -->
            <div class="md:hidden space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    :checked="isStudentSelected(student.id)"
                    @change="toggleStudentSelection(student.id)"
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-white">{{ getInitials(student.fullName) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-[#111827] dark:text-white">{{ student.fullName }}</p>
                    <p class="text-xs font-mono text-[#6B7280] dark:text-gray-400">{{ student.studentIdNo }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  :style="{ backgroundColor: getStatusStyle(student.status).bg, color: getStatusStyle(student.status).text }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(student.status).dot }"></span>
                  {{ statusLabels[student.status] || student.status.charAt(0).toUpperCase() + student.status.slice(1) }}
                </span>
              </div>
              <div class="flex items-center gap-3 text-xs text-[#6B7280] dark:text-gray-400 pl-12">
                <span>{{ student.gender }}</span>
                <span>·</span>
                <span>{{ student.selectionBatchName || '—' }}</span>
                <span v-if="student.intakeYear">· {{ student.intakeYear }}</span>
              </div>
              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  @click="openDetail(student)"
                  class="group relative p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                  :title="t('students.action_view')"
                >
                  <Eye :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="canManage"
                  @click="openEdit(student)"
                  class="group relative p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-all duration-200 cursor-pointer dark:hover:bg-amber-500/10 dark:text-amber-400"
                  :title="t('students.action_edit')"
                >
                  <Pencil :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="student.status === 'pending' && canManage"
                  @click="confirmStatusChange(student.id, 'enrolled')"
                  class="group relative p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all duration-200 cursor-pointer dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                  title="Enroll"
                >
                  <UserCheck :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="student.status === 'pending' && canManage"
                  @click="confirmStatusChange(student.id, 'rejected')"
                  class="group relative p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Reject"
                >
                  <XCircle :size="16" class="transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>

            <!-- Desktop Layout -->
            <div class="hidden md:grid grid-cols-[repeat(15,minmax(0,1fr))] gap-4 items-center">
              <!-- Checkbox -->
              <div class="col-span-1">
                <input
                  type="checkbox"
                  :checked="isStudentSelected(student.id)"
                  @change="toggleStudentSelection(student.id)"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <!-- Student ID -->
              <div class="col-span-2">
                <span class="text-sm font-mono font-medium text-[#374151] dark:text-gray-200">{{ student.studentIdNo }}</span>
              </div>

              <!-- Student Name -->
              <div class="col-span-3 flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold text-white">{{ getInitials(student.fullName) }}</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-[#111827] dark:text-white">{{ student.fullName }}</p>
                  <p class="text-xs text-[#9CA3AF] dark:text-gray-500">{{ formatDate(student.createdAt) }}</p>
                </div>
              </div>

              <!-- Gender -->
              <div class="col-span-1">
                <span class="text-sm text-[#6B7280] dark:text-gray-400">{{ student.gender }}</span>
              </div>

              <!-- Province -->
              <div class="col-span-2">
                <span class="text-sm text-[#374151] dark:text-gray-300">{{ student.province || '—' }}</span>
              </div>

              <!-- Batch -->
              <div class="col-span-2">
                <span class="text-sm text-[#374151] dark:text-gray-300">{{ student.selectionBatchName || student.intakeYear || '—' }}</span>
                <span v-if="student.selectionBatchName && student.intakeYear" class="ml-1 text-xs text-[#9CA3AF]">({{ student.intakeYear }})</span>
              </div>

              <!-- Status -->
              <div class="col-span-2">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                  :style="{ backgroundColor: getStatusStyle(student.status).bg, color: getStatusStyle(student.status).text }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(student.status).dot }"></span>
                  {{ statusLabels[student.status] || student.status.charAt(0).toUpperCase() + student.status.slice(1) }}
                </span>
              </div>

              <!-- Action -->
              <div class="col-span-2 flex items-center justify-end gap-2">
                <button
                  @click="openDetail(student)"
                  class="group relative p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                  :title="t('students.action_view')"
                >
                  <Eye :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="canManage"
                  @click="openEdit(student)"
                  class="group relative p-2 rounded-lg text-amber-500 hover:bg-amber-50 transition-all duration-200 cursor-pointer dark:hover:bg-amber-500/10 dark:text-amber-400"
                  :title="t('students.action_edit')"
                >
                  <Pencil :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="student.status === 'pending' && canManage"
                  @click="confirmStatusChange(student.id, 'enrolled')"
                  class="group relative p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all duration-200 cursor-pointer dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                  title="Enroll"
                >
                  <UserCheck :size="16" class="transition-transform group-hover:scale-110" />
                </button>
                <button
                  v-if="student.status === 'pending' && canManage"
                  @click="confirmStatusChange(student.id, 'rejected')"
                  class="group relative p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Reject"
                >
                  <XCircle :size="16" class="transition-transform group-hover:scale-110" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredStudents.length === 0" class="py-16 text-center">
            <div class="flex flex-col items-center gap-3">
              <div class="w-16 h-16 rounded-[14px] bg-[#F8FAFC] dark:bg-gray-800 flex items-center justify-center">
                <FileText :size="32" class="text-[#9CA3AF] dark:text-gray-600" />
              </div>
              <p class="text-sm font-medium text-[#6B7280] dark:text-gray-400">
                {{ searchQuery || statusFilter !== 'all' ? 'No students match your filters' : 'No students yet' }}
              </p>
              <p class="text-xs text-[#9CA3AF] dark:text-gray-500">
                {{ searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Import student data to get started' }}
              </p>
              <button
                v-if="!searchQuery && statusFilter === 'all' && canImport"
                @click="navigateToImport"
                class="mt-2 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Import Students
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div
          v-if="store.lastPage > 1 && filteredStudents.length > 0"
          class="flex items-center justify-between px-6 py-3.5 border-t border-[#E5E7EB] dark:border-gray-800"
        >
          <p class="text-xs text-[#6B7280] dark:text-gray-400">
            Page {{ store.currentPage }} of {{ store.lastPage }} ({{ store.total }} total)
          </p>
          <div class="flex items-center gap-2">
            <!-- First Page -->
            <button
              :disabled="store.currentPage <= 1"
              @click="goToPage(1)"
              class="inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
              :class="store.currentPage <= 1 ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-[#F8FAFC] cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              title="First Page"
            >
              «
            </button>
            <!-- Previous -->
            <button
              :disabled="store.currentPage <= 1"
              @click="goToPage(store.currentPage - 1)"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
              :class="store.currentPage <= 1 ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-[#F8FAFC] cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
            >
              <ChevronLeft :size="14" />
              Previous
            </button>
            <!-- Page Numbers -->
            <div class="flex items-center gap-1">
              <button
                v-for="page in pageNumbers"
                :key="page"
                @click="typeof page === 'number' ? goToPage(page) : null"
                class="inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border transition-all duration-200"
                :class="page === '...'
                  ? 'border-transparent text-[#6B7280] cursor-default'
                  : page === store.currentPage
                    ? 'bg-blue-500 text-white border-blue-500 cursor-pointer'
                    : 'border-[#E5E7EB] text-[#374151] hover:bg-[#F8FAFC] cursor-pointer dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'"
              >
                {{ page }}
              </button>
            </div>
            <!-- Next -->
            <button
              :disabled="store.currentPage >= store.lastPage"
              @click="goToPage(store.currentPage + 1)"
              class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
              :class="store.currentPage >= store.lastPage ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-[#F8FAFC] cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
            >
              Next
              <ChevronRight :size="14" />
            </button>
            <!-- Last Page -->
            <button
              :disabled="store.currentPage >= store.lastPage"
              @click="goToPage(store.lastPage)"
              class="inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
              :class="store.currentPage >= store.lastPage ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-[#F8FAFC] cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              title="Last Page"
            >
              »
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Status Change Confirmation Modal -->
    <Teleport to="body">
      <div v-if="statusChangeId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="cancelStatusChange"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-bold text-[#111827] dark:text-white">Confirm Status Change</h3>
          <p class="text-sm text-[#6B7280] mt-2 dark:text-gray-400">
            Are you sure you want to change this student's status to
            <strong class="text-[#374151] dark:text-gray-200 capitalize">{{ statusChangeTarget }}</strong>?
          </p>
          <div class="mt-4">
            <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Note (optional)</label>
            <textarea
              v-model="statusChangeNote"
              rows="3"
              placeholder="Add a note about this status change..."
              class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none"
            ></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelStatusChange"
              class="px-4 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              @click="executeStatusChange"
              class="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer"
              :class="statusChangeTarget === 'rejected'
                ? 'bg-red-500 hover:bg-red-600'
                : statusChangeTarget === 'enrolled'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Student Detail Modal -->
    <Teleport to="body">
      <div v-if="showDetailModal && detailStudentObj" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeDetail"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-lg w-full p-6">
          <!-- Close button -->
          <button
            @click="closeDetail"
            class="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>

          <template v-if="detailStudentObj">
            <!-- Header -->
            <div class="flex items-center gap-4 mb-6">
              <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span class="text-lg font-bold text-white">{{ getInitials(detailStudentObj.fullName) }}</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-[#111827] dark:text-white">{{ detailStudentObj.fullName }}</h3>
                <p class="text-sm text-[#6B7280] dark:text-gray-400 font-mono">{{ detailStudentObj.studentIdNo }}</p>
              </div>
              <span
                class="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: getStatusStyle(detailStudentObj.status).bg, color: getStatusStyle(detailStudentObj.status).text }"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(detailStudentObj.status).dot }"></span>
                {{ statusLabels[detailStudentObj.status] || detailStudentObj.status.charAt(0).toUpperCase() + detailStudentObj.status.slice(1) }}
              </span>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <Calendar :size="12" />
                  <span>Date of Birth</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.dob ? formatDate(detailStudentObj.dob) : '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <MapPin :size="12" />
                  <span>Gender</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.gender }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <MapPin :size="12" />
                  <span>Province</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.province || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <Phone :size="12" />
                  <span>Phone</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.phone || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 col-span-2">
                <div class="flex items-center gap-2 text-xs text-gray-400 mb-1">
                  <Mail :size="12" />
                  <span>Email</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.email || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <GraduationCap :size="12" />
                  <span>Batch</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.selectionBatchName || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <Calendar :size="12" />
                  <span>Intake Year</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.intakeYear || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <FileText :size="12" />
                  <span>High School</span>
                </div>
                <p class="text-sm font-medium text-[#111827] dark:text-white">{{ detailStudentObj.highSchool || '—' }}</p>
              </div>
              <div class="p-3 rounded-xl bg-[#F8FAFC] dark:bg-gray-800/50">
                <div class="flex items-center gap-2 text-xs text-[#9CA3AF] mb-1">
                  <Clock :size="12" />
                  <span>Enrolled Date</span>
                </div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ detailStudentObj.enrolledAt ? formatDate(detailStudentObj.enrolledAt) : '—' }}</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end mt-6 pt-4 border-t border-[#E5E7EB] dark:border-gray-800">
              <button
                @click="closeDetail"
                class="px-5 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- Bulk Status Update Modal -->
    <Teleport to="body">
      <div v-if="showBulkStatusModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeBulkStatusModal"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-bold text-[#111827] dark:text-white">Bulk Status Update</h3>
          <p class="text-sm text-[#6B7280] mt-2 dark:text-gray-400">
            Update status for <strong>{{ selectedStudentIds.size }}</strong> selected student(s)
          </p>
          <div class="mt-4">
            <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">New Status</label>
            <select
              v-model="bulkStatusTarget"
              class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="pending">Pending</option>
              <option value="enrolled">Enrolled</option>
              <option value="rejected">Rejected</option>
              <option value="graduated">Graduated</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
          <div class="mt-4">
            <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Note (optional)</label>
            <textarea
              v-model="bulkStatusNote"
              rows="3"
              placeholder="Add a note about this status change..."
              class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none"
            ></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="closeBulkStatusModal"
              :disabled="isBulkUpdating"
              class="px-4 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              @click="executeBulkStatusUpdate"
              :disabled="isBulkUpdating"
              class="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw v-if="isBulkUpdating" :size="14" class="animate-spin" />
              {{ isBulkUpdating ? 'Updating...' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Student Modal -->
    <Teleport to="body">
      <div v-if="showAddStudentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeAddStudentModal"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-bold text-[#111827] dark:text-white">Add New Student</h3>
            <button
              @click="closeAddStudentModal"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Student ID -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Student ID *</label>
              <input
                v-model="newStudent.studentIdNo"
                type="text"
                placeholder="Enter student ID"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Full Name -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Full Name *</label>
              <input
                v-model="newStudent.fullName"
                type="text"
                placeholder="Enter full name"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Gender -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Gender</label>
              <select
                v-model="newStudent.gender"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <!-- Date of Birth -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Date of Birth</label>
              <input
                v-model="newStudent.dob"
                type="date"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Phone -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Phone</label>
              <input
                v-model="newStudent.phone"
                type="tel"
                placeholder="Enter phone number"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Email</label>
              <input
                v-model="newStudent.email"
                type="email"
                placeholder="Enter email address"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Province -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Province</label>
              <select
                v-model="newStudent.province"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select Province</option>
                <option v-for="province in provinces" :key="province" :value="province">{{ province }}</option>
              </select>
            </div>

            <!-- High School -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">High School</label>
              <input
                v-model="newStudent.highSchool"
                type="text"
                placeholder="Enter high school name"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Selection Batch -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Selection Batch</label>
              <select
                v-model="newStudent.selectionBatchId"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option :value="null">Select Batch</option>
                <option v-for="batch in batches" :key="batch.id" :value="batch.id">
                  {{ batch.name }} ({{ batch.year }})
                </option>
              </select>
            </div>

            <!-- Intake Year -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Intake Year</label>
              <input
                v-model="newStudent.intakeYear"
                type="number"
                placeholder="Enter intake year"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Enrolled Date -->
            <div>
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Enrolled Date</label>
              <input
                v-model="newStudent.enrolledAt"
                type="date"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Enrollment Status -->
            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-[#6B7280] dark:text-gray-400 mb-1">Enrollment Status</label>
              <select
                v-model="newStudent.enrollmentStatus"
                class="w-full px-3 py-2 bg-[#F8FAFC] dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Pending">Pending</option>
                <option value="Enrolled">Enrolled</option>
                <option value="Rejected">Rejected</option>
                <option value="Graduated">Graduated</option>
                <option value="Dropped">Dropped</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB] dark:border-gray-800">
            <button
              @click="closeAddStudentModal"
              :disabled="isAddingStudent"
              class="px-4 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              @click="submitNewStudent"
              :disabled="isAddingStudent"
              class="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="isAddingStudent" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ isAddingStudent ? 'Adding...' : 'Add Student' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
