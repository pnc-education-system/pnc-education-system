<script setup lang="ts">
defineOptions({ name: 'CardGeneratorPage' })

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
import { cardsApi, type CardStudent, type CardTemplate, type CardStats } from '@/services/api/cards'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import { getCachedBatches, prefetchBatches, getFetchPromise } from '@/utils/batchesCache'
import StudentCard from '@/components/cards/StudentCard.vue'

import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  X,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RotateCcw,
  Loader2,
} from 'lucide-vue-next'

// ── Data ──
const students = ref<CardStudent[]>([])
const loading = ref(false)
const loadingBatches = ref(false)
const batches = ref<SelectionBatch[]>([])
const selectedBatchId = ref<number | null>(null)
const searchQuery = ref('')
const currentPage = ref(1)
const lastPage = ref(1)
const totalStudents = ref(0)

// ── Selection ──
const selectedStudentIds = ref<Set<number>>(new Set())
const selectAllCheckbox = ref<HTMLInputElement | null>(null)

// ── Modals ──
const showPreviewModal = ref(false)
const previewStudent = ref<CardStudent | null>(null)
const generatedCards = ref<Set<number>>(new Set())

// ── Selected Student for Preview ──
const selectedStudent = ref<CardStudent | null>(null)

// ── Default Demo Student (shown when no student is selected) ──
const defaultDemoStudent: CardStudent = {
  id: 0,
  student_id_no: 'PNC2027-050',
  full_name: 'James Davis',
  gender: 'Male',
  photo_path: null,
  dob: '2005-06-15',
  province: 'Phnom Penh',
  selection_batch_name: 'Batch 2027',
  selection_batch_id: null,
  enrollment_status: 'enrolled',
  intake_year: 2025,
  phone: '+855 12 345 678',
  email: 'james.davis@example.com',
  high_school: 'Sisowath High School',
  qr_token: null,
}

// ── School Logo (persisted to localStorage) ──
const schoolLogoUrl = ref<string | null>(localStorage.getItem('card_school_logo'))

// ── Template Selection (persisted to localStorage) ──
// ── Templates & Stats (from API) ──
const dbTemplates = ref<CardTemplate[]>([])
const cardStats = ref<CardStats | null>(null)

const savedLayout = localStorage.getItem('card_template_preference')
const selectedLayout = ref<'classic' | 'modern' | 'premium' | 'corporate' | 'corporate-blue' | 'corporate-yellow' | 'official' | 'minimal' | 'creative' | 'tech'>(
  (savedLayout === 'classic' || savedLayout === 'modern' || savedLayout === 'premium' || savedLayout === 'corporate' || savedLayout === 'corporate-blue' || savedLayout === 'corporate-yellow' || savedLayout === 'official' || savedLayout === 'minimal' || savedLayout === 'creative' || savedLayout === 'tech') ? savedLayout : 'classic'
)

watch(selectedLayout, (val) => {
  localStorage.setItem('card_template_preference', val)
})

const templates = [
  {
    id: 'classic' as const,
    name: 'Classic',
    description: 'Traditional ID card with clean layout',
    popular: false,
  },
  {
    id: 'modern' as const,
    name: 'Modern',
    description: 'Contemporary design with gradient header',
    popular: true,
  },
  {
    id: 'premium' as const,
    name: 'Premium',
    description: 'Elegant dark design with gold accents',
    popular: false,
  },
  {
    id: 'corporate' as const,
    name: 'Corporate',
    description: 'Professional green branding design',
    popular: false,
  },
  {
    id: 'corporate-blue' as const,
    name: 'Corporate Blue',
    description: 'Professional blue branding design',
    popular: false,
  },
  {
    id: 'corporate-yellow' as const,
    name: 'Corporate Yellow',
    description: 'Professional yellow branding design',
    popular: false,
  },
  {
    id: 'official' as const,
    name: 'Official',
    description: 'Formal design with gold stripe',
    popular: false,
  },
  {
    id: 'minimal' as const,
    name: 'Minimal',
    description: 'Clean and simple gray design',
    popular: false,
  },
  {
    id: 'creative' as const,
    name: 'Creative',
    description: 'Vibrant purple gradient design',
    popular: false,
  },
  {
    id: 'tech' as const,
    name: 'Tech',
    description: 'Dark theme with cyan accents',
    popular: false,
  },
] as const

