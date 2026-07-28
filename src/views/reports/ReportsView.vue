<script setup lang="ts">
defineOptions({ name: 'ReportsPage' })

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStudentsStore } from '@/stores/students'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import { getCachedBatches, prefetchBatches, getFetchPromise } from '@/utils/batchesCache'
import axiosInstance from '@/services/axios'
import { reportsApi } from '@/services/api/reports'
import { useToast } from '@/composables/useToast'
import * as XLSX from 'xlsx'
import { generatePDFFromElement } from '@/utils/pdfGenerator'
import {
  FileText,
  Users,
  CreditCard,
  ClipboardCheck,
  ChevronRight,
  ChevronDown,
  Filter,
  FileSpreadsheet,
  File as FileIcon,
  CheckCircle2,
  BarChart3,
  Download,
  Loader2,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const studentsStore = useStudentsStore()
const { showErrorToast } = useToast()

// ── Data ──
const batches = ref<SelectionBatch[]>([])
const loadingBatches = ref(false)
const studentsCount = ref(0)

// ── Report Type Selection ──
type ReportType = 'student-list' | 'cards' | 'evaluation'

const reportTypes: { value: ReportType; icon: any; titleKey: string; descKey: string }[] = [
  {
    value: 'student-list',
    icon: Users,
    titleKey: 'reports.type_student_list',
    descKey: 'reports.type_student_list_desc',
  },
  {
    value: 'cards',
    icon: CreditCard,
    titleKey: 'reports.type_cards',
    descKey: 'reports.type_cards_desc',
  },
  {
    value: 'evaluation',
    icon: ClipboardCheck,
    titleKey: 'reports.type_evaluation',
    descKey: 'reports.type_evaluation_desc',
  },
]

const selectedReportType = ref<ReportType>('student-list')

// ── Filters ──
const statuses = ['All', 'Pending', 'Approved', 'Enrolled', 'Inactive', 'Rejected']

const selectedBatchId = ref<number | null>(null)
const selectedStatus = ref('All')

// ── Export Options ──
type ExportFormat = 'xlsx' | 'pdf'
const exportFormat = ref<ExportFormat>('xlsx')
const maxStudentsExport = 5000
const performanceTarget = 'Under 10 seconds'

// ── Generation State ──
type GenerationState = 'idle' | 'generating' | 'success'
const generationState = ref<GenerationState>('idle')
const progress = ref(0)
const generationTime = ref(0)
const generationTimer = ref<ReturnType<typeof setInterval> | null>(null)
const autoResetTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const downloadFileName = ref('')

// ── Computed ──
const studentsExportLabel = computed(() => `${studentsCount.value.toLocaleString()} / ${maxStudentsExport.toLocaleString()}`)
const progressPercent = computed(() => Math.round(progress.value))

// Report display names
function getReportDisplayName(type: ReportType): string {
  const names: Record<ReportType, string> = {
    'student-list': 'Student List',
    cards: 'Cards Report',
    evaluation: 'Evaluation Report',
  }
  return names[type]
}

// ── Data Builders ──
interface ReportRow {
  [key: string]: string | number | null | undefined
}

async function fetchReportData(type: ReportType): Promise<ReportRow[]> {
  if (studentsStore.students.length === 0) {
    await studentsStore.fetchAll()
  }

  if (studentsStore.students.length > 0) {
    let sourceStudents = studentsStore.students
    if (selectedBatchId.value) {
      sourceStudents = sourceStudents.filter(s => s.selectionBatchId === selectedBatchId.value)
    }
    if (selectedStatus.value && selectedStatus.value !== 'All') {
      const statusLower = selectedStatus.value.toLowerCase()
      sourceStudents = sourceStudents.filter(s => s.status === statusLower)
    }

    switch (type) {
      case 'student-list':
        return sourceStudents.map(s => ({
          'Student ID': s.studentIdNo,
          'Full Name': s.fullName,
          'Gender': s.gender,
          'Date of Birth': s.dob || '—',
          'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
          'Batch': s.selectionBatchName || '—',
          'Province': s.province || '—',
          'Phone': s.phone || '—',
          'Email': s.email || '—',
        }))
      case 'cards':
        return sourceStudents
          .filter(s => s.status === 'enrolled' || s.status === 'pending' || s.status === 'approved')
          .map(s => ({
            'Student ID': s.studentIdNo,
            'Full Name': s.fullName,
            'Batch': s.selectionBatchName || '—',
            'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
            'Has Photo': s.photoPath ? 'Yes' : 'No',
            'Card Generated': s.photoPath ? 'Yes' : 'Pending',
            'Province': s.province || '—',
          }))
      case 'evaluation':
        return sourceStudents.map(s => ({
          'Student ID': s.studentIdNo,
          'Full Name': s.fullName,
          'Batch': s.selectionBatchName || '—',
          'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
          'Evaluation Score': '—',
          'Last Updated': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—',
        }))
      default:
        return []
    }
  }

  return []
}

function generateReportHTML(type: ReportType, data: ReportRow[]): string {
  const title = getReportDisplayName(type)
  const now = new Date().toLocaleString()
  const isEmpty = data.length === 0

  const emptyMessage = isEmpty
    ? `<tr><td colspan="10" style="padding: 30px 10px; border: 1px solid #ddd; font-size: 13px; color: #6B7280; text-align: center;">
         No records match the selected filters. Try adjusting your filters or selecting a different batch/status.
       </td></tr>`
    : ''

  const rows = data.map(row => {
    const cells = Object.values(row)
      .map(val => `<td style="padding: 6px 10px; border: 1px solid #ddd; font-size: 11px;">${val ?? ''}</td>`)
      .join('')
    return `<tr>${cells}</tr>`
  }).join('\n') + emptyMessage

  const headers = !isEmpty
    ? Object.keys(data[0])
        .map(h => `<th style="padding: 8px 10px; border: 1px solid #ddd; background: #355C8C; color: white; font-size: 11px; text-align: left; font-weight: 600;">${h}</th>`)
        .join('')
    : '<th style="padding: 8px 10px; border: 1px solid #ddd; background: #355C8C; color: white; font-size: 11px; text-align: left; font-weight: 600;">No Data</th>'

  return `
    <div style="font-family: Inter, sans-serif; padding: 30px; max-width: 1000px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #355C8C; padding-bottom: 16px;">
        <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px;">PNC Education System</h1>
        <h2 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0 0 8px;">${title}</h2>
        <p style="font-size: 11px; color: #6B7280; margin: 0;">Generated: ${now}</p>
        <p style="font-size: 11px; color: #6B7280; margin: 4px 0 0;">Total Records: ${data.length}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>${headers}</thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9CA3AF;">
        PNC Education System Management · Generated Report
      </div>
    </div>
  `
}

// ── Download Actions ──
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function generateExcel(type: ReportType, data: ReportRow[]): Promise<Blob> {
  // Use empty-row placeholder if no data so the file isn't completely blank
  const rows = data.length > 0 ? data : [{ 'Info': 'No records match the selected filters.' }]

  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-fit column widths
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(row => String(row[key] ?? '').length))
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, getReportDisplayName(type))
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

