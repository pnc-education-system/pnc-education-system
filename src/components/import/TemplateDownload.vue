<script setup lang="ts">
import { Download } from 'lucide-vue-next'
import { downloadSampleCsv } from '@/composables/useFileUpload'

defineOptions({ name: 'TemplateDownload' })
</script>

<template>
  <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm border border-[#E5E7EB] dark:border-gray-800 p-5">
    <div class="flex items-center gap-2.5 mb-4">
      <div class="w-8 h-8 rounded-lg bg-[#355C8C]/10 dark:bg-blue-900/30 flex items-center justify-center">
        <Download class="w-4 h-4 text-[#355C8C] dark:text-blue-400" />
      </div>
      <h3 class="text-sm font-semibold text-[#111827] dark:text-white">Template</h3>
    </div>
    <p class="text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed mb-4">
      Not sure how to format your data?
      <br />
      Download our sample enrollment template.
    </p>
    <button
      @click="downloadSampleCsv"
      class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:scale-[0.97] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 dark:focus:ring-offset-gray-900"
    >
      <Download class="w-4 h-4" />
      Download Template
    </button>
  </div>
</template>