// ── Generation State ──
const isGenerating = ref(false)
const isBatchGenerating = ref(false)
const isReprinting = ref(false)
const generationProgress = ref(0)

// ── Card side toggle ──
const showCardBack = ref(false)

// ── Toast ──
const { showSuccessToast, showErrorToast } = useToast()

// ── Search Debounce ──
const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

// ── Status Filters ──
const statusFilter = ref<string>('all')
const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'pending', label: 'Pending' },
  { value: 'graduated', label: 'Graduated' },
]

// ── Computed ──
const isAllSelected = computed(
  () => students.value.length > 0 && selectedStudentIds.value.size === students.value.length,
)
const isSomeSelected = computed(
  () => selectedStudentIds.value.size > 0 && selectedStudentIds.value.size < students.value.length,
)
const hasSelectedStudents = computed(() => selectedStudentIds.value.size > 0)

const selectedCount = computed(() => selectedStudentIds.value.size)

// ── Current Layout Key for display ──
const currentLayoutKey = computed(() => selectedLayout.value)

// ── Show Preview Card Back ──
const showPreviewCardBack = computed(() => showCardBack.value)

// ── Live Preview Student (default demo or selected) ──
const livePreviewStudent = computed<CardStudent>(() => {
  return selectedStudent.value || defaultDemoStudent
})

function selectStudent(student: CardStudent) {
  if (selectedStudent.value?.id === student.id) {
    selectedStudent.value = null
  } else {
    selectedStudent.value = student
  }
}

// ── Functions ──
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
  } catch {
    batches.value = []
  } finally {
    loadingBatches.value = false
  }
}

async function loadStudents(page = 1) {
  loading.value = true
  try {
    const result = await cardsApi.listEligible({
      page,
      batch: selectedBatchId.value ?? undefined,
      status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
      search: searchQuery.value || undefined,
    })
    students.value = result.data
    currentPage.value = result.current_page
    lastPage.value = result.last_page
    totalStudents.value = result.total
  } catch (err: unknown) {
    const apiErr = err as { response?: { status?: number } }
    if (apiErr?.response?.status !== 403) {
      showErrorToast(t('card_gen.loading_students'), t('users.toast_error'))
    }
    students.value = []
  } finally {
    loading.value = false
  }
}

watch([selectedBatchId, statusFilter], () => {
  selectedStudentIds.value.clear()
  loadStudents()
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

// Sync indeterminate state for select-all checkbox
watch([isAllSelected, isSomeSelected], () => {
  nextTick(() => {
    if (selectAllCheckbox.value) {
      selectAllCheckbox.value.indeterminate = isSomeSelected.value
    }
  })
})

// ── Selection ──
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedStudentIds.value.clear()
  } else {
    students.value.forEach((s) => selectedStudentIds.value.add(s.id))
  }
}

function toggleStudent(id: number) {
  if (selectedStudentIds.value.has(id)) {
    selectedStudentIds.value.delete(id)
  } else {
    selectedStudentIds.value.add(id)
  }
}

// ── Card Generation ──
async function handleGenerate(studentId: number) {
  isGenerating.value = true
  try {
    const result = await cardsApi.generate(studentId)
    if (result.status === 'success') {
      generatedCards.value.add(studentId)
      // Update the student with the QR token from the response
      const student = students.value.find((s) => s.id === studentId)
      if (student && result.qr_data) {
        student.qr_token = result.qr_data
      }
      showSuccessToast(t('card_gen.gen_card_for', { name: students.value.find((s) => s.id === studentId)?.full_name || 'student' }), t('card_gen.card_generated'))
    } else {
      showErrorToast(result.error || t('cards.toast_generate_failed'), t('cards.toast_generate_failed_title'))
    }
  } catch (error: unknown) {
    console.error('Card generation error:', error)
    // Try to extract meaningful error from axios error response
    const err = error as { response?: { data?: { error?: { message?: string } | string; message?: string } }; message?: string }
    const serverMsg =
      err?.response?.data?.error?.message ||
      (typeof err?.response?.data?.error === 'string' ? err?.response?.data?.error : null) ||
      err?.response?.data?.message ||
      err?.message
    const displayMsg = serverMsg || t('cards.toast_generate_failed')
    showErrorToast(displayMsg, t('cards.toast_generate_failed_title'))
  } finally {
    isGenerating.value = false
  }
}