async function generatePdf(type: ReportType, data: ReportRow[]): Promise<Blob> {
  const html = generateReportHTML(type, data)

  // Create a temporary off-screen element to render the HTML
  // html2canvas requires the element to be rendered (not opacity:0) to capture it
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '800px'
  container.style.backgroundColor = '#ffffff'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const blob = await generatePDFFromElement({
      element: container,
      filename: `${getReportDisplayName(type).replace(/\s+/g, '_')}.pdf`,
      scale: 2,
    })
    return blob
  } finally {
    document.body.removeChild(container)
  }  }

/**
 * Try to generate the report via the backend API.
 * Returns true if successful, false if it should fall back to client-side generation.
 */
async function generateViaBackendApi(type: ReportType, fmt: 'xlsx' | 'pdf'): Promise<boolean> {
  // Backend only supports student-list exports
  if (type !== 'student-list') return false

  try {
    progress.value = 15

    const params: { batch_id?: number; status?: string } = {}
    if (selectedBatchId.value) params.batch_id = selectedBatchId.value
    if (selectedStatus.value && selectedStatus.value !== 'All') params.status = selectedStatus.value

    progress.value = 30

    const fileNameBase = getReportDisplayName(type).replace(/\s+/g, '_')

    let blob: Blob
    if (fmt === 'pdf') {
      blob = await reportsApi.downloadStudentsPdf(params)
    } else {
      blob = await reportsApi.downloadStudentsExcel(params)
    }
    progress.value = 80

    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx'
    downloadFileName.value = `${fileNameBase}_${new Date().toISOString().split('T')[0]}.${ext}`
    triggerDownload(blob, downloadFileName.value)

    progress.value = 100
    return true
  } catch (err) {
    console.warn('[Reports] Backend API failed, falling back to client-side generation:', err)
    return false
  }
}

