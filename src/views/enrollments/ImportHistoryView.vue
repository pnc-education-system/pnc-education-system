<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { importsApi } from '@/services/api/imports'
import type { ImportLog } from '@/services/api/imports'
import { useToast } from '@/composables/useToast'

const { showErrorToast, showSuccessToast } = useToast()

const imports = ref<ImportLog[]>([])
const isLoading = ref(false)
const downloadingId = ref<number | null>(null)

const currentPage = ref(1)
const lastPage = ref(1)
const total = ref(0)

onMounted(() => fetchHistory())

async function fetchHistory(page = 1) {
  isLoading.value = true
  try {
    const result = await importsApi.list(page)
    imports.value = result.data
    currentPage.value = result.meta.current_page
    lastPage.value = result.meta.last_page
    total.value = result.meta.total
  } catch {
    showErrorToast('Failed to load import history', 'Error')
  } finally {
    isLoading.value = false
  }
}

async function downloadErrors(log: ImportLog) {
  downloadingId.value = log.id
  try {
    await importsApi.downloadErrors(log.id, log.file_name)
    showSuccessToast('Error report downloaded', 'Downloaded')
  } catch {
    showErrorToast('Failed to download error report', 'Error')
  } finally {
    downloadingId.value = null
  }
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusConfig = computed(() => ({
  Completed: {
    label: 'Completed',
    class: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  Failed: {
    label: 'Failed',
    class: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    dot: 'bg-red-500',
  },
  Processing: {
    label: 'Processing',
    class: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    dot: 'bg-yellow-500',
  },
  Pending: {
    label: 'Pending',
    class: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    dot: 'bg-gray-400',
  },
}))

function getStatusConfig(status: ImportLog['status']) {
  return statusConfig.value[status] ?? statusConfig.value.Pending
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Import History</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View all past file imports and download error reports.
        </p>
      </div>
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ total }} total import{{ total !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- Table card -->
    <div class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="flex flex-col items-center gap-3">
          <svg class="w-8 h-8 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">Loading import history...</p>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">File Name</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date & Time</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Records</th>
              <th class="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800/30">
            <!-- Rows -->
            <tr
              v-for="log in imports"
              :key="log.id"
              class="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
            >
              <!-- File name -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <span class="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{{ log.file_name }}</span>
                </div>
              </td>

              <!-- Date -->
              <td class="px-6 py-4">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatDateTime(log.created_at) }}</span>
              </td>

              <!-- Uploaded by -->
              <td class="px-6 py-4">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ log.imported_by?.name ?? '—' }}
                </span>
              </td>

              <!-- Status badge -->
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  :class="getStatusConfig(log.status).class"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="getStatusConfig(log.status).dot"></span>
                  {{ getStatusConfig(log.status).label }}
                </span>
              </td>

              <!-- Counts -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-3 text-xs font-medium">
                  <span class="text-gray-500 dark:text-gray-400">
                    Total: <span class="text-gray-700 dark:text-gray-300">{{ log.total_rows }}</span>
                  </span>
                  <span class="text-emerald-600 dark:text-emerald-400">
                    ✓ {{ log.success_count }}
                  </span>
                  <span v-if="log.error_count > 0" class="text-red-600 dark:text-red-400">
                    ✗ {{ log.error_count }}
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4">
                <div class="flex items-center justify-end">
                  <button
                    v-if="log.error_count > 0"
                    @click="downloadErrors(log)"
                    :disabled="downloadingId === log.id"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer"
                    :class="downloadingId === log.id
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'"
                    :title="`Download error report (${log.error_count} error${log.error_count !== 1 ? 's' : ''})`"
                  >
                    <svg
                      v-if="downloadingId !== log.id"
                      class="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    <svg v-else class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    {{ downloadingId === log.id ? 'Downloading...' : 'Download Errors' }}
                  </button>
                  <span v-else class="text-xs text-gray-400 dark:text-gray-600">—</span>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="imports.length === 0">
              <td colspan="6" class="px-6 py-20 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg class="w-7 h-7 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">No imports found</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upload a file to see import history here.</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="!isLoading && lastPage > 1"
        class="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700/50"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Page {{ currentPage }} of {{ lastPage }}
        </p>
        <div class="flex items-center gap-2">
          <button
            :disabled="currentPage === 1"
            @click="fetchHistory(currentPage - 1)"
            class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200"
            :class="currentPage === 1
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'"
          >
            Previous
          </button>
          <button
            :disabled="currentPage === lastPage"
            @click="fetchHistory(currentPage + 1)"
            class="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200"
            :class="currentPage === lastPage
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
