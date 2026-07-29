<script setup lang="ts">
defineOptions({ name: 'EnrollmentPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AlertCircle, History, ChevronDown, Plus, GraduationCap, Layers, Calendar, X,
  Edit, Trash2, AlertTriangle,
} from 'lucide-vue-next'

import { useFileUpload, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/composables/useFileUpload'
import { importsApi, selectionBatchesApi } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ImportDropzone from '@/components/import/ImportDropzone.vue'
import FilePreview from '@/components/import/FilePreview.vue'
import TemplateDownload from '@/components/import/TemplateDownload.vue'

import { getCachedBatches, getFetchPromise, clearCache } from '@/utils/batchesCache'
import type { SelectionBatch, UpdateBatchRequest } from '@/services/api/selectionBatches'

const { t } = useI18n()
const router = useRouter()
const { showErrorToast, showSuccessToast } = useToast()
const isUploading = ref(false)
const selectedBatch = ref<SelectionBatch | null>(null)
const batches = ref<SelectionBatch[]>([])
const isLoadingBatches = ref(false)
const isBatchDropdownOpen = ref(false)
const isCreateBatchModalOpen = ref(false)
const isCreatingBatch = ref(false)
const newBatchName = ref('')
const newBatchYear = ref(new Date().getFullYear())
const apiUploadError = ref<string | null>(null)

// Edit batch state
const isEditBatchModalOpen = ref(false)
const isEditingBatch = ref(false)
const editingBatch = ref<SelectionBatch | null>(null)
const editBatchName = ref('')
const editBatchYear = ref(new Date().getFullYear())

// Delete batch state
const isDeleteConfirmOpen = ref(false)
const isDeletingBatch = ref(false)
const deletingBatch = ref<SelectionBatch | null>(null)

const {
  isDragOver,
  selectedFile,
  uploadError,
  fileInputRef,
  canContinue: fileReady,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onChooseFile,
  onFileInputChange,
  removeFile,
  clearUploadError,
  dropZoneClasses,
} = useFileUpload()

// Require both a file AND a selected batch to continue
const canContinue = computed(() => fileReady.value && selectedBatch.value !== null)

onMounted(async () => {
  await fetchBatches()
})

async function fetchBatches() {
  isLoadingBatches.value = true
  try {
    // Check cache first — the route guard may have already started the fetch
    const cached = getCachedBatches()
    if (cached) {
      batches.value = cached
    } else {
      const inFlight = getFetchPromise()
      // Await the in-flight promise from the route guard, or start a new fetch
      batches.value = inFlight ? await inFlight : await selectionBatchesApi.list()
    }
    // Auto-select the first batch if available
    if (batches.value.length > 0) {
      selectedBatch.value = batches.value[0] ?? null
    }
  } catch {
    showErrorToast(t('enrollment.load_failed'), 'Error')
  } finally {
    isLoadingBatches.value = false
  }
}

async function onCreateBatch() {
  if (!newBatchName.value.trim()) {
    showErrorToast(t('enrollment.batch_name_required'), 'Error')
    return
  }
  if (!newBatchYear.value || newBatchYear.value < 2000 || newBatchYear.value > 2100) {
    showErrorToast(t('enrollment.valid_year'), 'Error')
    return
  }

  isCreatingBatch.value = true
  try {
    const newBatch = await selectionBatchesApi.create({
      name: newBatchName.value.trim(),
      year: newBatchYear.value,
    })
    batches.value.push(newBatch)
    selectedBatch.value = newBatch
    clearCache() // Ensure fresh data on next navigation
    isCreateBatchModalOpen.value = false
    newBatchName.value = ''
    newBatchYear.value = new Date().getFullYear()
    showSuccessToast(t('enrollment.batch_created'), 'Success')
  } catch {
    showErrorToast(t('enrollment.batch_create_failed'), 'Error')
  } finally {
    isCreatingBatch.value = false
  }
}

function handleCancel() {
  apiUploadError.value = null
  removeFile()
}

function openCreateBatchModal() {
  isBatchDropdownOpen.value = false
  isCreateBatchModalOpen.value = true
  newBatchName.value = ''
  newBatchYear.value = new Date().getFullYear()
}

function openEditBatchModal(batch: SelectionBatch) {
  isBatchDropdownOpen.value = false
  editingBatch.value = batch
  editBatchName.value = batch.name
  editBatchYear.value = batch.year
  isEditBatchModalOpen.value = true
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const error = err as {
    response?: {
      data?: {
        message?: string
        error?: string
        errors?: Record<string, string[]>
      }
    }
  }
  const msg = error?.response?.data?.message
  const singleError = error?.response?.data?.error
  const details = error?.response?.data?.errors
  const detailStr = details
    ? Object.entries(details).map(([f, msgs]) => `${f}: ${msgs.join(', ')}`).join('; ')
    : ''
  return msg || singleError || detailStr || fallback
}

async function onEditBatch() {
  if (!editingBatch.value || !editBatchName.value.trim()) {
    showErrorToast(t('enrollment.batch_name_required'), 'Error')
    return
  }
  if (!editBatchYear.value || editBatchYear.value < 2000 || editBatchYear.value > 2100) {
    showErrorToast(t('enrollment.valid_year'), 'Error')
    return
  }

  isEditingBatch.value = true
  try {
    const request: UpdateBatchRequest = {
      name: editBatchName.value.trim(),
      year: editBatchYear.value,
    }
    const updated = await selectionBatchesApi.update(editingBatch.value.id, request)

    // Replace in local list
    const idx = batches.value.findIndex((b) => b.id === editingBatch.value!.id)
    if (idx !== -1) {
      batches.value[idx] = updated
    }
    // If the edited batch was selected, update selection
    if (selectedBatch.value?.id === updated.id) {
      selectedBatch.value = updated
    }

    clearCache() // Ensure fresh data on next navigation
    isEditBatchModalOpen.value = false
    editingBatch.value = null
    showSuccessToast(t('enrollment.batch_updated'), 'Success')
  } catch (err: unknown) {
    console.error('Update batch error:', err)
    showErrorToast(getApiErrorMessage(err, t('enrollment.batch_update_failed')), 'Update Error')
  } finally {
    isEditingBatch.value = false
  }
}

function confirmDeleteBatch(batch: SelectionBatch) {
  isBatchDropdownOpen.value = false
  deletingBatch.value = batch
  isDeleteConfirmOpen.value = true
}

async function onDeleteBatch() {
  if (!deletingBatch.value) return

  isDeletingBatch.value = true
  try {
    await selectionBatchesApi.delete(deletingBatch.value.id)

    // Remove from local list
    batches.value = batches.value.filter((b) => b.id !== deletingBatch.value!.id)
    // If the deleted batch was selected, clear or pick the first available
    if (selectedBatch.value?.id === deletingBatch.value.id) {
      selectedBatch.value = batches.value[0] ?? null
    }

    clearCache() // Ensure fresh data on next navigation
    isDeleteConfirmOpen.value = false
    deletingBatch.value = null
    showSuccessToast(t('enrollment.batch_deleted'), 'Success')
  } catch (err: unknown) {
    console.error('Delete batch error:', err)
    showErrorToast(getApiErrorMessage(err, t('enrollment.batch_delete_failed')), 'Delete Error')
  } finally {
    isDeletingBatch.value = false
  }
}

async function onContinueToMapping(): Promise<void> {
  if (!selectedFile.value) {
    showErrorToast(t('enrollment.no_file'), 'Error')
    return
  }
  if (!selectedBatch.value) {
    showErrorToast(t('enrollment.no_batch_selected'), 'Error')
    return
  }
  isUploading.value = true
  try {
    console.log('Starting file upload:', selectedFile.value.name)
    console.log('Selected batch:', selectedBatch.value)
    const preview = await importsApi.preview(selectedFile.value, selectedBatch.value.id)
    console.log('Upload successful, preview data:', preview)

    // Store preview data in sessionStorage for reliable data passing
    sessionStorage.setItem('import_preview', JSON.stringify(preview))
    sessionStorage.setItem('import_selected_batch', JSON.stringify(selectedBatch.value))

    // Navigate to Import Views
    router.push({
      path: '/enrollment/views',
      query: { import_id: String(preview.import_log_id) },
    })
  } catch (err: unknown) {
    console.error('Upload error:', err)
    const error = err as {
      response?: {
        data?: {
          message?: string
          error?: string
          errors?: string
        }
      }
    }
    const msg =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      t('enrollment.upload_error_default')
    apiUploadError.value = msg
    showErrorToast(msg, 'Upload Error')
  } finally {
    isUploading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 py-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">{{ t('enrollment.title') }}</h1>
        </div>

        <!-- History button -->
        <router-link
          to="/enrollment/history"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.97] shadow-sm"
        >
          <History class="w-4 h-4" />
          <span class="hidden sm:inline">{{ t('enrollment.view_history') }}</span>
        </router-link>
      </div>

      <!-- Upload View -->
      <!-- Import Upload Card -->
        <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
        <!-- Batch Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
            {{ t('enrollment.select_batch') }}
          </label>
          <div class="relative">
            <button
              type="button"
              @click="isBatchDropdownOpen = !isBatchDropdownOpen"
              class="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30 cursor-pointer hover:border-[#355C8C] dark:hover:border-blue-400 transition-colors"
              :disabled="isLoadingBatches"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-[#355C8C]/10 dark:bg-blue-500/10 flex items-center justify-center">
                  <Layers class="w-4 h-4 text-[#355C8C] dark:text-blue-400" />
                </div>
                <div class="flex-1 min-w-0">
                <!-- Skeleton loading -->
                <template v-if="isLoadingBatches">
                  <div class="h-4 w-32 bg-gray-200 dark:bg-gray-600 rounded-md animate-pulse mb-1.5"></div>
                  <div class="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse"></div>
                </template>
                <!-- Selected batch info -->
                <template v-else-if="selectedBatch">
                  <span class="text-sm font-medium text-[#111827] dark:text-white">
                    {{ selectedBatch.name }}
                  </span>
                  <span class="text-xs text-[#6B7280] dark:text-gray-400 ml-2">
                    {{ selectedBatch.year }}
                    <span v-if="selectedBatch.students_count !== undefined" class="ml-2">· {{ t('enrollment.students_count', { count: selectedBatch.students_count }) }}</span>
                  </span>
                </template>
                <!-- Placeholder when no batch selected -->
                <span v-else class="text-sm text-[#9CA3AF]">
                  {{ t('enrollment.select_batch_placeholder') }}
                </span>
              </div>
              </div>
              <ChevronDown class="w-4 h-4 text-[#6B7280] transition-transform duration-200 shrink-0" :class="isBatchDropdownOpen ? 'rotate-180' : ''" />
            </button>

            <!-- Batch Selection Card Overlay -->
            <div
              v-if="isBatchDropdownOpen"
              class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              @click.self="isBatchDropdownOpen = false"
            >
              <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
                <!-- Card Header -->
                <div class="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800 shrink-0">
                  <div>
                    <h2 class="text-lg font-semibold text-[#111827] dark:text-white">{{ t('enrollment.modal_title') }}</h2>
                    <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">{{ t('enrollment.modal_subtitle') }}</p>
                  </div>
                  <button
                    @click="isBatchDropdownOpen = false"
                    class="p-1.5 rounded-lg text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>

                <!-- Batch List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-2">
                  <!-- Skeleton loading cards -->
                  <div v-if="isLoadingBatches" class="space-y-2">
                    <div v-for="i in 4" :key="i" class="flex items-center gap-3 p-4 rounded-xl border border-[#E5E7EB] dark:border-gray-700 animate-pulse">
                      <div class="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-600 shrink-0"></div>
                      <div class="flex-1 space-y-2">
                        <div class="h-4 w-36 bg-gray-200 dark:bg-gray-600 rounded-md"></div>
                        <div class="flex items-center gap-3">
                          <div class="h-3 w-16 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
                          <div class="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else-if="batches.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
                    <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <Layers class="w-6 h-6 text-[#9CA3AF]" />
                    </div>
                    <p class="text-sm font-medium text-[#374151] dark:text-gray-300">{{ t('enrollment.no_batches') }}</p>
                    <p class="text-xs text-[#9CA3AF] mt-1">{{ t('enrollment.create_hint') }}</p>
                  </div>

                  <div
                    v-for="batch in batches"
                    :key="batch.id"
                    class="flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer group"
                    :class="selectedBatch?.id === batch.id
                      ? 'border-[#355C8C] dark:border-blue-400 bg-[#355C8C]/5 dark:bg-blue-500/5'
                      : 'border-[#E5E7EB] dark:border-gray-700 hover:border-[#D1D5DB] dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/[0.02]'"
                    @click="selectedBatch = batch; isBatchDropdownOpen = false"
                  >
                    <div
                      class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      :class="selectedBatch?.id === batch.id
                        ? 'bg-[#355C8C] dark:bg-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800'"
                    >
                      <GraduationCap
                        class="w-5 h-5"
                        :class="selectedBatch?.id === batch.id ? 'text-white' : 'text-[#6B7280] dark:text-gray-400'"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-[#111827] dark:text-white truncate">{{ batch.name }}</p>
                      <div class="flex items-center gap-3 mt-1">
                        <span class="inline-flex items-center gap-1 text-xs text-[#6B7280] dark:text-gray-400">
                          <Calendar class="w-3 h-3" />
                          {{ batch.year }}
                        </span>
                        <span v-if="batch.students_count !== undefined" class="inline-flex items-center gap-1 text-xs text-[#6B7280] dark:text-gray-400">
                          <GraduationCap class="w-3 h-3" />
                          {{ t('enrollment.students_count', { count: batch.students_count }) }}
                        </span>
                        <span v-if="batch.creator?.name" class="text-xs text-[#9CA3AF] dark:text-gray-500">
                          {{ t('enrollment.by', { name: batch.creator.name }) }}
                        </span>
                      </div>
                    </div>
                    <!-- Actions -->
                    <div class="flex items-center gap-1 shrink-0" @click.stop>
                      <button
                        @click="openEditBatchModal(batch)"
                        class="p-1.5 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-[#355C8C] dark:hover:text-blue-400 hover:bg-[#355C8C]/10 dark:hover:bg-blue-500/10 transition-all duration-200 cursor-pointer"
                        title="Edit batch"
                      >
                        <Edit class="w-4 h-4" />
                      </button>
                      <button
                        @click="confirmDeleteBatch(batch)"
                        class="p-1.5 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                        title="Delete batch"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                    <!-- Selected checkmark -->
                    <div
                      v-if="selectedBatch?.id === batch.id"
                      class="w-6 h-6 rounded-full bg-[#355C8C] dark:bg-blue-600 flex items-center justify-center shrink-0"
                    >
                      <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>

                <!-- Card Footer with Create Button -->
                <div class="px-6 py-4 border-t border-[#E5E7EB] dark:border-gray-800 shrink-0">
                  <button
                    @click="openCreateBatchModal"
                    class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#355C8C] dark:bg-blue-600 rounded-lg hover:bg-[#2A4A70] dark:hover:bg-blue-700 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Plus class="w-4 h-4" />
                    {{ t('enrollment.create_new') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          :accept="ACCEPTED_EXTENSIONS"
          class="hidden"
          @change="onFileInputChange"
        />

        <!-- Drop zone or file preview -->
        <ImportDropzone
          v-if="!selectedFile"
          :is-drag-over="isDragOver"
          :upload-error="uploadError"
          :has-file="selectedFile !== null"
          :accepted-extensions="ACCEPTED_EXTENSIONS"
          :max-file-size-mb="MAX_FILE_SIZE_MB"
          :drop-zone-classes="dropZoneClasses"
          @dragenter="onDragEnter"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @choose-file="onChooseFile"
          @file-input-change="onFileInputChange"
        />
        <FilePreview
          v-else
          :file="selectedFile"
          :is-uploading="isUploading"
          @remove="handleCancel"
          @upload="onContinueToMapping"
        />

        <!-- Inline error message -->
        <div
          v-if="uploadError && !selectedFile"
          class="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800"
        >
          <AlertCircle class="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-red-700 dark:text-red-400 leading-relaxed">{{ uploadError }}</p>
          </div>
          <button
            @click="clearUploadError"
            class="shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
            aria-label="Dismiss error"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Bottom actions -->
        <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button
            @click="handleCancel"
            class="px-5 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30 focus:ring-offset-1 dark:focus:ring-offset-gray-900 transition-all duration-200 cursor-pointer"
          >
            {{ t('enrollment.cancel') }}
          </button>
          <button
            :disabled="!canContinue"
            @click="onContinueToMapping"
            class="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
            :class="canContinue
              ? 'text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.97] cursor-pointer'
              : 'text-[#9CA3AF] dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'"
          >
            {{ t('enrollment.continue') }}
          </button>
        </div>
      </div>

      <!-- Expected Columns Card -->
      <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
        <div class="flex items-start gap-3 mb-5">
          <div class="w-9 h-9 rounded-xl bg-[#355C8C]/10 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-[#355C8C] dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" x2="8" y1="13" y2="13"/>
              <line x1="16" x2="8" y1="17" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-semibold text-[#111827] dark:text-white">{{ t('enrollment.expected_columns') }}</h3>
            <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">{{ t('enrollment.columns_subtitle') }}</p>
          </div>
        </div>

        <!-- Columns Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
          <!-- Required Columns -->

          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">full_name</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">gender</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">dob</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>

          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">intake_year</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>
          <!-- Optional Columns -->
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">phone</span>
            <span class="text-xs text-gray-400">{{ t('enrollment.optional_badge') }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">email</span>
            <span class="text-xs text-gray-400">{{ t('enrollment.optional_badge') }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">province</span>
            <span class="text-xs text-gray-400">{{ t('enrollment.optional_badge') }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">high_school</span>
            <span class="text-xs text-gray-400">{{ t('enrollment.optional_badge') }}</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">enrollment_status</span>
            <span class="text-xs text-gray-400">{{ t('enrollment.optional_badge') }}</span>
          </div>
        </div>

        <!-- Legend & Template Download -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
          <div class="flex items-center gap-6 text-xs text-[#6B7280] dark:text-gray-400">
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
              <span>{{ t('enrollment.required_fields') }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
              <span>{{ t('enrollment.optional_fields') }}</span>
            </div>
          </div>
          <TemplateDownload />
        </div>
      </div>

    </div>

    <!-- Create Batch Modal -->
    <div
      v-if="isCreateBatchModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="isCreateBatchModalOpen = false"
    >
      <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-[#111827] dark:text-white mb-4">{{ t('enrollment.create_modal_title') }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                {{ t('enrollment.batch_name') }}
              </label>
              <input
                v-model="newBatchName"
                type="text"
                :placeholder="t('enrollment.batch_name_placeholder')"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isCreatingBatch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                {{ t('enrollment.intake_year') }}
              </label>
              <input
                v-model.number="newBatchYear"
                type="number"
                min="2000"
                max="2100"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isCreatingBatch"
              />
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button
            @click="isCreateBatchModalOpen = false"
            :disabled="isCreatingBatch"
            class="px-4 py-2 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {{ t('enrollment.cancel') }}
          </button>
          <button
            @click="onCreateBatch"
            :disabled="isCreatingBatch || !newBatchName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isCreatingBatch" class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ t('enrollment.creating') }}
            </span>
            <span v-else>{{ t('enrollment.create_batch') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Batch Modal -->
    <div
      v-if="isEditBatchModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="isEditBatchModalOpen = false"
    >
      <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-xl font-semibold text-[#111827] dark:text-white mb-4">{{ t('enrollment.edit_modal_title') }}</h2>
          <p class="text-xs text-[#6B7280] dark:text-gray-400 mb-6 -mt-2">{{ t('enrollment.edit_modal_subtitle') }}</p>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                {{ t('enrollment.batch_name') }}
              </label>
              <input
                v-model="editBatchName"
                type="text"
                :placeholder="t('enrollment.batch_name_placeholder')"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isEditingBatch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                {{ t('enrollment.intake_year') }}
              </label>
              <input
                v-model.number="editBatchYear"
                type="number"
                min="2000"
                max="2100"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isEditingBatch"
              />
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button
            @click="isEditBatchModalOpen = false"
            :disabled="isEditingBatch"
            class="px-4 py-2 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {{ t('enrollment.cancel') }}
          </button>
          <button
            @click="onEditBatch"
            :disabled="isEditingBatch || !editBatchName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-[#355C8C] dark:bg-blue-600 rounded-lg hover:bg-[#2A4A70] dark:hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isEditingBatch" class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ t('enrollment.saving') }}
            </span>
            <span v-else>{{ t('enrollment.save_changes') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="isDeleteConfirmOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="isDeleteConfirmOpen = false"
    >
      <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div class="p-6 text-center">
          <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle class="w-6 h-6 text-red-500" />
          </div>
          <h2 class="text-lg font-semibold text-[#111827] dark:text-white">{{ t('enrollment.delete_confirm_title') }}</h2>
          <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-2 leading-relaxed">
            {{ t('enrollment.delete_confirm_message', { name: deletingBatch?.name || '' }) }}
          </p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button
            @click="isDeleteConfirmOpen = false"
            :disabled="isDeletingBatch"
            class="px-4 py-2 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            {{ t('enrollment.cancel') }}
          </button>
          <button
            @click="onDeleteBatch"
            :disabled="isDeletingBatch"
            class="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <span v-if="isDeletingBatch" class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              {{ t('enrollment.deleting') }}
            </span>
            <span v-else class="flex items-center gap-2">
              <Trash2 class="w-4 h-4" />
              {{ t('enrollment.delete') }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
