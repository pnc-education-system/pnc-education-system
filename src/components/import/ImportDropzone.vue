<script setup lang="ts">
import { Upload, FileUp } from 'lucide-vue-next'

defineOptions({ name: 'ImportDropzone' })

const props = defineProps<{
  isDragOver: boolean
  uploadError: string | null
  hasFile: boolean
  acceptedExtensions: string
  maxFileSizeMb: number
  dropZoneClasses: string
}>()

const emit = defineEmits<{
  dragenter: [e: DragEvent]
  dragover: [e: DragEvent]
  dragleave: [e: DragEvent]
  drop: [e: DragEvent]
  chooseFile: []
  fileInputChange: [e: Event]
}>()
</script>

<template>
  <div
    :class="dropZoneClasses"
    class="min-h-[200px] lg:min-h-[260px]"
    @dragenter.prevent="emit('dragenter', $event)"
    @dragover.prevent="emit('dragover', $event)"
    @dragleave.prevent="emit('dragleave', $event)"
    @drop.prevent="emit('drop', $event)"
    @click="!hasFile && !uploadError && emit('chooseFile')"
    tabindex="0"
    role="button"
    aria-label="Upload file drop zone"
  >
    <div class="flex flex-col items-center gap-4 py-10">
      <!-- Icon -->
      <div
        class="w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-300"
        :class="uploadError
          ? 'bg-red-50 dark:bg-red-900/10'
          : isDragOver
            ? 'bg-[#355C8C]/10 dark:bg-blue-900/20 scale-110'
            : 'bg-gray-50 dark:bg-gray-800'"
      >
        <FileUp
          class="w-8 h-8 transition-all duration-300"
          :class="uploadError
            ? 'text-red-400 dark:text-red-400'
            : isDragOver
              ? 'text-[#355C8C] dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500'"
        />
      </div>

      <!-- Text -->
      <div class="text-center space-y-1">
        <p class="text-sm text-[#374151] dark:text-gray-300">
          <span class="font-semibold text-[#111827] dark:text-white">Drag & Drop</span>
          your file here
        </p>
        <p class="text-xs text-[#9CA3AF] dark:text-gray-500">or</p>
      </div>

      <!-- Choose File Button -->
      <button
        @click.stop="emit('chooseFile')"
        class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-sm active:scale-[0.97] transition-all duration-200 cursor-pointer"
      >
        <Upload class="w-4 h-4" />
        Choose File
      </button>


    </div>
  </div>
</template>
