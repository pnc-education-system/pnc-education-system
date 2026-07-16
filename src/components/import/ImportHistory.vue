<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  RotateCw,
} from 'lucide-vue-next'

import { importsApi } from '@/services/api/imports'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'
import type { ImportLog } from '@/services/api/imports'

defineOptions({ name: 'ImportHistory' })

const router = useRouter()
const { showSuccessToast, showErrorToast } = useToast()

// ─── Status Display ──────────────────────────────────────
type DisplayStatus = 'completed' | 'failed' | 'processing' | 'partial'

interface DisplayRecord {
  id: string
  importId: number
  fileName: string
  batchName: string | null
  importedAt: string
  importedBy: string
  status: DisplayStatus
  totalRecords: number
  successRecords: number
  failedRecords: number
}

function computeStatus(log: ImportLog): DisplayStatus {
  if (log.status === 'Failed') return 'failed'
  if (log.status === 'Processing' || log.status === 'Pending') return 'processing'
  // Completed with errors → partial
  if (log.error_count > 0) return 'partial'
  return 'completed'
}

function toDisplayRecord(log: ImportLog): DisplayRecord {
  return {
    id: `IMP-${String(log.id).padStart(4, '0')}`,
    importId: log.id,
    fileName: log.file_name,
    batchName: log.selection_batch ? `${log.selection_batch.name} (${log.selection_batch.year})` : null,
    importedAt: log.created_at,
    importedBy: log.imported_by?.name ?? '—',
    status: computeStatus(log),
    totalRecords: log.total_rows,
    successRecords: log.success_count,
    failedRecords: log.error_count,
  }
}

// ─── Helpers ─────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T'))
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T'))
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── State ────────────────────────────────────────────────
const allImports = ref<ImportLog[]>([])
const isLoading = ref(false)
const downloadingId = ref<number | null>(null)

// Pagination (from API)
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)

async function fetchHistory(page = 1): Promise<void> {
  isLoading.value = true
  try {
    const result = await importsApi.list(page)
    allImports.value = result.data
    currentPage.value = result.meta.current_page
    lastPage.value = result.meta.last_page
    total.value = result.meta.total
  } catch {
    showErrorToast('Failed to load import history', 'Error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchHistory())

// ─── Search & Filters ────────────────────────────────────
const searchQuery = ref('')
const statusFilter = ref<DisplayStatus | 'all'>('all')
const showFilters = ref(false)

const allRecords = computed<DisplayRecord[]>(() => allImports.value.map(toDisplayRecord))

const filteredRecords = computed(() => {
  let result = allRecords.value

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (r) =>
        r.fileName.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query) ||
        r.importedBy.toLowerCase().includes(query)
    )
  }

  if (statusFilter.value !== 'all') {
    result = result.filter((r) => r.status === statusFilter.value)
  }

  return result
})

// ─── Status Badge Config ─────────────────────────────────
const statusConfig: Record<DisplayStatus, { label: string; icon: any; classes: string }> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    classes: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    classes: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  },
  processing: {
    label: 'Processing',
    icon: RotateCw,
    classes: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  },
  partial: {
    label: 'Partially Completed',
    icon: AlertCircle,
    classes: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  },
}

// ─── Pagination (client-side for filtered view) ──────────
const pageSize = 5

const totalPages = computed(() => Math.ceil(filteredRecords.value.length / pageSize) || 1)

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRecords.value.slice(start, start + pageSize)
})

function goToPage(page: number): void {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function onFilterChange(): void {
  currentPage.value = 1
}

// ─── Actions ─────────────────────────────────────────────
function viewDetails(record: DisplayRecord): void {
  // TODO: Navigate to import details
}

async function downloadErrorLog(record: DisplayRecord): Promise<void> {
  downloadingId.value = record.importId
  try {
    await importsApi.downloadErrors(record.importId, record.fileName)
    showSuccessToast('Error report downloaded', 'Downloaded')
  } catch {
    showErrorToast('Failed to download error report', 'Error')
  } finally {
    downloadingId.value = null
  }
}

function reImport(record: DisplayRecord): void {
  router.push({
    path: '/enrollment',
    query: { tab: 'upload' },
    state: { reImportFileName: record.fileName },
  })
}

function onRefresh(): void {
  fetchHistory(1)
  onFilterChange()
}

// ─── Filter Options ──────────────────────────────────────
const statusOptions: { value: DisplayStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partially Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'processing', label: 'Processing' },
]
</script>

