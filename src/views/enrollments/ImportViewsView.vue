<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { importsApi } from '@/services/api/imports'
import { useToast } from '@/composables/useToast'
import { useStudentsStore } from '@/stores/students'
import type { ImportPreview, ImportValidationError } from '@/services/api/imports'
import type { SelectionBatch } from '@/services/api/selectionBatches'

defineOptions({ name: 'ImportViewsView' })

const { t } = useI18n()
const router = useRouter()
const { showSuccessToast, showErrorToast } = useToast()
const studentsStore = useStudentsStore()

const preview = ref<ImportPreview | null>(null)
const selectedBatch = ref<SelectionBatch | null>(null)
const isCommitting = ref(false)
const isDownloading = ref(false)

// Field name mapping for user-friendly display
const fieldLabels: Record<string, string> = {
  student_id_no: 'Student ID',
  full_name: 'Full Name',
  gender: 'Gender',
  dob: 'Date of Birth',
  phone: 'Phone Number',
  email: 'Email',
  province: 'Province',
  high_school: 'High School',
  selection_batch_id: 'Selection Batch',
  enrollment_status: 'Enrollment Status',
  intake_year: 'Intake Year',
  system: 'System',
}

function friendlyField(field: string): string {
  return fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

onMounted(() => {
  // Get preview data from sessionStorage (set by EnrollmentPage after upload)
  try {
    const storedPreview = sessionStorage.getItem('import_preview')
    const storedBatch = sessionStorage.getItem('import_selected_batch')

    if (storedPreview) {
      const parsed = JSON.parse(storedPreview) as ImportPreview
      preview.value = parsed
      console.log('Loaded preview from sessionStorage:', parsed)
    }

    if (storedBatch) {
      const parsed = JSON.parse(storedBatch) as SelectionBatch
      selectedBatch.value = parsed
      console.log('Loaded selected batch from sessionStorage:', parsed)
    }

    // Data persists in sessionStorage until a new file is uploaded
  } catch (err) {
    // Corrupted data - clear it
    console.error('Failed to load preview data:', err)
    sessionStorage.removeItem('import_preview')
    sessionStorage.removeItem('import_selected_batch')
  }
})

const validCount = computed(() => preview.value?.validation.summary.valid ?? 0)
const errorCount = computed(() => preview.value?.validation.summary.invalid ?? 0)

const validRows = computed(() => preview.value?.validation.validRows ?? [])
const errorRows = computed(() => preview.value?.validation.invalidRows ?? [])

// ── Pagination ──
const VALID_PAGE_SIZE = 10
const ERROR_PAGE_SIZE = 5

const validPage = ref(1)
const errorPage = ref(1)

const paginatedValidRows = computed(() => {
  const start = (validPage.value - 1) * VALID_PAGE_SIZE
  return validRows.value.slice(start, start + VALID_PAGE_SIZE)
})

const paginatedErrorRows = computed(() => {
  const start = (errorPage.value - 1) * ERROR_PAGE_SIZE
  return errorRows.value.slice(start, start + ERROR_PAGE_SIZE)
})

const validTotalPages = computed(() => Math.max(1, Math.ceil(validRows.value.length / VALID_PAGE_SIZE)))
const errorTotalPages = computed(() => Math.max(1, Math.ceil(errorRows.value.length / ERROR_PAGE_SIZE)))

function goToValidPage(page: number) {
  if (page >= 1 && page <= validTotalPages.value) {
    validPage.value = page
  }
}

function goToErrorPage(page: number) {
  if (page >= 1 && page <= errorTotalPages.value) {
    errorPage.value = page
  }
}

// Reset pages when data changes
watch(validRows, () => { validPage.value = 1 })
watch(errorRows, () => { errorPage.value = 1 })

async function onCommit() {
  if (!preview.value) return
  if (!selectedBatch.value) {
    showErrorToast(t('import_views.batch_required'), 'Batch Required')
    return
  }

  isCommitting.value = true
  try {
    // Add enrollment_status to each row before committing
    const rowsWithStatus = validRows.value.map(row => ({
      ...row,
      enrollment_status: row.enrollment_status || 'Pending'
    }))
    
    // Pass the valid rows and selected batch to the backend for import
    await importsApi.commit(preview.value.import_log_id, rowsWithStatus, selectedBatch.value.id)
    showSuccessToast(
      t('import_views.import_complete', { count: validCount.value, batch: selectedBatch.value.name }),
      t('import_views.import_complete_title')
    )
    // Clear students store to ensure fresh data is loaded on tracking page
    studentsStore.students = []
    clearImportSession()
    router.push('/students/tracking')
  } catch {
    showErrorToast(t('import_views.import_failed'), t('import_views.import_failed_title'))
  } finally {
    isCommitting.value = false
  }
}

async function onDownloadErrors() {
  if (!preview.value) return

  isDownloading.value = true
  try {
    await importsApi.downloadErrors(preview.value.import_log_id, preview.value.file_name)
  } catch {
    showErrorToast(t('import_views.download_failed'), 'Download Failed')
  } finally {
    isDownloading.value = false
  }
}

function clearImportSession() {
  sessionStorage.removeItem('import_preview')
  sessionStorage.removeItem('import_selected_batch')
}

function onCancel() {
  clearImportSession()
  router.push('/enrollment')
}

// Clear session data when navigating away from this page
onBeforeRouteLeave(() => {
  clearImportSession()
})
</script>

<template>
  <div class="min-h-screen" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <template v-if="preview">
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
        <!-- Header -->
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">
            {{ t('import_views.title') }}
          </h1>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Valid rows -->
          <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-5">
            <p class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider mb-2">
              {{ t('import_views.valid_rows') }}
            </p>
            <p class="text-4xl font-bold text-[#111827] dark:text-white">{{ validCount }}</p>
          </div>

          <!-- Errors -->
          <div
            class="bg-white dark:bg-[#131B2E] rounded-xl border p-5"
            :class="
              errorCount > 0
                ? 'border-red-200 dark:border-red-800'
                : 'border-[#E5E7EB] dark:border-gray-800'
            "
          >
            <p
              class="text-xs font-semibold uppercase tracking-wider mb-2"
              :class="errorCount > 0 ? 'text-red-500' : 'text-[#6B7280] dark:text-gray-400'"
            >
              {{ t('import_views.errors') }}
            </p>
            <p
              class="text-4xl font-bold"
              :class="errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#111827] dark:text-white'"
            >
              {{ errorCount }}
            </p>
            <p v-if="errorCount > 0" class="text-xs text-[#6B7280] dark:text-gray-400 mt-1">{{ t('import_views.excluded_from_import') }}</p>
          </div>

          <!-- File info -->
          <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-5">
            <p class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider mb-2">{{ t('import_views.file') }}</p>
            <p class="text-sm font-bold text-[#111827] dark:text-white truncate">{{ preview.file_name }}</p>
            <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-1">{{ t('import_views.rows', { count: preview.total_rows }) }}</p>
          </div>
        </div>

        <!-- Valid rows table -->
        <div
          v-if="validRows.length > 0"
          class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 overflow-hidden"
        >
          <div class="px-5 py-3 border-b border-[#E5E7EB] dark:border-gray-800 bg-[#F9FAFB] dark:bg-gray-800/40">
            <h3 class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {{ t('import_views.valid_rows_title', { count: validRows.length }) }}
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[#E5E7EB] dark:border-gray-800">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                    Student ID No
                  </th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Full Name</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Gender</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">DOB</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Batch</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Year</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#F3F4F6] dark:divide-gray-800">
                <tr v-for="(row, i) in paginatedValidRows" :key="i" class="hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02]">
                  <td class="px-4 py-3 font-medium text-[#111827] dark:text-white">{{ row.student_id_no }}</td>
                  <td class="px-4 py-3 text-[#374151] dark:text-gray-300">{{ row.full_name }}</td>
                  <td class="px-4 py-3 text-[#6B7280]">{{ row.gender }}</td>
                  <td class="px-4 py-3 text-[#6B7280]">{{ row.dob }}</td>
                  <td class="px-4 py-3 text-[#6B7280]">{{ row.selection_batch_id }}</td>
                  <td class="px-4 py-3 text-[#6B7280]">{{ row.intake_year }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Valid rows pagination -->
          <div
            v-if="validTotalPages > 1"
            class="flex items-center justify-between px-5 py-3 border-t border-[#E5E7EB] dark:border-gray-800 bg-[#F9FAFB] dark:bg-gray-800/40"
          >
            <p class="text-xs text-[#6B7280] dark:text-gray-400">
              {{ t('import_views.rows', { count: validRows.length }) }}
            </p>
            <div class="flex items-center gap-2">
              <button
                :disabled="validPage <= 1"
                @click="goToValidPage(validPage - 1)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
                :class="validPage <= 1 ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-white cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Previous
              </button>
              <span class="text-xs text-[#6B7280] dark:text-gray-400 px-1">
                {{ validPage }} / {{ validTotalPages }}
              </span>
              <button
                :disabled="validPage >= validTotalPages"
                @click="goToValidPage(validPage + 1)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] transition-all duration-200 dark:border-gray-700"
                :class="validPage >= validTotalPages ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-white cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              >
                Next
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error rows table -->
        <div
          v-if="errorRows.length > 0"
          class="bg-white dark:bg-[#131B2E] rounded-xl border border-red-200 dark:border-red-800 overflow-hidden"
        >
          <div class="px-5 py-3 border-b border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10">
            <h3 class="text-sm font-semibold text-red-700 dark:text-red-400">{{ t('import_views.error_rows_title', { count: errorRows.length }) }}</h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-red-200 dark:border-red-800">
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider w-12">#</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Student ID No</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Full Name</th>
                  <th class="text-left px-4 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Errors</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-red-100 dark:divide-red-900/30">
                <tr v-for="row in paginatedErrorRows" :key="row.row" class="bg-red-50/60 dark:bg-red-900/10">
                  <td class="px-4 py-3 text-[#6B7280]">{{ row.row }}</td>
                  <td class="px-4 py-3 font-medium text-red-700 dark:text-red-400">{{ row.data.student_id_no ?? '—' }}</td>
                  <td class="px-4 py-3 text-red-700 dark:text-red-400">{{ row.data.full_name ?? '—' }}</td>
                  <td class="px-4 py-3">
                    <ul class="space-y-0.5">
                      <li v-for="(msgs, field) in row.errors" :key="field" class="text-xs text-red-600 dark:text-red-400">
                        <span class="font-medium">{{ friendlyField(field) }}:</span>
                        <span v-for="(msg, mi) in msgs" :key="mi">{{ msg }} </span>
                      </li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Error rows pagination -->
          <div
            v-if="errorTotalPages > 1"
            class="flex items-center justify-between px-5 py-3 border-t border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/10"
          >
            <p class="text-xs text-[#6B7280] dark:text-gray-400">
              {{ t('import_views.rows', { count: errorRows.length }) }}
            </p>
            <div class="flex items-center gap-2">
              <button
                :disabled="errorPage <= 1"
                @click="goToErrorPage(errorPage - 1)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 transition-all duration-200 dark:border-red-800"
                :class="errorPage <= 1 ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-white cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                Previous
              </button>
              <span class="text-xs text-[#6B7280] dark:text-gray-400 px-1">
                {{ errorPage }} / {{ errorTotalPages }}
              </span>
              <button
                :disabled="errorPage >= errorTotalPages"
                @click="goToErrorPage(errorPage + 1)"
                class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 transition-all duration-200 dark:border-red-800"
                :class="errorPage >= errorTotalPages ? 'text-[#D1D5DB] cursor-not-allowed dark:text-gray-600' : 'text-[#374151] hover:bg-white cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800'"
              >
                Next
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer actions -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6">
          <p class="text-xs text-[#6B7280] dark:text-gray-400 max-w-sm">
            {{ t('import_views.import_message', { valid: validCount, status: 'Pending' }) }}
          </p>

          <div class="flex items-center gap-3">
            <button
              v-if="errorCount > 0"
              @click="onDownloadErrors"
              :disabled="isDownloading"
              class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              {{ isDownloading ? t('import_views.downloading') : t('import_views.download_report') }}
            </button>

            <button
              @click="onCancel"
              class="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 cursor-pointer"
            >
              {{ t('import_views.import_cancel') }}
            </button>

            <button
              :disabled="isCommitting || validCount === 0"
              @click="onCommit"
              class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200"
              :class="
                !isCommitting && validCount > 0
                  ? 'text-white bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  : 'text-[#9CA3AF] bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
              "
            >
              <svg v-if="isCommitting" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              {{ isCommitting ? t('import_views.importing') : t('import_views.import_students', { count: validCount }) }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state - no file uploaded yet -->
    <template v-else>
      <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">{{ t('import_views.title') }}</h1>
        </div>

        <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          <div>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ t('import_views.empty_title') }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ t('import_views.empty_subtitle') }}</p>
          </div>

          <button
            @click="router.push('/enrollment')"
            class="mt-2 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" x2="12" y1="3" y2="15" />
            </svg>
            {{ t('import_views.go_to_upload') }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

