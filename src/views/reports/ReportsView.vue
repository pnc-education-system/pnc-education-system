<script setup lang="ts">
defineOptions({ name: 'ReportsPage' })

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStudentsStore } from '@/stores/students'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import { getCachedBatches, prefetchBatches, getFetchPromise } from '@/utils/batchesCache'
import * as XLSX from 'xlsx'
import { generatePDFFromElement } from '@/utils/pdfGenerator'
import {
  FileText,
  Users,
  CreditCard,
  ClipboardCheck,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Filter,
  Calendar,
  FileSpreadsheet,
  File as FileIcon,
  CheckCircle2,
  Clock,
  BarChart3,
  Download,
  Loader2,
  ArrowUpRight,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const studentsStore = useStudentsStore()

// ── Data ──
const batches = ref<SelectionBatch[]>([])
const loadingBatches = ref(false)
const studentsCount = ref(0)

// ── Report Type Selection ──
type ReportType = 'enrollment' | 'student-list' | 'cards' | 'evaluation' | 'incidents'

const reportTypeRoutes: Record<ReportType, { name: string; route: string }> = {
  enrollment: { name: 'Enrollment', route: '/enrollment' },
  'student-list': { name: 'Students', route: '/students/tracking' },
  cards: { name: 'CardIdCard', route: '/cards/id-card' },
  evaluation: { name: 'StudentProfileList', route: '/students/profile' },
  incidents: { name: 'Records', route: '/records' },
}

const reportTypes: { value: ReportType; icon: any; titleKey: string; descKey: string }[] = [
  {
    value: 'enrollment',
    icon: FileText,
    titleKey: 'reports.type_enrollment',
    descKey: 'reports.type_enrollment_desc',
  },
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
  {
    value: 'incidents',
    icon: AlertTriangle,
    titleKey: 'reports.type_incidents',
    descKey: 'reports.type_incidents_desc',
  },
]

const selectedReportType = ref<ReportType>('enrollment')

// ── Filters ──
const statuses = ['All', 'Active', 'Inactive', 'Pending', 'Enrolled']

const selectedBatchId = ref<number | null>(null)
const selectedStatus = ref('All')
const dateFrom = ref('')
const dateTo = ref('')

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
const downloadFileName = ref('')

// ── Computed ──
const studentsExportLabel = computed(() => `${studentsCount.value.toLocaleString()} / ${maxStudentsExport.toLocaleString()}`)
const progressPercent = computed(() => Math.round(progress.value))

// Report display names
function getReportDisplayName(type: ReportType): string {
  const names: Record<ReportType, string> = {
    enrollment: 'Enrollment Report',
    'student-list': 'Student List',
    cards: 'Cards Report',
    evaluation: 'Evaluation Report',
    incidents: 'Incidents Report',
  }
  return names[type]
}

// ── Data Builders ──
interface ReportRow {
  [key: string]: string | number | null | undefined
}

async function fetchReportData(type: ReportType): Promise<ReportRow[]> {
  // Try to use real data from stores first
  switch (type) {
    case 'enrollment': {
      // Use students store data for enrollment stats
      if (studentsStore.students.length === 0) {
        await studentsStore.fetchAll()
      }
      return studentsStore.students.map(s => ({
        'Student ID': s.studentIdNo,
        'Full Name': s.fullName,
        'Gender': s.gender,
        'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
        'Batch': s.selectionBatchName || '—',
        'Province': s.province || '—',
        'Phone': s.phone || '—',
        'Email': s.email || '—',
      }))
    }
    case 'student-list': {
      if (studentsStore.students.length === 0) {
        await studentsStore.fetchAll()
      }
      return studentsStore.students.map(s => ({
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
    }
    case 'cards': {
      if (studentsStore.students.length === 0) {
        await studentsStore.fetchAll()
      }
      // Filter enrolled students (eligible for cards)
      const enrolled = studentsStore.students.filter(s => s.status === 'enrolled')
      return enrolled.map(s => ({
        'Student ID': s.studentIdNo,
        'Full Name': s.fullName,
        'Batch': s.selectionBatchName || '—',
        'Status': 'Enrolled',
        'Card Generated': s.photoPath ? 'Yes' : 'Pending',
      }))
    }
    case 'evaluation': {
      if (studentsStore.students.length === 0) {
        await studentsStore.fetchAll()
      }
      return studentsStore.students.map(s => ({
        'Student ID': s.studentIdNo,
        'Full Name': s.fullName,
        'Batch': s.selectionBatchName || '—',
        'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
        'Evaluation Score': '—', // Placeholder for real evaluation data
        'Last Updated': s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : '—',
      }))
    }
    case 'incidents': {
      if (studentsStore.students.length === 0) {
        await studentsStore.fetchAll()
      }
      return studentsStore.students
        .filter(s => s.status === 'inactive' || s.status === 'rejected')
        .map(s => ({
          'Student ID': s.studentIdNo,
          'Full Name': s.fullName,
          'Status': s.status.charAt(0).toUpperCase() + s.status.slice(1),
          'Batch': s.selectionBatchName || '—',
          'Notes': 'See student records for details',
        }))
    }
    default:
      return []
  }
}

function generateReportHTML(type: ReportType, data: ReportRow[]): string {
  const title = getReportDisplayName(type)
  const now = new Date().toLocaleString()

  let rows = data.map(row => {
    const cells = Object.values(row)
      .map(val => `<td style="padding: 6px 10px; border: 1px solid #ddd; font-size: 11px;">${val ?? ''}</td>`)
      .join('')
    return `<tr>${cells}</tr>`
  }).join('\n')

  const headers = Object.keys(data[0] || {})
    .map(h => `<th style="padding: 8px 10px; border: 1px solid #ddd; background: #355C8C; color: white; font-size: 11px; text-align: left; font-weight: 600;">${h}</th>`)
    .join('')

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
  const ws = XLSX.utils.json_to_sheet(data)

  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length))
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
  }
}

async function handleGenerateAndDownload() {
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
    const type = selectedReportType.value
    const fmt = exportFormat.value
    const fileNameBase = getReportDisplayName(type).replace(/\s+/g, '_')

    // Simulate progress while fetching
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

    // Stop timer
    if (generationTimer.value) {
      clearInterval(generationTimer.value)
      generationTimer.value = null
    }
    generationTime.value = (Date.now() - startTime) / 1000

    // Show success
    setTimeout(() => {
      generationState.value = 'success'
    }, 300)
  } catch (err) {
    console.error('[Reports] Generation failed:', err)
    if (generationTimer.value) {
      clearInterval(generationTimer.value)
      generationTimer.value = null
    }
    generationState.value = 'idle'
    progress.value = 0
  }
}