<template>
  <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-800">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-[#355C8C]/10 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Clock class="w-[18px] h-[18px] text-[#355C8C] dark:text-blue-400" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Import History</h2>
          <p class="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            View and manage your past file imports.
          </p>
        </div>
      </div>
      <button
        @click="onRefresh"
        :disabled="isLoading"
        class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-700 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh"
      >
        <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
        <span class="hidden sm:inline">Refresh</span>
      </button>
    </div>

    <!-- Search & Filters -->
    <div class="px-5 py-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 space-y-3">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          <input
            v-model="searchQuery"
            @input="onFilterChange"
            type="text"
            placeholder="Search by file name, ID, or importer..."
            class="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30 focus:border-[#355C8C] dark:focus:border-blue-500 transition-all duration-200"
          />
        </div>
        <button
          @click="showFilters = !showFilters"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 active:bg-gray-100 dark:active:bg-gray-700 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
          :class="{ 'bg-gray-50 dark:bg-gray-700/60 border-[#355C8C] dark:border-blue-500': showFilters }"
        >
          <Filter class="w-4 h-4" />
          <span class="hidden sm:inline">Status</span>
          <ChevronDown
            class="w-3.5 h-3.5 transition-transform duration-200 shrink-0"
            :class="{ 'rotate-180': showFilters }"
          />
        </button>
      </div>

      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2 max-h-0"
        enter-to-class="opacity-100 translate-y-0 max-h-40"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 max-h-40"
        leave-to-class="opacity-0 -translate-y-2 max-h-0"
      >
        <div v-if="showFilters" class="flex flex-wrap items-center gap-2 pt-1">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            @click="statusFilter = opt.value; onFilterChange()"
            class="px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
            :class="statusFilter === opt.value
              ? 'bg-[#355C8C] dark:bg-blue-600 text-white border-[#355C8C] dark:border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
          >
            {{ opt.label }}
          </button>
        </div>
      </transition>
    </div>

    <!-- Results count -->
    <div class="px-5 sm:px-6 py-2.5 bg-gray-50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        <span class="font-medium text-gray-900 dark:text-white">{{ total }}</span>
        import{{ total !== 1 ? 's' : '' }}
        <template v-if="statusFilter !== 'all'">
          &middot; <span class="text-gray-500 dark:text-gray-400">{{ statusOptions.find(o => o.value === statusFilter)?.label }}</span>
        </template>
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-16 gap-3">
      <svg class="w-6 h-6 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      <span class="text-sm text-gray-500 dark:text-gray-400">Loading imports...</span>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th class="text-left px-5 sm:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Import ID</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Date</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Records</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Imported By</th>
            <th class="text-right px-5 sm:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/80">
          <tr
            v-for="record in paginatedRecords"
            :key="record.importId"
            class="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors duration-150"
          >
            <!-- File Name -->
            <td class="px-5 sm:px-6 py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[#355C8C]/5 dark:bg-blue-900/15 flex items-center justify-center shrink-0">
                  <FileSpreadsheet class="w-4 h-4 text-[#355C8C] dark:text-blue-400" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                    {{ record.fileName }}
                  </p>
                </div>
              </div>
            </td>

            <!-- Import ID -->
            <td class="px-4 py-3.5 hidden sm:table-cell">
              <span class="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {{ record.id }}
              </span>
            </td>

            <!-- Batch -->
            <td class="px-4 py-3.5">
              <span v-if="record.batchName" class="text-sm text-gray-700 dark:text-gray-300">
                {{ record.batchName }}
              </span>
              <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
            </td>

            <!-- Status -->
            <td class="px-4 py-3.5">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full"
                :class="statusConfig[record.status].classes"
              >
                <component
                  :is="statusConfig[record.status].icon"
                  class="w-3 h-3 shrink-0"
                  :class="{ 'animate-spin': record.status === 'processing' }"
                />
                {{ statusConfig[record.status].label }}
              </span>
            </td>

            <!-- Date -->
            <td class="px-4 py-3.5 hidden md:table-cell">
              <div class="text-sm text-gray-700 dark:text-gray-300 leading-tight">{{ formatDate(record.importedAt) }}</div>
              <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ formatTime(record.importedAt) }}</div>
            </td>

            <!-- Records -->
            <td class="px-4 py-3.5 hidden lg:table-cell">
              <div class="flex items-center gap-1.5">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ record.successRecords }}</span>
                <span class="text-sm text-gray-400 dark:text-gray-500">/ {{ record.totalRecords }}</span>
                <span
                  v-if="record.failedRecords > 0"
                  class="text-xs text-red-500 dark:text-red-400 ml-1"
                >
                  ({{ record.failedRecords }} errors)
                </span>
              </div>
            </td>

            <!-- Imported By -->
            <td class="px-4 py-3.5 hidden md:table-cell">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ record.importedBy }}</span>
            </td>

            <!-- Actions -->
            <td class="px-5 sm:px-6 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="viewDetails(record)"
                  class="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#355C8C] dark:hover:text-blue-400 hover:bg-[#355C8C]/5 dark:hover:bg-blue-900/20 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
                  title="View details"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  v-if="record.failedRecords > 0"
                  @click="downloadErrorLog(record)"
                  :disabled="downloadingId === record.importId"
                  class="p-1.5 rounded-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  :class="downloadingId === record.importId
                    ? 'text-gray-400 dark:text-gray-500 opacity-50'
                    : 'text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'"
                  :title="downloadingId === record.importId ? 'Downloading...' : 'Download error report'"
                >
                  <Download v-if="downloadingId !== record.importId" class="w-4 h-4" />
                  <svg v-else class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                </button>
                <button
                  @click="reImport(record)"
                  class="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-[#355C8C] dark:hover:text-blue-400 hover:bg-[#355C8C]/5 dark:hover:bg-blue-900/20 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
                  title="Re-import"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty state -->
      <div
        v-if="filteredRecords.length === 0 && !isLoading"
        class="flex flex-col items-center justify-center py-16 px-4"
      >
        <div class="w-14 h-14 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Clock class="w-7 h-7 text-gray-300 dark:text-gray-600" />
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">No import records found</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center max-w-sm">
          <template v-if="searchQuery || statusFilter !== 'all'">
            Try adjusting your search or filter criteria.
          </template>
          <template v-else>
            No imports have been performed yet. Upload a file to get started.
          </template>
        </p>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="!isLoading && totalPages > 1"
      class="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20"
    >
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Page <span class="font-medium text-gray-900 dark:text-white">{{ currentPage }}</span>
        of <span class="font-medium text-gray-900 dark:text-white">{{ totalPages }}</span>
      </p>
      <div class="flex items-center gap-2">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
          :class="currentPage === 1
            ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700'"
        >
          <ChevronLeft class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Previous</span>
        </button>

        <div class="hidden sm:flex items-center gap-1">
          <button
            v-for="page in totalPages"
            :key="page"
            @click="goToPage(page)"
            class="w-7 h-7 flex items-center justify-center text-xs font-medium rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
            :class="page === currentPage
              ? 'bg-[#355C8C] dark:bg-blue-600 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'"
          >
            {{ page }}
          </button>
        </div>

        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30"
          :class="currentPage === totalPages
            ? 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700'"
        >
          <span class="hidden sm:inline">Next</span>
          <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>
