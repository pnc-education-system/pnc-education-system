<script setup lang="ts">
defineOptions({ name: 'CardGeneratorPage' })

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useToast } from '@/composables/useToast'
import { cardsApi, type CardStudent } from '@/services/api/cards'
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
  XCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RotateCcw,
  Loader2,
  Printer,
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

// ── Template Selection (persisted to localStorage) ──
const savedLayout = localStorage.getItem('card_template_preference')
const selectedLayout = ref<'classic' | 'modern' | 'premium'>(
  (savedLayout === 'classic' || savedLayout === 'modern' || savedLayout === 'premium') ? savedLayout : 'classic'
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
] as const

// ── Generation State ──
const isGenerating = ref(false)
const isBatchGenerating = ref(false)
const isReprinting = ref(false)
const generationProgress = ref(0)

// ── Toast ──
const { showSuccessToast, showErrorToast } = useToast()

// ── Search Debounce ──
const searchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

// ── Status Filters ──
const statusFilter = ref<string>('enrolled')
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

// ── Demo Student for Live Preview ──
const previewDemoStudent = computed<CardStudent | null>(() => {
  if (students.value.length > 0) return students.value[0]
  return null
})

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
      showErrorToast('Failed to load students.', 'Error')
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
      showSuccessToast(`Card generated for ${students.value.find((s) => s.id === studentId)?.full_name || 'student'}.`, 'Card Generated')
    } else {
      showErrorToast(result.error || 'Failed to generate card.', 'Generation Failed')
    }
  } catch {
    showErrorToast('Failed to generate card. Please try again.', 'Generation Failed')
  } finally {
    isGenerating.value = false
  }
}

async function handleBatchGenerate() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast('Please select at least one student.', 'Selection Required')
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
      `Successfully generated ${successCount} of ${ids.length} cards.`,
      'Batch Generation Complete',
    )

    selectedStudentIds.value.clear()
    generationProgress.value = 100
  } catch (err: unknown) {
    const apiErr = err as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = apiErr?.response?.data?.message || apiErr?.message || 'Failed to generate cards.'
    showErrorToast(errorMessage, 'Batch Generation Failed')
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
      showSuccessToast('Card queued for reprint.', 'Reprint Initiated')
    } else {
      showErrorToast(result.results[0]?.error || 'Failed to reprint card.', 'Reprint Failed')
    }
  } catch {
    showErrorToast('Failed to reprint card.', 'Reprint Failed')
  } finally {
    isReprinting.value = false
  }
}

async function handleBatchReprint() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast('Please select at least one student.', 'Selection Required')
    return
  }

  isReprinting.value = true
  try {
    const ids = Array.from(selectedStudentIds.value)
    const result = await cardsApi.reprint(ids)

    const successCount = result.results.filter((r) => r.status === 'success').length
    showSuccessToast(
      `Queued ${successCount} of ${ids.length} cards for reprint.`,
      'Batch Reprint Initiated',
    )
    selectedStudentIds.value.clear()
  } catch {
    showErrorToast('Failed to reprint cards.', 'Batch Reprint Failed')
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
    showSuccessToast('Card PDF downloaded.', 'Download Complete')
  } catch {
    showErrorToast('Failed to download card PDF.', 'Download Failed')
  }
}

