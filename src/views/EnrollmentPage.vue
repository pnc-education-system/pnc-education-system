<script setup lang="ts">
defineOptions({ name: 'EnrollmentPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertCircle, History, ChevronDown, Plus, GraduationCap, Layers, Calendar, X,
  Edit, Trash2, AlertTriangle,
} from 'lucide-vue-next'

import { useFileUpload, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/composables/useFileUpload'
import { importsApi, selectionBatchesApi } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ImportDropzone from '@/components/import/ImportDropzone.vue'
import FilePreview from '@/components/import/FilePreview.vue'

import { getCachedBatches, getFetchPromise, clearCache } from '@/utils/batchesCache'
import type { SelectionBatch, UpdateBatchRequest } from '@/services/api/selectionBatches'

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
    showErrorToast('Failed to load selection batches', 'Error')
  } finally {
    isLoadingBatches.value = false
  }
}

async function onCreateBatch() {
  if (!newBatchName.value.trim()) {
    showErrorToast('Batch name is required', 'Error')
    return
  }
  if (!newBatchYear.value || newBatchYear.value < 2000 || newBatchYear.value > 2100) {
    showErrorToast('Please enter a valid year', 'Error')
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
    showSuccessToast('Batch created successfully', 'Success')
  } catch {
    showErrorToast('Failed to create batch', 'Error')
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
    showErrorToast('Batch name is required', 'Error')
    return
  }
  if (!editBatchYear.value || editBatchYear.value < 2000 || editBatchYear.value > 2100) {
    showErrorToast('Please enter a valid year', 'Error')
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
    showSuccessToast('Batch updated successfully', 'Success')
  } catch (err: unknown) {
    console.error('Update batch error:', err)
    showErrorToast(getApiErrorMessage(err, 'Failed to update batch'), 'Update Error')
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
      selectedBatch.value = batches.value.length > 0 ? batches.value[0] : null
    }

    clearCache() // Ensure fresh data on next navigation
    isDeleteConfirmOpen.value = false
    deletingBatch.value = null
    showSuccessToast('Batch deleted successfully', 'Success')
  } catch (err: unknown) {
    console.error('Delete batch error:', err)
    showErrorToast(getApiErrorMessage(err, 'Failed to delete batch'), 'Delete Error')
  } finally {
    isDeletingBatch.value = false
  }
}

