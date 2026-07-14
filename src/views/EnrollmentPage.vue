<script setup lang="ts">
defineOptions({ name: 'EnrollmentPage' })

import { AlertCircle } from 'lucide-vue-next'

import { useFileUpload, ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_MB } from '@/composables/useFileUpload'
import ImportDropzone from '@/components/import/ImportDropzone.vue'
import FilePreview from '@/components/import/FilePreview.vue'
import ImportTips from '@/components/import/ImportTips.vue'
import TemplateDownload from '@/components/import/TemplateDownload.vue'

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

function onContinueToMapping(): void {
  // TODO: Navigate to mapping view with the selected file
}
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">Enrollment</h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Upload Excel or CSV files to import student enrollment data.</p>
      </div>
    </div>

    <!-- Import Upload Card -->
    <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
      <input
        ref="fileInputRef"
        type="file"
        :accept="ACCEPTED_EXTENSIONS"
        class="hidden"
        @change="onFileInputChange"
      />

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
        @remove="removeFile"
      />

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

      <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB] dark:border-gray-800">
        <button
          @click="removeFile"
          class="px-5 py-2.5 text-sm font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-transparent border border-[#D1D5DB] dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          :disabled="!canContinue"
          @click="onContinueToMapping"
          class="px-5 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-all duration-200"
          :class="canContinue
            ? 'text-white bg-[#355C8C] dark:bg-blue-600 hover:bg-[#2A4A70] cursor-pointer'
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
</template>