async function handleBatchDownload() {
  if (selectedStudentIds.value.size === 0) {
    showErrorToast('Please select at least one student.', 'Selection Required')
    return
  }

  try {
    const ids = Array.from(selectedStudentIds.value)
    const blob = await cardsApi.batchDownloadPdf(ids)
    downloadBlob(blob, `ID_Cards_Batch_${Date.now()}.pdf`)
    showSuccessToast('Batch PDF downloaded successfully.', 'Download Complete')
    selectedStudentIds.value.clear()
  } catch {
    showErrorToast('Failed to download batch PDF.', 'Download Failed')
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

function handlePhotoUpload(studentId: number, file: File) {
  showSuccessToast('Photo added to card preview.', 'Photo Updated')
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

onMounted(() => {
  loadBatches()
  loadStudents()
})

onUnmounted(() => {
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value)
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          ID Card Generator
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate, preview, and print student ID cards
          <span
            v-if="totalStudents > 0"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          >
            {{ totalStudents }} eligible
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
          <span class="text-gray-400">Template</span>
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
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Eligible</p>
          <CreditCard :size="16" class="text-gray-400" />
        </div>
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalStudents }}</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Selected</p>
          <CheckCircle :size="16" class="text-emerald-500" />
        </div>
        <p class="text-2xl font-bold text-emerald-600">{{ selectedCount }}</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Generated</p>
          <CheckCircle :size="16" class="text-blue-500" />
        </div>
        <p class="text-2xl font-bold text-blue-600">{{ generatedCards.size }}</p>
      </div>
      <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between mb-1">
          <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Ready to Print</p>
          <Printer :size="16" :class="generatedCards.size > 0 ? 'text-emerald-500' : 'text-gray-300'" />
        </div>
        <p class="text-2xl font-bold" :class="generatedCards.size > 0 ? 'text-emerald-600' : 'text-gray-400'">{{ generatedCards.size > 0 ? 'Yes' : 'No' }}</p>
      </div>
    </div>

    <!-- Card Designer - Unified card preview + template picker -->
    <div class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
        <CreditCard :size="14" class="text-gray-400" />
        <h3 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Card Designer</h3>
        <div class="flex-1"></div>
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 capitalize">{{ selectedLayout }}</span>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 p-4">
        <!-- Preview Card (left) -->
        <div class="flex-shrink-0 flex justify-center">
          <StudentCard
            :student="previewDemoStudent"
            :layout="selectedLayout"
            size="sm"
            :generated="previewDemoStudent ? generatedCards.has(previewDemoStudent.id) : false"
            @photo-upload="handlePhotoUpload"
          />
        </div>

        <!-- Right side: template picker + info + actions -->
        <div class="flex-1 flex flex-col gap-3 min-w-0">
          <!-- Template Tabs -->
          <div>
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Template</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tpl in templates"
                :key="tpl.id"
                @click="selectedLayout = tpl.id"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer border"
                :class="selectedLayout === tpl.id
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
              >
                <span class="w-2 h-2 rounded-full" :class="tpl.id === 'classic' ? 'bg-blue-500' : tpl.id === 'modern' ? 'bg-indigo-500' : 'bg-amber-500'"></span>
                <span class="font-semibold">{{ tpl.name }}</span>
                <span v-if="tpl.popular && selectedLayout !== tpl.id" class="text-[9px] text-indigo-400">★</span>
                <span v-if="selectedLayout === tpl.id" class="text-blue-600 dark:text-blue-400">✓</span>
              </button>
            </div>
          </div>

          <!-- Student Info -->
          <div class="min-h-0 flex-1">
            <template v-if="previewDemoStudent">
              <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Student</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ previewDemoStudent.full_name }}</p>
              <p class="text-xs font-mono text-gray-400">{{ previewDemoStudent.student_id_no }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  :style="{ backgroundColor: getStatusStyle(previewDemoStudent.enrollment_status).bg, color: getStatusStyle(previewDemoStudent.enrollment_status).text }">
                  <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: getStatusStyle(previewDemoStudent.enrollment_status).dot }"></span>
                  {{ previewDemoStudent.enrollment_status.charAt(0).toUpperCase() + previewDemoStudent.enrollment_status.slice(1) }}
                </span>
                <span v-if="previewDemoStudent.selection_batch_name" class="text-[10px] text-gray-400">{{ previewDemoStudent.selection_batch_name }}</span>
              </div>
            </template>
            <template v-else>
              <div class="flex items-center gap-2 h-full">
                <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <CreditCard :size="14" class="text-gray-300" />
                </div>
                <p class="text-xs text-gray-400">Select a student below to preview</p>
              </div>
            </template>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-700/50">
            <button
              v-if="previewDemoStudent"
              @click="openPreview(previewDemoStudent)"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors cursor-pointer dark:text-blue-400 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
            >
              <Eye :size="13" />
              Details
            </button>
            <button
              v-if="previewDemoStudent"
              @click="handleGenerate(previewDemoStudent.id)"
              :disabled="isGenerating"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard :size="13" />
              {{ generatedCards.has(previewDemoStudent.id) ? 'Regenerate' : 'Generate' }}
            </button>
            <button
              v-if="previewDemoStudent"
              @click="handleDownload(previewDemoStudent.id)"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
            >
              <Download :size="13" />
              PDF
            </button>
            <div class="flex-1"></div>
            <span v-if="previewDemoStudent && generatedCards.has(previewDemoStudent.id)" class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
              <CheckCircle :size="11" />
              Generated
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or student ID..."
          class="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div class="flex gap-2">
        <div class="relative">
          <Filter :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            v-model="selectedBatchId"
            :disabled="loadingBatches || batches.length === 0"
            class="pl-9 pr-8 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none min-w-[150px]"
          >
            <option :value="null">All Batches</option>
            <option v-for="batch in batches" :key="batch.id" :value="batch.id">
              {{ batch.name }} ({{ batch.year }})
            </option>
          </select>
          <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="relative">
          <select
            v-model="statusFilter"
            class="px-3 pr-8 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
          >
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <svg class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <button
          @click="loadStudents()"
          class="px-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer dark:hover:bg-gray-800"
          title="Refresh"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
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
        <div class="hidden md:grid grid-cols-12 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700">
          <div class="col-span-1 flex items-center">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <span class="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Student</span>
          <span class="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Student ID</span>
          <span class="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Batch / Year</span>
          <span class="col-span-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Status</span>
          <span class="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center">Card</span>
          <span class="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider self-center text-right">Actions</span>
        </div>

        <!-- Student Rows -->
        <div class="divide-y divide-gray-100 dark:divide-gray-700/50">
          <div
            v-for="(student, index) in students"
            :key="student.id"
            class="group px-4 md:px-5 py-3.5"
            :class="index % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-white/[0.02]'"
          >
            <!-- Mobile Layout -->
            <div class="md:hidden space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <input
                    type="checkbox"
                    :checked="selectedStudentIds.has(student.id)"
                    @change="toggleStudent(student.id)"
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-white">{{ getInitials(student.full_name) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ student.full_name }}</p>
                    <p class="text-xs text-gray-400 font-mono">{{ student.student_id_no }}</p>
                  </div>
                </div>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                  :style="{ backgroundColor: getStatusStyle(student.enrollment_status).bg, color: getStatusStyle(student.enrollment_status).text }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).dot }"></span>
                  {{ student.enrollment_status.charAt(0).toUpperCase() + student.enrollment_status.slice(1) }}
                </span>
              </div>
              <div class="flex items-center justify-between pl-12">
                <div class="flex gap-2">
                  <button @click="openPreview(student)" class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10" title="Preview">
                    <Eye :size="15" />
                  </button>
                  <button @click="handleGenerate(student.id)" :disabled="isGenerating" class="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer dark:hover:bg-emerald-500/10 disabled:opacity-40" title="Generate">
                    <CreditCard :size="15" />
                  </button>
                  <button @click="handleReprint(student.id)" :disabled="isReprinting" class="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer dark:hover:bg-amber-500/10 disabled:opacity-40" title="Reprint">
                    <RotateCcw :size="15" />
                  </button>
                  <button @click="handleDownload(student.id)" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:bg-gray-700" title="Download PDF">
                    <Download :size="15" />
                  </button>
                </div>
                <span v-if="generatedCards.has(student.id)" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle :size="12" />
                  Generated
                </span>
              </div>
            </div>

            <!-- Desktop Layout -->
            <div class="hidden md:grid grid-cols-12 gap-3 items-center">
              <div class="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  :checked="selectedStudentIds.has(student.id)"
                  @change="toggleStudent(student.id)"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
              <div class="col-span-2 flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold text-white">{{ getInitials(student.full_name) }}</span>
                </div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ student.full_name }}</p>
              </div>
              <div class="col-span-2">
                <span class="text-sm font-mono text-gray-500 dark:text-gray-400">{{ student.student_id_no }}</span>
              </div>
              <div class="col-span-2">
                <span class="text-sm text-gray-400">
                  {{ student.selection_batch_name || '—' }}
                  <span v-if="student.intake_year" class="text-gray-300 dark:text-gray-600">· {{ student.intake_year }}</span>
                </span>
              </div>
              <div class="col-span-1">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                  :style="{ backgroundColor: getStatusStyle(student.enrollment_status).bg, color: getStatusStyle(student.enrollment_status).text }"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).dot }"></span>
                  {{ student.enrollment_status.charAt(0).toUpperCase() + student.enrollment_status.slice(1) }}
                </span>
              </div>
              <div class="col-span-2">
                <span v-if="generatedCards.has(student.id)" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle :size="12" />
                  Generated
                </span>
                <span v-else class="text-xs text-gray-300 dark:text-gray-600">Not generated</span>
              </div>
              <div class="col-span-2 flex items-center justify-end gap-1">
                <button @click="openPreview(student)" class="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-150 cursor-pointer dark:hover:bg-blue-500/10" title="Preview Card">
                  <Eye :size="15" />
                </button>
                <button @click="handleGenerate(student.id)" :disabled="isGenerating" class="p-1.5 rounded-lg text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all duration-150 cursor-pointer dark:hover:bg-emerald-500/10 disabled:opacity-30" title="Generate Card">
                  <CreditCard :size="15" />
                </button>
                <button @click="handleReprint(student.id)" :disabled="isReprinting" class="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-all duration-150 cursor-pointer dark:hover:bg-amber-500/10 disabled:opacity-30" title="Reprint Card">
                  <RotateCcw :size="15" />
                </button>
                <button @click="handleDownload(student.id)" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150 cursor-pointer dark:hover:bg-gray-700" title="Download PDF">
                  <Download :size="15" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="students.length === 0 && !loading" class="py-16 text-center">
            <div class="flex flex-col items-center gap-2">
              <div class="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg class="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <p class="text-sm font-medium text-gray-500">No students found</p>
              <p class="text-xs text-gray-400 max-w-xs">Students with "Enrolled" status are eligible for card generation. Try adjusting your filters.</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="lastPage > 1 && !loading" class="flex items-center justify-between">
      <p class="text-sm text-gray-400">Page {{ currentPage }} of {{ lastPage }}</p>
      <div class="flex items-center gap-1">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage <= 1"
          class="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer dark:hover:bg-gray-800">
          <ChevronLeft :size="16" />
        </button>
        <template v-for="page in pageNumbers" :key="page">
          <button v-if="page === '...'" disabled class="w-8 h-8 text-xs text-gray-300 cursor-default">...</button>
          <button v-else @click="goToPage(page as number)"
            class="w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
            :class="page === currentPage ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'">
            {{ page }}
          </button>
        </template>
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage >= lastPage"
          class="p-2 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer dark:hover:bg-gray-800">
          <ChevronRight :size="16" />
        </button>
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
                <span class="text-sm font-bold text-white">{{ getInitials(previewStudent.full_name) }}</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ previewStudent.full_name }}</h3>
                <p class="text-xs text-gray-400 font-mono">{{ previewStudent.student_id_no }}</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: getStatusStyle(previewStudent.enrollment_status).bg, color: getStatusStyle(previewStudent.enrollment_status).text }">
                <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(previewStudent.enrollment_status).dot }"></span>
                {{ previewStudent.enrollment_status.charAt(0).toUpperCase() + previewStudent.enrollment_status.slice(1) }}
              </span>
            </div>
            <button @click="closePreview" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-700">
              <XCircle :size="20" />
            </button>
          </div>

          <div class="p-5 flex flex-col lg:flex-row gap-5">
            <div class="flex-shrink-0 flex flex-col items-center">
              <StudentCard
                :student="previewStudent"
                :layout="selectedLayout"
                size="lg"
                :generated="generatedCards.has(previewStudent.id)"
                @photo-upload="handlePhotoUpload"
              />
            </div>

            <div class="flex-1 space-y-4">
              <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student Information</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Date of Birth</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.dob ? formatDate(previewStudent.dob) : '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Gender</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.gender }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Province</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.province || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Batch</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.selection_batch_name || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Intake Year</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.intake_year || '—' }}</p>
                </div>
                <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30">
                  <p class="text-xs font-medium text-gray-400 mb-0.5">Enrolled Date</p>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ previewStudent.enrollment_status === 'enrolled' ? 'Enrolled' : '—' }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-xl">
            <span v-if="generatedCards.has(previewStudent.id)" class="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <CheckCircle :size="14" />
              Card Generated
            </span>
            <button @click="handleGenerate(previewStudent.id)" :disabled="isGenerating"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <CreditCard :size="15" />
              {{ generatedCards.has(previewStudent.id) ? 'Regenerate Card' : 'Generate Card' }}
            </button>
            <button @click="handleReprint(previewStudent.id)" :disabled="isReprinting"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer dark:text-amber-400 dark:bg-amber-500/10 dark:hover:bg-amber-500/20">
              <RotateCcw :size="15" />
              Reprint
            </button>
            <button @click="handleDownload(previewStudent.id)"
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
