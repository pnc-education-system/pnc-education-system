<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { importsApi } from '@/services/api/imports'
import type { ImportLog } from '@/services/api/imports'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'

defineOptions({ name: 'ImportHistoryView' })

const { t } = useI18n()
const router = useRouter()
const { showErrorToast, showSuccessToast } = useToast()
const imports = ref<ImportLog[]>([])
const isLoading = ref(false)
const downloadingId = ref<number | null>(null)
const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)
const statusFilter = ref<string>('all')

const { start: startPolling } = usePolling(() => fetchHistory(currentPage.value), 10_000)

onMounted(() => {
  fetchHistory()
  startPolling()
})

async function fetchHistory(page = 1) {
  isLoading.value = true
  try {
    const result = await importsApi.list(page, statusFilter.value === 'all' ? undefined : statusFilter.value)
    imports.value = result.data
    currentPage.value = result.meta.current_page
    lastPage.value = result.meta.last_page
    total.value = result.meta.total
  } catch {
    showErrorToast(t('import_history.load_failed'), t('import_history.toast_load_failed'))
  } finally {
    isLoading.value = false
  }
}

function onStatusFilterChange() {
  currentPage.value = 1
  fetchHistory(1)
}

async function downloadErrors(log: ImportLog) {
  downloadingId.value = log.id
  try {
    await importsApi.downloadErrors(log.id, log.file_name)
    showSuccessToast(t('import_history.toast_downloaded'), t('import_history.downloaded_title'))
  } catch {
    showErrorToast(t('import_views.download_failed'), t('import_history.toast_download_failed'))
  } finally {
    downloadingId.value = null
  }
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  Completed: { label: t('import_history.status_completed'), dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400' },
  Failed:    { label: t('import_history.status_failed'),    dot: 'bg-red-500',     bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-700 dark:text-red-400' },
  Processing:{ label: t('import_history.status_processing'),dot: 'bg-yellow-500',  bg: 'bg-yellow-50 dark:bg-yellow-500/10',   text: 'text-yellow-700 dark:text-yellow-400' },
  Pending:   { label: t('import_history.status_pending'),   dot: 'bg-gray-400',    bg: 'bg-gray-100 dark:bg-gray-700',         text: 'text-gray-600 dark:text-gray-400' },
}

function getStatus(status: string): (typeof statusConfig)['Pending'] {
  return (statusConfig[status] ?? statusConfig.Pending)!
}
</script>

<template>
  <div class="min-h-screen space-y-6 py-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">{{ t('import_history.title') }}</h1>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="statusFilter"
          @change="onStatusFilterChange"
          class="px-3 py-2 text-sm border border-[#E5E7EB] dark:border-gray-700 rounded-lg bg-white dark:bg-[#131B2E] text-[#374151] dark:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="all">{{ t('import_history.status_all') }}</option>
          <option value="Completed">{{ t('import_history.status_completed') }}</option>
          <option value="Failed">{{ t('import_history.status_failed') }}</option>
          <option value="Processing">{{ t('import_history.status_processing') }}</option>
          <option value="Pending">{{ t('import_history.status_pending') }}</option>
        </select>
        <button
          v-if="false"
          @click="router.push('/enrollment')"
          class="flex items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {{ t('import_history.new_import') }}
        </button>
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 overflow-hidden">

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-16 gap-3">
        <svg class="w-6 h-6 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span class="text-sm text-[#6B7280]">{{ t('import_history.loading_text') }}</span>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#E5E7EB] dark:border-gray-800">
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_file') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_batch') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_rows') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_valid') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_errors') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_status') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_by') }}</th>
              <th class="text-left px-5 py-3 text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">{{ t('import_history.col_when') }}</th>
              <th class="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F3F4F6] dark:divide-gray-800">
            <tr
              v-for="log in imports"
              :key="log.id"
              class="hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02] transition-colors"
            >
              <!-- File -->
              <td class="px-5 py-3.5 font-medium text-[#111827] dark:text-white">{{ log.file_name }}</td>

              <!-- Batch -->
              <td class="px-5 py-3.5 text-[#374151] dark:text-gray-300">
                <span v-if="log.selection_batch">
                  {{ log.selection_batch.name }} ({{ log.selection_batch.year }})
                </span>
                <span v-else class="text-[#9CA3AF]">—</span>
              </td>

              <!-- Rows -->
              <td class="px-5 py-3.5 text-[#374151] dark:text-gray-300">{{ log.total_rows }}</td>

              <!-- Valid -->
              <td class="px-5 py-3.5 text-[#374151] dark:text-gray-300">
                {{ log.status === 'Failed' ? '—' : log.success_count }}
              </td>

              <!-- Errors -->
              <td class="px-5 py-3.5" :class="log.error_count > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[#374151] dark:text-gray-300'">
                {{ log.error_count > 0 ? log.error_count : '0' }}
              </td>

              <!-- Status -->
              <td class="px-5 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="[getStatus(log.status).bg, getStatus(log.status).text]"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatus(log.status).dot"></span>
                  {{ getStatus(log.status).label }}
                </span>
              </td>

              <!-- By -->
              <td class="px-5 py-3.5 text-[#374151] dark:text-gray-300">{{ log.imported_by?.name ?? '—' }}</td>

              <!-- When -->
              <td class="px-5 py-3.5 text-[#6B7280] dark:text-gray-400 whitespace-nowrap">{{ formatWhen(log.created_at) }}</td>

              <!-- Download errors -->
              <td class="px-5 py-3.5">
                <button
                  v-if="log.error_count > 0"
                  @click="downloadErrors(log)"
                  :disabled="downloadingId === log.id"
                  class="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline cursor-pointer transition-opacity"
                  :class="downloadingId === log.id ? 'opacity-50' : ''"
                >
                  <svg v-if="downloadingId !== log.id" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {{ t('import_history.download_errors') }}
                </button>
                <span v-else class="text-[#9CA3AF] text-xs">—</span>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!isLoading && imports.length === 0">
              <td colspan="9" class="px-5 py-16 text-center">
                <p class="text-sm font-semibold text-[#374151] dark:text-gray-300">{{ t('import_history.empty_title') }}</p>
                <p class="text-xs text-[#9CA3AF] mt-1">{{ t('import_history.empty_subtitle') }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!isLoading && lastPage > 1"
        class="flex items-center justify-between px-5 py-3.5 border-t border-[#E5E7EB] dark:border-gray-800"
      >
        <p class="text-xs text-[#6B7280]">{{ t('import_history.page_info', { current: currentPage, last: lastPage }) }}</p>
        <div class="flex gap-2">
          <button
            :disabled="currentPage === 1"
            @click="fetchHistory(currentPage - 1)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-gray-700 transition-all"
            :class="currentPage === 1 ? 'text-[#D1D5DB] cursor-not-allowed' : 'text-[#374151] dark:text-gray-300 hover:bg-[#F3F4F6] cursor-pointer'"
          >{{ t('import_history.previous') }}</button>
          <button
            :disabled="currentPage === lastPage"
            @click="fetchHistory(currentPage + 1)"
            class="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] dark:border-gray-700 transition-all"
            :class="currentPage === lastPage ? 'text-[#D1D5DB] cursor-not-allowed' : 'text-[#374151] dark:text-gray-300 hover:bg-[#F3F4F6] cursor-pointer'"
          >{{ t('import_history.next') }}</button>
        </div>
      </div>
    </div>

  </div>
</template>