async function onContinueToMapping(): Promise<void> {
  if (!selectedFile.value) {
    showErrorToast('No file selected', 'Error')
    return
  }
  if (!selectedBatch.value) {
    showErrorToast('Please select a selection batch', 'Error')
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
      'Failed to process file. Check the format and try again.'
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
          <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">Enrollment</h1>
          <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
            Upload Excel (.xlsx) files to import student enrollment data.
          </p>
        </div>

        <!-- History button -->
        <router-link
          to="/enrollment/history"
          class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 hover:text-[#374151] dark:hover:text-gray-200"
        >
          <History class="w-4 h-4" />
          <span class="hidden sm:inline">View History</span>
        </router-link>
      </div>

      <!-- Upload View -->
      <!-- Import Upload Card -->
        <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
        <!-- Batch Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
            Selection Batch / Intake Year
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
                <div>
                  <span v-if="selectedBatch" class="text-sm font-medium text-[#111827] dark:text-white">
                    {{ selectedBatch.name }}
                  </span>
                  <span v-if="selectedBatch" class="text-xs text-[#6B7280] dark:text-gray-400 ml-2">
                    {{ selectedBatch.year }}
                    <span v-if="selectedBatch.students_count !== undefined" class="ml-2">· {{ selectedBatch.students_count }} students</span>
                  </span>
                  <span v-else class="text-sm text-[#9CA3AF]">
                    {{ isLoadingBatches ? 'Loading batches...' : 'Select a batch' }}
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
                    <h2 class="text-lg font-semibold text-[#111827] dark:text-white">Select Batch</h2>
                    <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">Choose a selection batch to associate with this import</p>
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
                  <div v-if="isLoadingBatches" class="flex items-center justify-center py-10">
                    <svg class="w-6 h-6 text-[#355C8C] dark:text-blue-400 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  </div>

                  <div v-else-if="batches.length === 0" class="flex flex-col items-center justify-center py-10 text-center">
                    <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                      <Layers class="w-6 h-6 text-[#9CA3AF]" />
                    </div>
                    <p class="text-sm font-medium text-[#374151] dark:text-gray-300">No batches available</p>
                    <p class="text-xs text-[#9CA3AF] mt-1">Create a new batch to get started.</p>
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
                          {{ batch.students_count }} students
                        </span>
                        <span v-if="batch.creator?.name" class="text-xs text-[#9CA3AF] dark:text-gray-500">
                          by {{ batch.creator.name }}
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
                    Create New Batch
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
            Cancel
          </button>
          <button
            :disabled="!canContinue"
            @click="onContinueToMapping"
            class="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
            :class="canContinue
              ? 'text-white bg-[#355C8C] dark:bg-blue-600 hover:bg-[#2A4A70] dark:hover:bg-blue-700 active:scale-[0.97] active:bg-[#1F3A5A] dark:active:bg-blue-800 cursor-pointer'
              : 'text-[#9CA3AF] dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'"
          >
            Continue to Mapping
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
            <h3 class="text-base font-semibold text-[#111827] dark:text-white">Expected Columns</h3>
            <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">Enforced on parse — ensure your file includes these columns</p>
          </div>
        </div>

        <!-- Columns Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">student_id_no</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">full_name</span>
            <span class="text-xs text-red-500 font-semibold">*</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">gender</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">dob</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">province</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">phone</span>
          </div>
          <div class="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-white/[0.02]">
            <span class="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0"></span>
            <span class="text-sm font-medium text-[#111827] dark:text-white">guardian</span>
          </div>
        </div>

        <!-- Info bar — shown only when there's an error -->
        <div
          v-if="uploadError || apiUploadError"
          class="flex items-start gap-2.5 p-3.5 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800"
        >
          <div class="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <span class="text-white text-xs font-bold">i</span>
          </div>
          <p class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Upload parses to a preview via <code class="font-mono font-semibold text-amber-900 dark:text-amber-200">POST /imports</code> — nothing is written yet. A fixed column template is agreed with the Selection Team up front (risk R2). Strict validation happens on the next screen.
          </p>
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
          <h2 class="text-xl font-semibold text-[#111827] dark:text-white mb-4">Create New Batch</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                Batch Name
              </label>
              <input
                v-model="newBatchName"
                type="text"
                placeholder="e.g., 2024 Intake Batch 1"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isCreatingBatch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                Intake Year
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
            Cancel
          </button>
          <button
            @click="onCreateBatch"
            :disabled="isCreatingBatch || !newBatchName.trim()"
            class="px-4 py-2 text-sm font-medium text-white bg-[#355C8C] dark:bg-blue-600 rounded-lg hover:bg-[#2A4A70] dark:hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isCreatingBatch" class="flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Creating...
            </span>
            <span v-else>Create Batch</span>
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
          <h2 class="text-xl font-semibold text-[#111827] dark:text-white mb-4">Edit Batch</h2>
          <p class="text-xs text-[#6B7280] dark:text-gray-400 mb-6 -mt-2">Update the name or intake year for this selection batch.</p>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                Batch Name
              </label>
              <input
                v-model="editBatchName"
                type="text"
                placeholder="e.g., 2024 Intake Batch 1"
                class="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-sm text-[#111827] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
                :disabled="isEditingBatch"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-[#374151] dark:text-gray-300 mb-2">
                Intake Year
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
            Cancel
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
              Saving...
            </span>
            <span v-else>Save Changes</span>
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
          <h2 class="text-lg font-semibold text-[#111827] dark:text-white">Delete Batch</h2>
          <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-2 leading-relaxed">
            Are you sure you want to delete
            <span class="font-semibold text-[#111827] dark:text-white">"{{ deletingBatch?.name }}"</span>?
            This action cannot be undone.
          </p>
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] dark:border-gray-800">
          <button
            @click="isDeleteConfirmOpen = false"
            :disabled="isDeletingBatch"
            class="px-4 py-2 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
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
              Deleting...
            </span>
            <span v-else class="flex items-center gap-2">
              <Trash2 class="w-4 h-4" />
              Delete
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
