<script setup lang="ts">
import { Info } from 'lucide-vue-next'

defineOptions({ name: 'ImportTips' })
</script>

<template>
  <div class="bg-white dark:bg-[#131B2E] rounded-xl shadow-sm border border-[#E5E7EB] dark:border-gray-800 p-5">
    <div class="flex items-center gap-2.5 mb-4">
      <div class="w-8 h-8 rounded-lg bg-[#355C8C]/10 dark:bg-blue-900/30 flex items-center justify-center">
        <Info class="w-4 h-4 text-[#355C8C] dark:text-blue-400" />
      </div>
      <h3 class="text-sm font-semibold text-[#111827] dark:text-white">Import Tips</h3>
    </div>
    <ul class="space-y-2.5">
      <li class="flex items-start gap-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed">
        <span class="text-[#355C8C] dark:text-blue-400 font-bold mt-0.5 shrink-0">•</span>
        Ensure your column headers are clearly labeled.
      </li>
      <li class="flex items-start gap-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed">
        <span class="text-[#355C8C] dark:text-blue-400 font-bold mt-0.5 shrink-0">•</span>
        Dates should be in MM/DD/YYYY format.
      </li>
      <li class="flex items-start gap-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed">
        <span class="text-[#355C8C] dark:text-blue-400 font-bold mt-0.5 shrink-0">•</span>
        Maximum file size is 25MB.
      </li>
      <li class="flex items-start gap-2.5 text-[13px] text-[#6B7280] dark:text-gray-400 leading-relaxed">
        <span class="text-[#355C8C] dark:text-blue-400 font-bold mt-0.5 shrink-0">•</span>
        Only .xlsx (Excel) files are supported.
      </li>
    </ul>
  </div>
</template>
