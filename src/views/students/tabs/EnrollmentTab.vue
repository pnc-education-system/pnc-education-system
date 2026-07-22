<script setup lang="ts">
import type { Student } from '@/types'
import { Calendar, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-vue-next'

defineProps<{ student: Student }>()

const statusHistory = [
  { status: 'Registered', date: '2025-03-15', note: 'Student registered in the system', icon: Loader, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 ring-blue-500/20' },
  { status: 'Documents Verified', date: '2025-03-20', note: 'All documents have been verified', icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-500/10 ring-green-500/20' },
  { status: 'Entrance Exam', date: '2025-04-02', note: 'Passed entrance examination', icon: AlertCircle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 ring-amber-500/20' },
  { status: 'Interview', date: '2025-04-10', note: 'Interview completed successfully', icon: CheckCircle, color: 'text-green-600 bg-green-50 dark:bg-green-500/10 ring-green-500/20' },
  { status: 'Enrolled', date: '2025-06-01', note: 'Officially enrolled at PNC', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-500/20' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="relative px-2">
    <div class="absolute left-[23px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-200 via-emerald-200 to-emerald-300 dark:from-blue-500/30 dark:via-emerald-500/30 dark:to-emerald-500/40 rounded-full"></div>

    <div v-for="(item, index) in statusHistory" :key="index" class="relative flex gap-5 pb-8 last:pb-0 group">
      <div class="relative z-10 flex-shrink-0 mt-0.5">
        <div class="w-[46px] h-[46px] rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md" :class="item.color">
          <component :is="item.icon" :size="18" />
        </div>
      </div>

      <div class="flex-1 min-w-0 pt-1.5">
        <div class="p-4 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-300">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-gray-900 dark:text-white">{{ item.status }}</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{{ item.note }}</p>
            </div>
            <span class="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2.5 py-1 rounded-full whitespace-nowrap">
              <Calendar :size="11" />
              {{ formatDate(item.date) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="statusHistory.length === 0" class="py-16 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
        <Loader :size="32" class="text-gray-300 dark:text-gray-600" />
      </div>
      <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No enrollment history</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Enrollment status updates will appear here.</p>
    </div>
  </div>
</template>