async function handleBatchGenerate() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast(t('card_gen.select_required'), t('cards.selection_required_title'))
    return
  }

  isBatchGenerating.value = true
  generationProgress.value = 0
  try {
    const ids = Array.from(selectedStudentIds.value)
    const result = await cardsApi.batchGenerate(ids)

    let successCount = 0
    result.results.forEach((r) => {
      if (r.status === 'success') {
        generatedCards.value.add(r.student_id)
        successCount++
      }
    })

    showSuccessToast(
      t('card_gen.batch_gen_complete', { success: successCount, total: ids.length }),
      t('cards.toast_batch_generated_title'),
    )

    selectedStudentIds.value.clear()
    generationProgress.value = 100
  } catch (err: unknown) {
    const apiErr = err as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = apiErr?.response?.data?.message || apiErr?.message || t('cards.toast_generate_failed')
    showErrorToast(errorMessage, t('cards.toast_generate_failed_title'))
  } finally {
    isBatchGenerating.value = false
    generationProgress.value = 0
  }
}

async function handleReprint(studentId: number) {
  isReprinting.value = true
  try {
    const result = await cardsApi.reprint([studentId])
    if (result.results[0]?.status === 'success') {
      showSuccessToast(t('cards.toast_reprint_initiated'), t('cards.toast_reprint_title'))
    } else {
      showErrorToast(result.results[0]?.error || t('cards.toast_generate_failed'), 'Reprint Failed')
    }
  } catch {
    showErrorToast(t('cards.toast_generate_failed'), 'Reprint Failed')
  } finally {
    isReprinting.value = false
  }
}

async function handleBatchReprint() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast(t('card_gen.select_required'), t('cards.selection_required_title'))
    return
  }

  isReprinting.value = true
  try {
    const ids = Array.from(selectedStudentIds.value)
    const result = await cardsApi.reprint(ids)

    const successCount = result.results.filter((r) => r.status === 'success').length
    showSuccessToast(
      t('card_gen.batch_reprint', { success: successCount, total: ids.length }),
      t('cards.toast_batch_reprint_title'),
    )
    selectedStudentIds.value.clear()
  } catch {
    showErrorToast(t('cards.toast_generate_failed'), 'Batch Reprint Failed')
  } finally {
    isReprinting.value = false
  }
}

async function handleDownload(studentId: number) {
  try {
    const blob = await cardsApi.downloadPdf(studentId)
    const student = students.value.find((s) => s.id === studentId)
    const filename = `ID_Card_${student?.student_id_no || studentId}.pdf`
    downloadBlob(blob, filename)
    showSuccessToast(t('card_gen.download_complete'), t('cards.toast_downloaded_title'))
  } catch (error) {
    console.error('Download error:', error)
    showErrorToast(t('cards.toast_generate_failed'), 'Download Failed')
  }
}

async function handleBatchDownload() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast(t('card_gen.select_required'), t('cards.selection_required_title'))
    return
  }

  try {
    const ids = Array.from(selectedStudentIds.value)
    const blob = await cardsApi.batchDownloadPdf(ids)
    downloadBlob(blob, `ID_Cards_Batch_${Date.now()}.pdf`)
    showSuccessToast(t('card_gen.download_complete'), t('cards.toast_downloaded_title'))
    selectedStudentIds.value.clear()
  } catch {
    showErrorToast(t('cards.toast_generate_failed'), 'Download Failed')
  }
}