async function handleGenerateAndDownload() {
  const type = selectedReportType.value

  if (generationState.value === 'generating') return

  generationState.value = 'generating'
  progress.value = 0
  generationTime.value = 0

  const startTime = Date.now()

  // Track elapsed time
  generationTimer.value = setInterval(() => {
    generationTime.value = (Date.now() - startTime) / 1000
  }, 100)

  try {
    const fmt = exportFormat.value
    const fileNameBase = getReportDisplayName(type).replace(/\s+/g, '_')

    // Try backend API first
    const backendSuccess = await generateViaBackendApi(type, fmt)

    if (!backendSuccess) {
      // Fall back to client-side generation
      progress.value = 10

      // Fetch the data
      const data = await fetchReportData(type)
      progress.value = 40

      // Generate the file
      let blob: Blob
      const ext = fmt === 'xlsx' ? 'xlsx' : 'pdf'

      if (fmt === 'xlsx') {
        blob = await generateExcel(type, data)
      } else {
        blob = await generatePdf(type, data)
      }
      progress.value = 80

      downloadFileName.value = `${fileNameBase}_${new Date().toISOString().split('T')[0]}.${ext}`

      // Trigger download
      triggerDownload(blob, downloadFileName.value)
      progress.value = 100
    }

    // Stop timer
    if (generationTimer.value) {
      clearInterval(generationTimer.value)
      generationTimer.value = null
    }
    generationTime.value = (Date.now() - startTime) / 1000

    // Show success for 4 seconds, then auto-reset to idle
    setTimeout(() => {
      generationState.value = 'success'
      autoResetTimer.value = setTimeout(() => {
        autoResetTimer.value = null
        resetGeneration()
      }, 4000)
    }, 300)
  } catch (err) {
    console.error('[Reports] Generation failed:', err)
    showErrorToast(
      err instanceof Error ? err.message : 'Failed to generate report. Please try again.',
      'Report Generation Failed'
    )
    if (generationTimer.value) {
      clearInterval(generationTimer.value)
      generationTimer.value = null
    }
    generationState.value = 'idle'
    progress.value = 0
  }
}

function resetGeneration() {
  // Clear any pending auto-reset timer
  if (autoResetTimer.value) {
    clearTimeout(autoResetTimer.value)
    autoResetTimer.value = null
  }
  generationState.value = 'idle'
  progress.value = 0
  generationTime.value = 0
  downloadFileName.value = ''
}

// ── Load Data ──
async function loadBatches() {
  loadingBatches.value = true
  try {
    const cached = getCachedBatches()
    if (cached) {
      batches.value = cached
      loadingBatches.value = false
      return
    }

    prefetchBatches()
    const promise = getFetchPromise()
    if (promise) {
      batches.value = await promise
    } else {
      batches.value = await selectionBatchesApi.list()
    }
  } catch (err) {
    console.error('[Reports] Failed to load batches:', err)
  } finally {
    loadingBatches.value = false
  }
}

onMounted(async () => {
  await loadBatches()
  if (studentsStore.students.length === 0) {
    await studentsStore.fetchAll()
  }
  studentsCount.value = studentsStore.totalStudents || 0
})

onUnmounted(() => {
  if (generationTimer.value) clearInterval(generationTimer.value)
  if (autoResetTimer.value) clearTimeout(autoResetTimer.value)
})
</script>

