<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { importsApi, type ImportLog, type ImportsMeta } from '@/services/api/imports'

const { t } = useI18n()

// ── State ──────────────────────────────────────────────────────────────────
const imports = ref<ImportLog[]>([])
const meta = ref<ImportsMeta>({ current_page: 1, per_page: 15, total: 0, last_page: 1 })
const loading = ref(false)
const downloadingId = ref<number | null>(null)
const statusFilter = ref('')
const error = ref('')

// ── Status config ──────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; classes: string }> = {
  Pending:    { label: t('imports_view.pending'),    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400' },
  Processing: { label: t('imports_view.processing'), classes: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  Completed:  { label: t('imports_view.completed'),  classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  Failed:     { label: t('imports_view.failed'),     classes: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
}

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchImports = async (page = 1) => {
  loading.value = true
  error.value = ''
  try {
    const result = await importsApi.list(page, statusFilter.value)
    imports.value = result.data
    meta.value = result.meta
  } catch {
    error.value = t('imports_view.load_failed')
  } finally {
    loading.value = false
  }
}

const onFilterChange = () => fetchImports(1)

// ── Download ───────────────────────────────────────────────────────────────
const handleDownload = async (imp: ImportLog) => {
  downloadingId.value = imp.id
  try {
    await importsApi.downloadErrors(imp.id, imp.file_name)
  } catch {
    error.value = t('imports_view.download_failed')
  } finally {
    downloadingId.value = null
  }
}

// ── Format helpers ─────────────────────────────────────────────────────────
const formatDate = (iso: string) => new Date(iso).toLocaleString()

const pages = computed(() => {
  const arr = []
  for (let i = 1; i <= meta.value.last_page; i++) arr.push(i)
  return arr
})

onMounted(() => fetchImports())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('imports_view.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t('imports_view.subtitle') }}
        </p>
      </div>

      <!-- Status filter -->
      <select
        v-model="statusFilter"
        @change="onFilterChange"
        class="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white dark:bg-[#131B2E] dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <option value="">{{ t('imports_view.all_statuses') }}</option>
        <option value="Pending">{{ t('imports_view.pending') }}</option>
        <option value="Processing">{{ t('imports_view.processing') }}</option>
        <option value="Completed">{{ t('imports_view.completed') }}</option>
        <option value="Failed">{{ t('imports_view.failed') }}</option>
      </select>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
      <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
      </svg>
      {{ error }}
    </div>

    <!-- Table card -->
    <div class="bg-white dark:bg-[#131B2E] border border-gray-200/80 dark:border-gray-700/80 rounded-2xl overflow-hidden">

      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!imports.length" class="flex flex-col items-center justify-center py-20 text-center px-4">
        <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg class="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('imports_view.no_imports') }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ t('imports_view.no_imports_hint') }}</p>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200/80 dark:border-gray-700/80">
              <th class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 py-4">{{ t('imports_view.table_file') }}</th>
              <th class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_batch') }}</th>
              <th class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_status') }}</th>
              <th class="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_total') }}</th>
              <th class="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_success') }}</th>
              <th class="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_errors') }}</th>
              <th class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_imported_by') }}</th>
              <th class="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-4">{{ t('imports_view.table_date') }}</th>
              <th class="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700/50">
            <tr
              v-for="imp in imports"
              :key="imp.id"
              class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
            >
              <!-- File name -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg class="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{{ imp.file_name }}</span>
                </div>
              </td>

              <!-- Batch -->
              <td class="px-4 py-4">
                <span v-if="imp.selection_batch" class="text-sm text-gray-600 dark:text-gray-300">
                  {{ imp.selection_batch.name }} ({{ imp.selection_batch.year }})
                </span>
                <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
              </td>

              <!-- Status badge -->
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  :class="statusConfig[imp.status]?.classes"
                >
                  {{ statusConfig[imp.status]?.label || imp.status }}
                </span>
              </td>

              <!-- Counts -->
              <td class="px-4 py-4 text-right font-medium text-gray-700 dark:text-gray-300">{{ imp.total_rows }}</td>
              <td class="px-4 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{{ imp.success_count }}</td>
              <td class="px-4 py-4 text-right font-medium" :class="imp.error_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'">
                {{ imp.error_count }}
              </td>

              <!-- Imported by -->
              <td class="px-4 py-4 text-gray-600 dark:text-gray-400">
                {{ imp.imported_by?.name || '—' }}
              </td>

              <!-- Date -->
              <td class="px-4 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ formatDate(imp.created_at) }}
              </td>

              <!-- Actions -->
              <td class="px-4 py-4">
                <button
                  v-if="imp.error_count > 0"
                  :disabled="downloadingId === imp.id"
                  @click="handleDownload(imp)"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg v-if="downloadingId !== imp.id" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                  </svg>
                  <div v-else class="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  {{ downloadingId === imp.id ? t('imports_view.downloading') : t('imports_view.download_errors') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && imports.length && meta.last_page > 1" class="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700/50">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          {{ t('imports_view.page_info', { current: meta.current_page, last: meta.last_page, total: meta.total }) }}
        </p>
        <div class="flex items-center gap-1">
          <button
            v-for="page in pages"
            :key="page"
            @click="fetchImports(page)"
            class="w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            :class="page === meta.current_page
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            {{ page }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