function resetGeneration() {
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
  studentsCount.value = studentsStore.totalStudents || 4857
})

onUnmounted(() => {
  if (generationTimer.value) clearInterval(generationTimer.value)
})
</script>

<template>
  <div
    class="space-y-6"
    style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;"
  >
    <!-- ==================== HEADER ==================== -->
    <div class="flex items-start justify-between">
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
        <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">
          {{ t('reports.title') }}
        </h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
          {{ t('reports.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="text-xs text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1.5"
        >
          <BarChart3 :size="12" class="text-[#9CA3AF]" />
          <span class="font-medium">{{ t('reports.badge') }}</span>
        </span>
      </div>
    </div>

    <!-- ==================== MAIN CONTENT ==================== -->
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
      <!-- LEFT COLUMN -->
      <div class="space-y-5">
        <!-- Report Type Card -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <h2 class="text-base font-semibold text-[#111827] dark:text-white mb-4">
            {{ t('reports.report_type') }}
          </h2>
          <div class="space-y-2">
            <label
              v-for="rt in reportTypes"
              :key="rt.value"
              class="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E5E7EB] dark:border-gray-700 cursor-pointer transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 group"
              :class="{
                'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 shadow-sm': selectedReportType === rt.value,
              }"
            >
              <input
                type="radio"
                :value="rt.value"
                v-model="selectedReportType"
                :disabled="generationState !== 'idle'"
                class="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
              />
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                :class="selectedReportType === rt.value
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-[#F8FAFC] dark:bg-white/[0.04] text-[#6B7280] dark:text-gray-400 border border-[#E5E7EB] dark:border-gray-700'"
              >
                <component :is="rt.icon" :size="16" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <p
                    class="text-sm font-semibold"
                    :class="selectedReportType === rt.value
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-[#111827] dark:text-white'"
                  >
                    {{ t(rt.titleKey) }}
                  </p>
                  <span
                    class="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    :class="selectedReportType === rt.value
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                      : 'bg-[#F8FAFC] dark:bg-white/[0.06] text-[#9CA3AF] dark:text-gray-500'"
                  >
                    <ArrowUpRight :size="9" />
                    {{ reportTypeRoutes[rt.value].name }}
                  </span>
                </div>
                <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                  {{ t(rt.descKey) }}
                </p>
              </div>
            </label>
          </div>
        </div>

        <!-- Filters Card -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-2 mb-4">
            <Filter :size="16" class="text-[#6B7280] dark:text-gray-400" />
            <h2 class="text-base font-semibold text-[#111827] dark:text-white">
              {{ t('reports.filters') }}
            </h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.batch') }}
              </label>
              <div class="relative">
                <select
                  v-model="selectedBatchId"
                  class="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
                  :disabled="loadingBatches"
                >
                  <option :value="null" disabled>{{ loadingBatches ? t('reports.loading_batches') : t('reports.select_batch') }}</option>
                  <option v-for="batch in batches" :key="batch.id" :value="batch.id">
                    {{ batch.name }} ({{ batch.year }})
                  </option>
                </select>
                <ChevronDown :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.status') }}
              </label>
              <div class="relative">
                <select
                  v-model="selectedStatus"
                  class="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
                >
                  <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
                </select>
                <ChevronDown :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.from') }}
              </label>
              <div class="relative">
                <Calendar :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                <input
                  v-model="dateFrom"
                  type="date"
                  class="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-1.5">
                {{ t('reports.to') }}
              </label>
              <div class="relative">
                <Calendar :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                <input
                  v-model="dateTo"
                  type="date"
                  class="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
          <p class="text-xs text-[#9CA3AF] dark:text-gray-500 mt-3 flex items-center gap-1.5">
            <Clock :size="12" />
            {{ t('reports.date_range_limit') }}
          </p>
        </div>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="space-y-5">
        <!-- Export Options Card -->
        <div
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <h2 class="text-base font-semibold text-[#111827] dark:text-white mb-4">
            {{ t('reports.export_options') }}
          </h2>

          <!-- Export Format -->
          <div class="mb-5">
            <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-2">
              {{ t('reports.export_format') }}
            </label>
            <div class="flex items-center gap-3">
              <button
                @click="exportFormat = 'xlsx'"
                :disabled="generationState !== 'idle'"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer"
                :class="exportFormat === 'xlsx'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'"
              >
                <FileSpreadsheet :size="18" />
                {{ t('reports.format_xlsx') }}
              </button>
              <button
                @click="exportFormat = 'pdf'"
                :disabled="generationState !== 'idle'"
                class="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer"
                :class="exportFormat === 'pdf'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/50 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-500/5'"
              >
                <FileIcon :size="18" />
                {{ t('reports.format_pdf') }}
              </button>
            </div>
          </div>

          <!-- Students to Export -->
          <div class="mb-5">
            <label class="block text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-[0.05em] mb-2">
              {{ t('reports.students_to_export') }}
            </label>
            <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Users :size="15" class="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p class="text-sm font-bold text-[#111827] dark:text-white tabular-nums">{{ studentsExportLabel }}</p>
                  <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('reports.students_count') }}</p>
                </div>
              </div>
              <span
                class="text-[10px] font-semibold tracking-[0.05em] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1"
              >
                <CheckCircle2 :size="11" />
                {{ t('reports.target') }}: {{ performanceTarget }}
              </span>
            </div>
          </div>

          <!-- Generate & Download Button -->
          <button
            v-if="generationState === 'idle'"
            @click="handleGenerateAndDownload"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all duration-200 cursor-pointer shadow-sm shadow-blue-500/25 hover:shadow-md hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            <Download :size="18" />
            {{ t('reports.generate_download') }}
          </button>

          <!-- Download After Success -->
          <button
            v-if="generationState === 'success'"
            @click="resetGeneration"
            class="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#374151] dark:text-gray-300 bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
          >
            {{ t('reports.new_report') }}
          </button>
        </div>

        <!-- Progress Card -->
        <div
          v-if="generationState === 'generating'"
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6 space-y-4 animate-in"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Loader2 :size="20" class="text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <div>
              <p class="text-sm font-semibold text-[#111827] dark:text-white">
                {{ t('reports.generating_title') }}
              </p>
              <p class="text-xs text-[#6B7280] dark:text-gray-400">
                {{ t('reports.estimated_remaining', { seconds: Math.max(1, Math.ceil(3 - generationTime)) }) }}
              </p>
            </div>
          </div>

          <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between">
            <p class="text-xs text-[#6B7280] dark:text-gray-400">{{ t('reports.progress_label') }}</p>
            <p class="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{{ progressPercent }}%</p>
          </div>
        </div>

        <!-- Success Card -->
        <div
          v-if="generationState === 'success'"
          class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-emerald-200 dark:border-emerald-800/50 p-6 space-y-4 animate-in"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 :size="24" class="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p class="text-sm font-semibold text-[#111827] dark:text-white">
                {{ t('reports.success_title') }}
              </p>
              <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                {{ t('reports.generation_time', { seconds: generationTime.toFixed(1) }) }}
              </p>
              <p class="text-xs text-[#9CA3AF] dark:text-gray-500 mt-0.5 truncate max-w-[200px]">
                {{ downloadFileName }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              @click="handleGenerateAndDownload"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition-all duration-200 cursor-pointer shadow-sm shadow-blue-500/25 hover:shadow-md"
            >
              <Download :size="16" />
              {{ t('reports.generate_download') }}
            </button>
            <button
              @click="resetGeneration"
              class="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 bg-[#F8FAFC] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
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
@keyframes animate-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-in {
  animation: animate-in 0.3s ease-out;
}
</style>
