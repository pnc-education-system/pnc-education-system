<script setup lang="ts">
const emit = defineEmits<{
  flip: []
  details: []
  generate: []
  downloadPdf: []
  downloadPng: []
}>()

const handleFlip = () => {
  emit('flip')
}

const handleDetails = () => {
  emit('details')
}

const handleGenerate = () => {
  emit('generate')
}

const handleDownloadPdf = () => {
  emit('downloadPdf')
}

const handleDownloadPng = () => {
  emit('downloadPng')
}
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <button
      @click="handleFlip"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Flip
    </button>

    <button
      @click="handleDetails"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Details
    </button>

    <button
      @click="handleGenerate"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
      </svg>
      Generate
    </button>

    <button
      @click="handleDownloadPdf"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
      PDF
    </button>

    <button
      @click="handleDownloadPng"
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-semibold rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      PNG
    </button>
  </div>
</template>