<template>
  <div
    class="space-y-6"
    style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;"
  >
    <!-- ==================== HEADER ==================== -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <nav class="flex items-center gap-1.5 text-xs text-[#9CA3AF] dark:text-gray-500 mb-2">
          <button
            @click="router.push('/dashboard')"
            class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {{ t('dashboard.title') }}
          </button>
          <ChevronRight :size="12" class="text-[#D1D5DB] dark:text-gray-600" />
          <span class="text-[#6B7280] dark:text-gray-400 font-medium">{{ t('reports.title') }}</span>
        </nav>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <BarChart3 :size="20" class="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">
              {{ t('reports.title') }}
            </h1>
            <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">
              {{ t('reports.subtitle') }}
            </p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span
          class="text-xs text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1.5"
        >
          <BarChart3 :size="12" class="text-[#9CA3AF]" />
          <span class="font-medium">{{ t('reports.badge') }}</span>
        </span>
      </div>
    </div>

    <!-- ==================== STATS OVERVIEW ROW ==================== -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Students -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">
            {{ t('reports.students_to_export') }}
          </span>
          <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Users :size="16" class="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <p class="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white tracking-tight">
          {{ studentsCount.toLocaleString() }}
        </p>
        <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">{{ t('reports.students_count') }}</p>
      </div>

      <!-- Available Batches -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">
            {{ t('reports.batch') }}
          </span>
          <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Calendar :size="16" class="text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <p class="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white tracking-tight">
          {{ batches.length }}
        </p>
        <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">batches available</p>
      </div>

      <!-- Report Types -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">
            {{ t('reports.report_type') }}
          </span>
          <div class="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center">
            <FileText :size="16" class="text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <p class="text-xl sm:text-2xl font-bold text-[#111827] dark:text-white tracking-tight">{{ reportTypes.length }}</p>
        <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">report types available</p>
      </div>

      <!-- Current Selection -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Selected</span>
          <div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <CheckCircle2 :size="16" class="text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <p class="text-sm sm:text-base font-bold text-[#111827] dark:text-white tracking-tight truncate">
          {{ getReportDisplayName(selectedReportType) }}
        </p>
        <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">
          {{ exportFormat === 'xlsx' ? 'Excel (.xlsx)' : 'PDF (.pdf)' }} format
        </p>
      </div>
    </div>

    <!-- ==================== MAIN CONTENT ==================== -->
    <div class="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">

      <!-- ═══ LEFT COLUMN: Configuration ═══ -->
      <div class="space-y-5">

        <!-- Report Type Selection -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-5 sm:p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-2.5 mb-5">
            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <BarChart3 :size="16" class="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-semibold text-[#111827] dark:text-white">
                {{ t('reports.report_type') }}
              </h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">Choose the type of report to generate</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label
              v-for="rt in reportTypes"
              :key="rt.value"
              class="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#E5E7EB] dark:border-gray-700 cursor-pointer transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 group"
              :class="{
                'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 shadow-sm ring-1 ring-blue-500/20': selectedReportType === rt.value,
              }"
            >
              <input
                type="radio"
                :value="rt.value"
                v-model="selectedReportType"
                :disabled="generationState === 'generating'"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600 flex-shrink-0"
              />
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200"
                :class="selectedReportType === rt.value
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-[#F8FAFC] dark:bg-white/[0.04] text-[#6B7280] dark:text-gray-400 border border-[#E5E7EB] dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-blue-800'"
              >
                <component :is="rt.icon" :size="16" />
              </div>
              <div class="flex-1 min-w-0">
                <p
                  class="text-sm font-semibold truncate"
                  :class="selectedReportType === rt.value
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-[#111827] dark:text-white'"
                >
                  {{ t(rt.titleKey) }}
                </p>
                <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5 leading-snug line-clamp-2">
                  {{ t(rt.descKey) }}
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Filters Card -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-5 sm:p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-2.5 mb-5">
            <div class="w-8 h-8 rounded-lg bg-[#F8FAFC] dark:bg-white/[0.04] flex items-center justify-center border border-[#E5E7EB] dark:border-gray-700">
              <Filter :size="15" class="text-[#6B7280] dark:text-gray-400" />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-semibold text-[#111827] dark:text-white">
                {{ t('reports.filters') }}
              </h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">Narrow down the data for your report</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Batch -->
            <div>
              <label class="block text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.batch') }}
              </label>
              <div class="relative">
                <select
                  v-model="selectedBatchId"
                  class="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
                  :disabled="loadingBatches"
                >
                  <option :value="null">{{ loadingBatches ? t('reports.loading_batches') : 'All Batches' }}</option>
                  <option v-for="batch in batches" :key="batch.id" :value="batch.id">
                    {{ batch.name }} ({{ batch.year }})
                  </option>
                </select>
                <ChevronDown :size="15" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>

            <!-- Status -->
            <div>
              <label class="block text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.status') }}
              </label>
              <div class="relative">
                <select
                  v-model="selectedStatus"
                  class="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
                >
                  <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
                </select>
                <ChevronDown :size="15" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>


          </div>


        </div>
      </div>

      <!-- ═══ RIGHT COLUMN: Generate ═══ -->
      <div class="space-y-5">

        <!-- Export & Generate Card -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-5 sm:p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <!-- Section header -->
          <div class="flex items-center gap-2.5 mb-5">
            <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Download :size="16" class="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 class="text-sm sm:text-base font-semibold text-[#111827] dark:text-white">
                {{ t('reports.export_options') }}
              </h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">Configure and generate your report</p>
            </div>
          </div>

          <!-- Selected Report Summary -->
          <div class="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50/50 dark:from-blue-500/5 dark:to-indigo-500/5 border border-blue-100 dark:border-blue-800/30">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm border border-blue-200 dark:border-blue-800/50">
                <component :is="reportTypes.find(rt => rt.value === selectedReportType)?.icon || FileText" :size="18" class="text-blue-600 dark:text-blue-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-[#111827] dark:text-white truncate">
                  {{ getReportDisplayName(selectedReportType) }}
                </p>
                <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">
                  {{ batches.find(b => b.id === selectedBatchId)?.name || 'All batches' }}
                  <span class="mx-1">·</span>
                  {{ selectedStatus === 'All' ? 'All statuses' : selectedStatus }}
                  <span class="mx-1">·</span>
                  {{ exportFormat === 'xlsx' ? 'Excel' : 'PDF' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Export Format -->
          <div class="mb-5">
            <label class="block text-[11px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-2.5">
              {{ t('reports.export_format') }}
            </label>
            <div class="flex items-center gap-3">
              <button
                @click="exportFormat = 'xlsx'"
                :disabled="generationState !== 'idle'"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer"
                :class="exportFormat === 'xlsx'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                  : 'border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'"
              >
                <FileSpreadsheet :size="18" />
                <span>{{ t('reports.format_xlsx') }}</span>
              </button>
              <button
                @click="exportFormat = 'pdf'"
                :disabled="generationState !== 'idle'"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer"
                :class="exportFormat === 'pdf'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 text-blue-700 dark:text-blue-400 shadow-sm ring-1 ring-blue-500/20'
                  : 'border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'"
              >
                <FileIcon :size="18" />
                <span>{{ t('reports.format_pdf') }}</span>
              </button>
            </div>
          </div>

          <!-- Data Summary -->
          <div class="mb-5">
            <div class="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Users :size="16" class="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p class="text-sm font-bold text-[#111827] dark:text-white tabular-nums">{{ studentsExportLabel }}</p>
                  <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('reports.students_count') }}</p>
                </div>
              </div>
              <span
                class="text-[10px] font-semibold tracking-[0.05em] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1 flex-shrink-0"
              >
                <CheckCircle2 :size="11" />
                {{ t('reports.target') }}: {{ performanceTarget }}
              </span>
            </div>
          </div>

          <!-- Generate Button (always visible, disabled during generation) -->
          <button
            v-show="selectedReportType !== 'cards'"
            @click="handleGenerateAndDownload"
            :disabled="generationState === 'generating'"
            class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/25 active:scale-[0.98]"
            :class="generationState === 'generating'
              ? 'text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 shadow-none cursor-not-allowed'
              : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/30'"
          >
            <Loader2 v-if="generationState === 'generating'" :size="18" class="animate-spin" />
            <Download v-else :size="18" />
            {{ generationState === 'generating' ? t('reports.generating_title') : t('reports.generate_download') }}
          </button>

          <!-- Cards-specific: Two-button layout -->
          <template v-if="selectedReportType === 'cards'">
            <button
              @click="handleGenerateAndDownload"
              :disabled="generationState === 'generating'"
              class="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/25 active:scale-[0.98]"
              :class="generationState === 'generating'
                ? 'text-blue-400 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 shadow-none cursor-not-allowed'
                : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:shadow-blue-500/30'"
            >
              <Loader2 v-if="generationState === 'generating'" :size="18" class="animate-spin" />
              <Download v-else :size="18" />
              {{ generationState === 'generating' ? t('reports.generating_title') : t('reports.generate_download') }}
            </button>
          </template>

          <!-- Generation Progress -->
          <div v-if="generationState === 'generating'" class="mt-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-[#6B7280] dark:text-gray-400">{{ t('reports.progress_label') }}</span>
              <span class="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{{ progressPercent }}%</span>
            </div>
            <div class="w-full h-2 bg-[#F1F5F9] dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                :style="{ width: `${progressPercent}%` }"
              ></div>
            </div>
          </div>

          <!-- Success Feedback Toast -->
          <div
            v-if="generationState === 'success'"
            class="mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3"
          >
            <CheckCircle2 :size="20" class="text-emerald-500 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                {{ t('reports.success_title') }}
              </p>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">
                {{ t('reports.generation_time', { seconds: generationTime.value.toFixed(1) }) }}
              </p>
            </div>
            <button
              @click="resetGeneration"
              class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
            >
              {{ t('reports.new_report') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth number transitions */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
