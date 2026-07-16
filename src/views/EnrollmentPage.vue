<script setup lang="ts">
defineOptions({ name: 'EnrollmentPage' })

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AlertCircle, History, ChevronDown, Plus } from 'lucide-vue-next'

import { useFileUpload, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/composables/useFileUpload'
import { importsApi, selectionBatchesApi } from '@/services/api'
import { useToast } from '@/composables/useToast'
import ImportDropzone from '@/components/import/ImportDropzone.vue'
import FilePreview from '@/components/import/FilePreview.vue'
import ImportTips from '@/components/import/ImportTips.vue'
import TemplateDownload from '@/components/import/TemplateDownload.vue'
import type { SelectionBatch } from '@/services/api/selectionBatches'

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

const {
  isDragOver,
  selectedFile,
  uploadError,
  fileInputRef,
  canContinue,
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

onMounted(async () => {
  await fetchBatches()
})

async function fetchBatches() {
  isLoadingBatches.value = true
  try {
    // Fetch all batches without year filter so users can select from any intake year
    batches.value = await selectionBatchesApi.list()
    // Auto-select the first batch if available
    if (batches.value.length > 0) {
      selectedBatch.value = batches.value[0]
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

function openCreateBatchModal() {
  isBatchDropdownOpen.value = false
  isCreateBatchModalOpen.value = true
  newBatchName.value = ''
  newBatchYear.value = new Date().getFullYear()
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
              class="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#355C8C]/30 dark:focus:ring-blue-400/30"
              :disabled="isLoadingBatches"
            >
              <span v-if="selectedBatch" class="text-sm text-[#111827] dark:text-white">
                {{ selectedBatch.name }} ({{ selectedBatch.year }})
              </span>
              <span v-else class="text-sm text-[#9CA3AF]">
                {{ isLoadingBatches ? 'Loading batches...' : 'Select a batch' }}
              </span>
              <ChevronDown class="w-4 h-4 text-[#6B7280] transition-transform" :class="isBatchDropdownOpen ? 'rotate-180' : ''" />
            </button>

            <!-- Dropdown -->
            <div
              v-if="isBatchDropdownOpen"
              class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-[#D1D5DB] dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-if="batches.length === 0 && !isLoadingBatches"
                class="px-4 py-3 text-sm text-[#9CA3AF]"
              >
                No batches available for current year
              </div>
              <button
                v-for="batch in batches"
                :key="batch.id"
                type="button"
                @click="selectedBatch = batch; isBatchDropdownOpen = false"
                class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                :class="selectedBatch?.id === batch.id ? 'bg-[#355C8C]/10 dark:bg-blue-600/20 text-[#355C8C] dark:text-blue-400' : 'text-[#374151] dark:text-gray-300'"
              >
                <div class="flex items-center justify-between">
                  <span>{{ batch.name }}</span>
                  <span class="text-xs text-[#6B7280] dark:text-gray-400">{{ batch.year }}</span>
                </div>
              </button>
              <!-- Create new batch option -->
              <button
                type="button"
                @click="openCreateBatchModal"
                class="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-t border-[#E5E7EB] dark:border-gray-700 text-[#355C8C] dark:text-blue-400 font-medium"
              >
                <div class="flex items-center gap-2">
                  <Plus class="w-4 h-4" />
                  <span>Create new batch</span>
                </div>
              </button>
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
          @remove="removeFile"
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
            @click="removeFile"
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

      <!-- Info cards row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ImportTips />
        <TemplateDownload />
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
  </div>
</template>