// ── Preview ──
function openPreview(student: CardStudent) {
  previewStudent.value = student
  showPreviewModal.value = true
}

function closePreview() {
  showPreviewModal.value = false
  previewStudent.value = null
}

function handlePhotoUpload() {
  showSuccessToast(t('card_gen.photo_updated'), 'Photo Updated')
}

function handleLogoUpload(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    schoolLogoUrl.value = dataUrl
    localStorage.setItem('card_school_logo', dataUrl)
    showSuccessToast(t('card_gen.logo_updated'), 'Logo Updated')
  }
  reader.readAsDataURL(file)
}

// ── Helpers ──
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; dot: string }> = {
    enrolled: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' },
    pending: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    graduated: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6' },
    rejected: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
    dropped: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  }
  return styles[status] || styles.pending
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Pagination ──
function goToPage(page: number) {
  if (page < 1 || page > lastPage.value) return
  loadStudents(page)
}

const pageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const current = currentPage.value
  const last = lastPage.value

  if (last <= 7) {
    for (let i = 1; i <= last; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 4) pages.push('...')
    const start = Math.max(2, current - 1)
    const end = Math.min(last - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < last - 3) pages.push('...')
    pages.push(last)
  }
  return pages
})

// ── Clear Selection ──
function clearSelectedStudent() {
  if (!selectedStudent.value) return
  const name = selectedStudent.value.full_name
  selectedStudent.value = null
  showSuccessToast(t('card_gen.select_hint'), 'Selection Cleared')
}

// ── API Data ──
async function fetchTemplates() {
  try {
    dbTemplates.value = await cardsApi.getTemplates()
  } catch {
    dbTemplates.value = []
  }
}

async function fetchStats() {
  try {
    cardStats.value = await cardsApi.getStats()
  } catch {
    cardStats.value = null
  }
}

// ── Keyboard Shortcuts ──
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    clearSelectedStudent()
  }
}

