<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

const processFile = (file: File) => {
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      emit('update:modelValue', e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
}

const openFileDialog = () => {
  fileInput.value?.click()
}

const removePhoto = () => {
  emit('update:modelValue', '')
}
</script>

<template>
  <div>
    <h3 class="text-sm font-bold text-gray-800 mb-3">Upload Student Photo</h3>
    <div
      @click="openFileDialog"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      class="relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
      :class="isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'"
    >
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileSelect"
      />
      
      <div v-if="modelValue" class="relative inline-block">
        <img
          :src="modelValue"
          alt="Student Photo"
          class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
        />
        <button
          @click.stop="removePhoto"
          class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      <div v-else class="space-y-2">
        <div class="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <div>
          <p class="text-sm font-medium text-gray-700">Click or drag photo here</p>
          <p class="text-xs text-gray-500">PNG, JPG up to 5MB</p>
        </div>
      </div>
    </div>
  </div>
</template>
