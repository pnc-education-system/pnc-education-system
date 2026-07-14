<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { importsApi } from '@/services/api/imports'
import { useToast } from '@/composables/useToast'
import type { ImportPreview, ImportPreviewRow } from '@/services/api/imports'

defineOptions({ name: 'ImportViewsView' })

const route = useRoute()
const router = useRouter()
const { showSuccessToast, showErrorToast } = useToast()

const preview = ref<ImportPreview | null>(null)
const isCommitting = ref(false)
const isDownloading = ref(false)

onMounted(() => {
  // Get preview data from router state (passed from EnrollmentPage)
  const state = (history.state as { preview?: ImportPreview })?.preview
  if (state) {
    preview.value = state
  }
  // If no state, just show empty state - don't redirect
})

const validRows = computed(() => preview.value?.rows.filter(r => r.validation === 'ok') ?? [])
const errorRows = computed(() => preview.value?.rows.filter(r => r.validation !== 'ok') ?? [])

function isErrorRow(row: ImportPreviewRow): boolean {
  return row.validation !== 'ok'
}

async function onCommit() {
  if (!preview.value) return
  isCommitting.value = true
  try {
    await importsApi.commit(preview.value.import_id)
    showSuccessToast(
      `${preview.value.valid_count} students imported successfully`,
      'Import Complete'
    )
    router.push('/enrollment/history')
  } catch {
    showErrorToast('Failed to commit import', 'Error')
  } finally {
    isCommitting.value = false
  }
}

async function onDownloadErrors() {
  if (!preview.value) return
  isDownloading.value = true
  try {
    await importsApi.downloadErrors(preview.value.import_id, preview.value.file_name)
  } catch {
    showErrorToast('Failed to download error report', 'Error')
  } finally {
    isDownloading.value = false
  }
}

function onCancel() {
  router.push('/enrollment')
}
</script>

<template>
  <div
    v-if="preview"
    class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6"
    style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;"
  >
    <!-- Header -->
    <div>
      <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">Import preview</h1>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Step 2 of 3 — review before commit</p>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <!-- Valid rows -->
      <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-5">
        <p class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider mb-2">Valid Rows</p>
        <p class="text-4xl font-bold text-[#111827] dark:text-white">{{ preview.valid_count }}</p>
      </div>
      <!-- Errors -->
      <div
        class="bg-white dark:bg-[#131B2E] rounded-xl border p-5"
        :class="preview.error_count > 0
          ? 'border-red-200 dark:border-red-800'
          : 'border-[#E5E7EB] dark:border-gray-800'"
      >
        <p class="text-xs font-semibold uppercase tracking-wider mb-2"
          :class="preview.error_count > 0 ? 'text-red-500' : 'text-[#6B7280] dark:text-gray-400'">
          Errors
        </p>
        <p class="text-4xl font-bold"
          :class="preview.error_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#111827] dark:text-white'">
          {{ preview.error_count }}
        </p>
        <p v-if="preview.error_count > 0" class="text-xs text-[#6B7280] dark:text-gray-400 mt-1">excluded from import</p>
      </div>
      <!-- File info -->
      <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-5">
        <p class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider mb-2">File</p>
        <p class="text-sm font-bold text-[#111827] dark:text-white truncate">{{ preview.file_name }}</p>
        <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-1">{{ preview.total_rows }} rows</p>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[#E5E7EB] dark:border-gray-800 bg-[#F9FAFB] dark:bg-gray-800/40">
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-12">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Student ID No</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Full Name</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Province</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Validation</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#F3F4F6] dark:divide-gray-800">
            <tr
              v-for="row in preview.rows"
              :key="row.row"
              :class="isErrorRow(row) ? 'bg-red-50/60 dark:bg-red-900/10' : ''"
            >
              <td class="px-4 py-3 text-[#6B7280]">{{ row.row }}</td>
              <td class="px-4 py-3 font-medium"
                :class="isErrorRow(row) ? 'text-red-700 dark:text-red-400' : 'text-[#111827] dark:text-white'">
                {{ row.student_id_no ?? '—' }}
              </td>
              <td class="px-4 py-3"
                :class="isErrorRow(row) ? 'text-red-700 dark:text-red-400' : 'text-[#374151] dark:text-gray-300'">
                {{ row.full_name ?? '—' }}
              </td>
              <td class="px-4 py-3 text-[#6B7280]">{{ row.province ?? '—' }}</td>
              <td class="px-4 py-3">
                <span
                  v-if="row.status"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                  {{ row.status }}
                </span>
                <span v-else class="text-[#9CA3AF]">—</span>
              </td>
              <td class="px-4 py-3">
                <span v-if="!isErrorRow(row)" class="text-green-600 dark:text-green-400 text-xs font-medium">✓ ok</span>
                <span v-else class="text-red-600 dark:text-red-400 text-xs">{{ row.validation }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
      <p class="text-xs text-[#6B7280] dark:text-gray-400 max-w-sm">
        Only the <strong>{{ preview.valid_count }} valid rows</strong> will be imported with default status
        <strong>Pending</strong>.
      </p>
      <div class="flex items-center gap-3">
        <button
          v-if="preview.error_count > 0"
          @click="onDownloadErrors"
          :disabled="isDownloading"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          {{ isDownloading ? 'Downloading...' : '↓ Download error report' }}
        </button>
        <button
          @click="onCancel"
          class="px-4 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          :disabled="isCommitting || preview.valid_count === 0"
          @click="onCommit"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200"
          :class="!isCommitting && preview.valid_count > 0
            ? 'text-white bg-[#0F172A] dark:bg-blue-600 hover:bg-[#1E293B] cursor-pointer'
            : 'text-[#9CA3AF] bg-gray-100 dark:bg-gray-800 cursor-not-allowed'"
        >
          <svg v-if="isCommitting" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          {{ isCommitting ? 'Importing...' : `Import ${preview.valid_count} students` }}
        </button>
      </div>
    </div>

    </div>

  <!-- Empty state - no file uploaded yet -->
  <div v-else class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <div>
      <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">Import Views</h1>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Preview imported data before confirming enrollment records.</p>
    </div>
    <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-16 flex flex-col items-center justify-center gap-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <div>
        <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">No file uploaded yet</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload a file from Import Upload first, then click "Continue to Mapping" to see the preview here.</p>
      </div>
      <button
        @click="router.push('/enrollment')"
        class="mt-2 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#355C8C] rounded-lg hover:bg-[#2A4A70] transition-colors cursor-pointer"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
        </svg>
        Go to Import Upload
      </button>
    </div>
  </div>
</template>
