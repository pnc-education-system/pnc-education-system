<script setup lang="ts">
import { FileSpreadsheet, CheckCircle } from 'lucide-vue-next'
import { formatFileSize } from '@/composables/useFileUpload'

defineOptions({ name: 'FilePreview' })

const props = defineProps<{
  file: File
  isUploading?: boolean
}>()

const emit = defineEmits<{
  remove: []
  upload: []
}>()

function getFormattedSize(): string {
  return formatFileSize(props.file.size)
}
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-8">
    <div class="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
      <FileSpreadsheet class="w-7 h-7 text-green-600 dark:text-green-400" />
    </div>
    <div class="text-center">
      <p class="text-sm font-medium text-[#111827] dark:text-white">{{ file.name }}</p>
      <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-1">{{ getFormattedSize() }}</p>
    </div>
    <div class="flex items-center gap-1.5 mt-1">
      <CheckCircle class="w-4 h-4 text-green-500" />
      <span class="text-xs font-medium text-green-600 dark:text-green-400">File is ready to upload</span>
    </div>
    <div class="flex gap-3 mt-2">
      <button
        @click.stop="emit('remove')"
        class="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
      >
        Remove
      </button>
      <button
        @click.stop="emit('upload')"
        :disabled="isUploading"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isUploading" class="flex items-center gap-2">
          <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Uploading...
        </span>
        <span v-else>Upload File</span>
      </button>
    </div>
  </div>
</template>