onMounted(() => {
  loadBatches()
  loadStudents()
  fetchTemplates()
  fetchStats()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value)
  }
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ t('card_gen.title') }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t('card_gen.subtitle') }}
          <span
            v-if="totalStudents > 0"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          >
            {{ t('card_gen.students_count', { count: totalStudents }) }}
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Current Template Badge -->
        <div class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
          <span class="w-2 h-2 rounded-full"
            :class="selectedLayout === 'classic' ? 'bg-blue-500' : selectedLayout === 'modern' ? 'bg-indigo-500' : 'bg-amber-500'"
          ></span>
          <span class="capitalize font-semibold">{{ selectedLayout }}</span>
          <span class="text-gray-300 dark:text-gray-600">|</span>
          <span class="text-gray-400">{{ t('card_gen.template') }}</span>
        </div>

        <!-- Batch Actions -->
        <template v-if="hasSelectedStudents">
          <button
            @click="handleBatchGenerate"
            :disabled="isBatchGenerating"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2 v-if="isBatchGenerating" :size="15" class="animate-spin" />
            <CreditCard v-else :size="15" />
            Generate ({{ selectedCount }})
          </button>
          <button
            @click="handleBatchReprint"
            :disabled="isReprinting"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 border border-amber-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20 dark:hover:bg-amber-500/20"
          >
            <RotateCcw :size="15" />
            Reprint ({{ selectedCount }})
          </button>
          <button
            @click="handleBatchDownload"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-150 cursor-pointer"
          >
            <Download :size="15" />
            PDF ({{ selectedCount }})
          </button>
        </template>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-2.5">
        <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('card_gen.total_students') }}</p>
        <p class="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{{ totalStudents }}</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-2.5">
        <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('card_gen.selected') }}</p>
        <p class="text-lg font-bold text-emerald-600 mt-0.5">{{ selectedCount }}</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-2.5">
        <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('card_gen.generated') }}</p>
        <p class="text-lg font-bold text-blue-600 mt-0.5">
          {{ generatedCards.size }}
          <span v-if="cardStats && cardStats.total_generated > generatedCards.size" class="text-[9px] font-normal text-gray-400 ml-1">
            ({{ cardStats.total_generated }} total)
          </span>
        </p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-2.5">
        <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('card_gen.templates') }}</p>
        <p class="text-lg font-bold mt-0.5" :class="dbTemplates.length > 0 ? 'text-emerald-600' : 'text-gray-400'">
          {{ dbTemplates.length }}
          <span class="text-[9px] font-normal text-gray-400 ml-1">{{ t('card_gen.available') }}</span>
        </p>
      </div>
    </div>

    <!-- Card Designer - Unified card preview + template picker -->
    <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
        <CreditCard :size="14" class="text-gray-400" />
        <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ t('card_gen.card_designer') }}</h3>
        <div class="flex-1"></div>
        <!-- Front / Back Toggle -->
        <div class="flex items-center gap-0.5 bg-gray-200/70 dark:bg-gray-700/50 rounded-lg p-0.5 mr-2">
          <button
            @click="showCardBack = false"
            class="px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all duration-150 cursor-pointer"
            :class="!showCardBack ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >{{ t('card_gen.front') }}</button>
          <button
            @click="showCardBack = true"
            class="px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all duration-150 cursor-pointer"
            :class="showCardBack ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          >{{ t('card_gen.back') }}</button>
        </div>          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">{{ currentLayoutKey }}</span>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 p-3">
        <!-- Preview Card -->
        <div class="flex-shrink-0 flex justify-center">
          <StudentCard
            :student="livePreviewStudent"
            :layout="currentLayoutKey"
            size="sm"
            :generated="selectedStudent ? generatedCards.has(selectedStudent.id) : false"
            :showBack="showCardBack"
            :schoolLogo="schoolLogoUrl"
            @photo-upload="handlePhotoUpload"
            @logo-upload="handleLogoUpload"
          />
        </div>

        <!-- Right side -->
        <div class="flex-1 flex flex-col gap-2 min-w-0">
          <!-- Template Tabs -->
          <div>
            <p class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Template</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tpl in templates"
                :key="tpl.id"
                @click="selectedLayout = tpl.id"
                class="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all duration-200 cursor-pointer border"
                :class="selectedLayout === tpl.id
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="tpl.id === 'classic' ? 'bg-blue-500' : tpl.id === 'modern' ? 'bg-indigo-500' : 'bg-amber-500'"></span>
                <span class="font-semibold">{{ tpl.name }}</span>
                <span v-if="tpl.popular && selectedLayout !== tpl.id" class="text-[8px] text-indigo-400">★</span>
                <span v-if="selectedLayout === tpl.id" class="text-blue-600 dark:text-blue-400">✓</span>
              </button>
            </div>
          </div>

          <!-- Student Info -->
          <template v-if="selectedStudent">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Student</p>
                <p class="text-xs font-bold text-gray-900 dark:text-white truncate">{{ livePreviewStudent.full_name }}</p>
                <p class="text-[10px] font-mono text-gray-400 truncate">{{ livePreviewStudent.student_id_no }}</p>
              </div>
              <button
                @click="clearSelectedStudent()"
                class="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150 cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-500/20 mt-0.5"
                title="Clear selection, show default card"
              >
                <X :size="12" />
                Clear
              </button>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                :style="{ backgroundColor: getStatusStyle(livePreviewStudent.enrollment_status).bg, color: getStatusStyle(livePreviewStudent.enrollment_status).text }">
                <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: getStatusStyle(livePreviewStudent.enrollment_status).dot }"></span>
                {{ livePreviewStudent.enrollment_status.charAt(0).toUpperCase() + livePreviewStudent.enrollment_status.slice(1) }}
              </span>
              <span v-if="livePreviewStudent.selection_batch_name" class="text-[9px] text-gray-400">{{ livePreviewStudent.selection_batch_name }}</span>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <CreditCard :size="12" class="text-gray-300" />
              </div>
              <p class="text-[10px] text-gray-400">Select a student below to preview</p>
            </div>
          </template>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1 pt-1.5 mt-auto border-t border-gray-100 dark:border-gray-700/50">
            <button v-if="selectedStudent" @click="openPreview(livePreviewStudent)"
              class="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors cursor-pointer dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20">
              <Eye :size="11" />
              Details
            </button>
            <button v-if="selectedStudent" @click="handleGenerate(livePreviewStudent.id)" :disabled="isGenerating"
              class="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-emerald-600 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors cursor-pointer dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <CreditCard :size="11" />
              {{ generatedCards.has(livePreviewStudent.id) ? 'Regen' : 'Generate' }}
            </button>
            <button v-if="selectedStudent" @click="handleDownload(livePreviewStudent.id)"
              class="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-semibold text-gray-500 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700">
              <Download :size="11" />
              PDF
            </button>
            <div class="flex-1"></div>
            <span v-if="selectedStudent && generatedCards.has(selectedStudent.id)" class="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-600">
              <CheckCircle :size="10" />
              Generated
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-2">
      <div class="relative flex-1">
        <Search :size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="searchQuery" type="text" placeholder="Search by name or ID..."
          class="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20" />
      </div>
      <div class="flex gap-1.5">
        <div class="relative">
          <Filter :size="13" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <select v-model="selectedBatchId" :disabled="loadingBatches || batches.length === 0"
            class="pl-8 pr-7 py-1.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50 appearance-none min-w-[130px]">
            <option :value="null">All Batches</option>
            <option v-for="batch in batches" :key="batch.id" :value="batch.id">{{ batch.name }} ({{ batch.year }})</option>
          </select>
          <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="relative">
          <select v-model="statusFilter"
            class="px-2.5 pr-7 py-1.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20 cursor-pointer appearance-none">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <svg class="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <button @click="loadStudents()" class="px-2 py-1.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer dark:hover:bg-gray-800" title="Refresh">
          <RefreshCw :size="13" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Students Table -->
    <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="flex flex-col items-center gap-2">
          <Loader2 :size="28" class="text-blue-500 animate-spin" />
          <p class="text-sm text-gray-400">Loading students...</p>
        </div>
      </div>

      <template v-if="!loading">
        <!-- Table Header -->
        <div class="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
          <div class="col-span-1 flex items-center">
            <input ref="selectAllCheckbox" type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
          </div>
          <span class="col-span-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center">Student</span>
          <span class="col-span-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center">Student ID</span>
          <span class="col-span-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center">Batch / Year</span>
          <span class="col-span-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center">Status</span>
          <span class="col-span-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center">Card</span>
          <span class="col-span-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider self-center text-right">Actions</span>
        </div>

        <!-- Student Rows -->
        <div class="divide-y divide-gray-100 dark:divide-gray-700/50">
          <div v-for="(student, index) in students" :key="student.id" class="group px-3 md:px-3 py-2.5 cursor-pointer transition-all duration-150" :class="[
              index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/[0.02]',
              selectedStudent?.id === student.id ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'hover:bg-blue-50/30 dark:hover:bg-blue-900/10'
            ]" @click="selectStudent(student)"
          >
            <!-- Mobile -->
            <div class="md:hidden space-y-1.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <input type="checkbox" :checked="selectedStudentIds.has(student.id)" @change="toggleStudent(student.id)" class="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  <div class="w-7 h-7 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-[9px] font-bold text-white">{{ getInitials(student.full_name) }}</span>
                  </div>
                  <div>
                    <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ student.full_name }}</p>
                    <p class="text-[9px] text-gray-400 font-mono">{{ student.student_id_no }}</p>
                  </div>
                </div>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).bg, color: getStatusStyle(student.enrollment_status).text }">
                  <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).dot }"></span>
                  {{ student.enrollment_status.charAt(0).toUpperCase() + student.enrollment_status.slice(1) }}
                </span>
              </div>
              <div class="flex items-center justify-between pl-9">
                <div class="flex gap-1">
                  <button @click="openPreview(student)" class="p-1 rounded text-blue-500 hover:bg-blue-50 cursor-pointer dark:hover:bg-blue-500/10" title="Preview"><Eye :size="13" /></button>
                  <button @click="handleGenerate(student.id)" :disabled="isGenerating" class="p-1 rounded text-emerald-500 hover:bg-emerald-50 cursor-pointer dark:hover:bg-emerald-500/10 disabled:opacity-40" title="Generate"><CreditCard :size="13" /></button>
                  <button @click="handleReprint(student.id)" :disabled="isReprinting" class="p-1 rounded text-amber-500 hover:bg-amber-50 cursor-pointer dark:hover:bg-amber-500/10 disabled:opacity-40" title="Reprint"><RotateCcw :size="13" /></button>
                  <button @click="handleDownload(student.id)" class="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700" title="Download PDF"><Download :size="13" /></button>
                </div>
                <span v-if="generatedCards.has(student.id)" class="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600"><CheckCircle :size="10" /> Generated</span>
              </div>
            </div>

            <!-- Desktop -->
            <div class="hidden md:grid grid-cols-12 gap-2 items-center">
              <div class="col-span-1 flex items-center">
                <input type="checkbox" :checked="selectedStudentIds.has(student.id)" @change="toggleStudent(student.id)" class="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              </div>
              <div class="col-span-2 flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-[9px] font-bold text-white">{{ getInitials(student.full_name) }}</span>
                </div>
                <p class="text-xs font-semibold text-gray-900 dark:text-white truncate">{{ student.full_name }}</p>
              </div>
              <div class="col-span-2">
                <span class="text-[11px] font-mono text-gray-500 dark:text-gray-400">{{ student.student_id_no }}</span>
              </div>
              <div class="col-span-2">
                <span class="text-[11px] text-gray-400">{{ student.selection_batch_name || '—' }}<span v-if="student.intake_year" class="text-gray-300 dark:text-gray-600"> · {{ student.intake_year }}</span></span>
              </div>
              <div class="col-span-1">
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                  :style="{ backgroundColor: getStatusStyle(student.enrollment_status).bg, color: getStatusStyle(student.enrollment_status).text }">
                  <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).dot }"></span>
                  {{ student.enrollment_status.charAt(0).toUpperCase() + student.enrollment_status.slice(1) }}
                </span>
              </div>
              <div class="col-span-2 flex items-center gap-1.5">
                <span v-if="selectedStudent?.id === student.id" class="inline-flex items-center gap-1 text-[9px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/20 dark:text-blue-400 px-1.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/30">
                  <Eye :size="10" />
                  Previewing
                </span>
                <span v-else-if="generatedCards.has(student.id)" class="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full"><CheckCircle :size="10" /> Generated</span>
                <span v-else class="text-[9px] text-gray-300 dark:text-gray-600">Not generated</span>
              </div>
              <div class="col-span-2 flex items-center justify-end gap-0.5">
                <button @click="openPreview(student)" class="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer dark:hover:bg-blue-500/10" title="Preview"><Eye :size="13" /></button>
                <button @click="handleGenerate(student.id)" :disabled="isGenerating" class="p-1 rounded text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 cursor-pointer dark:hover:bg-emerald-500/10 disabled:opacity-30" title="Generate"><CreditCard :size="13" /></button>
                <button @click="handleReprint(student.id)" :disabled="isReprinting" class="p-1 rounded text-gray-400 hover:text-amber-500 hover:bg-amber-50 cursor-pointer dark:hover:bg-amber-500/10 disabled:opacity-30" title="Reprint"><RotateCcw :size="13" /></button>
                <button @click="handleDownload(student.id)" class="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer dark:hover:bg-gray-700" title="Download PDF"><Download :size="13" /></button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="students.length === 0 && !loading" class="py-12 text-center">
            <div class="flex flex-col items-center gap-2">
              <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
              </div>
              <p class="text-xs font-medium text-gray-500">No students found</p>
              <p class="text-[10px] text-gray-400 max-w-xs">Try adjusting your filters or import student data first.</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="lastPage > 1 && !loading" class="flex items-center justify-between">
      <p class="text-[11px] text-gray-400">Page {{ currentPage }} of {{ lastPage }}</p>
      <div class="flex items-center gap-0.5">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1" class="p-1.5 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer dark:hover:bg-gray-800"><ChevronLeft :size="14" /></button>
        <template v-for="page in pageNumbers" :key="page">
          <button v-if="page === '...'" disabled class="w-6 h-6 text-[10px] text-gray-300 cursor-default">...</button>
          <button v-else @click="goToPage(page as number)" class="w-6 h-6 rounded text-[10px] font-semibold cursor-pointer" :class="page === currentPage ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'">{{ page }}</button>
        </template>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= lastPage" class="p-1.5 rounded text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer dark:hover:bg-gray-800"><ChevronRight :size="14" /></button>
      </div>
    </div>

    <!-- Progress Bar -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="isBatchGenerating" class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Generating cards...</span>
          <span class="text-sm font-semibold text-blue-600">{{ generationProgress }}%</span>
        </div>
        <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" :style="{ width: generationProgress + '%' }"></div>
        </div>
      </div>
    </transition>

    <!-- Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreviewModal && previewStudent" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closePreview"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-xl">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span class="text-sm font-bold text-white">{{ getInitials(livePreviewStudent.full_name) }}</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ livePreviewStudent.full_name }}</h3>
                <p class="text-xs text-gray-400 font-mono">{{ livePreviewStudent.student_id_no }}</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: getStatusStyle(livePreviewStudent.enrollment_status).bg, color: getStatusStyle(livePreviewStudent.enrollment_status).text }">
                <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(livePreviewStudent.enrollment_status).dot }"></span>
                {{ livePreviewStudent.enrollment_status.charAt(0).toUpperCase() + livePreviewStudent.enrollment_status.slice(1) }}
              </span>
            </div>
            <button @click="closePreview" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-700">
              <XCircle :size="20" />
            </button>
          </div>

          <div class="p-5 flex flex-col lg:flex-row gap-5">
            <div class="flex-shrink-0 flex flex-col items-center">
              <!-- Front / Back Toggle -->
              <div class="flex items-center gap-0.5 bg-gray-200/70 dark:bg-gray-700/50 rounded-lg p-0.5 mb-3">
                <button
                  @click="showCardBack = false"
                  class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer"
                  :class="!showPreviewCardBack ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >{{ t('card_gen.front') }}</button>
                <button
                  @click="showCardBack = true"
                  class="px-3 py-1 text-xs font-semibold rounded-md transition-all duration-150 cursor-pointer"
                  :class="showPreviewCardBack ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
                >{{ t('card_gen.back') }}</button>
              </div>
              <StudentCard
                :student="livePreviewStudent"
                :layout="currentLayoutKey"
                size="lg"
                :generated="generatedCards.has(livePreviewStudent.id)"
                :showBack="showPreviewCardBack"
                :schoolLogo="schoolLogoUrl"
                @photo-upload="handlePhotoUpload"
                @logo-upload="handleLogoUpload"
              />
            </div>

            <div class="flex-1 space-y-4">
              <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Information</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Date of Birth</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.dob ? formatDate(livePreviewStudent.dob) : '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Gender</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.gender }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Province</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.province || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Batch</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.selection_batch_name || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Intake Year</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.intake_year || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Enrolled Date</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ livePreviewStudent.enrollment_status === 'enrolled' ? 'Enrolled' : '—' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-xl">
            <span v-if="generatedCards.has(livePreviewStudent.id)" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle :size="14" />
              Card Generated
            </span>
            <button @click="handleGenerate(livePreviewStudent.id)" :disabled="isGenerating"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <CreditCard :size="15" />
              {{ generatedCards.has(livePreviewStudent.id) ? 'Regenerate Card' : 'Generate Card' }}
            </button>
            <button @click="handleReprint(livePreviewStudent.id)" :disabled="isReprinting"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20">
              <RotateCcw :size="15" />
              Reprint
            </button>
            <button @click="handleDownload(livePreviewStudent.id)"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-150 cursor-pointer">
              <Download :size="15" />
              Download PDF
            </button>
            <button @click="closePreview"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
