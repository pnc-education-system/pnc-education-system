<script setup lang="ts">
import type { Student } from '@/types'
import { FileText, AlertTriangle, MessageSquare, Award, Calendar } from 'lucide-vue-next'

defineProps<{ student: Student }>()

const records = [
  { type: 'note', title: 'Academic performance review', date: '2025-09-15', description: 'Student shows consistent improvement in mathematics and science subjects.', icon: FileText, gradient: 'from-blue-500 to-blue-600', borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/30' },
  { type: 'incident', title: 'Late submission — Lab report #3', date: '2025-08-28', description: 'Submitted 2 days after deadline. Warning issued.', icon: AlertTriangle, gradient: 'from-amber-500 to-amber-600', borderHover: 'hover:border-amber-200 dark:hover:border-amber-500/30' },
  { type: 'achievement', title: 'Hackathon participation', date: '2025-07-20', description: 'Represented PNC in the National Coding Challenge and secured 2nd place.', icon: Award, gradient: 'from-purple-500 to-purple-600', borderHover: 'hover:border-purple-200 dark:hover:border-purple-500/30' },
  { type: 'note', title: 'Mentor feedback session', date: '2025-06-10', description: 'Positive feedback from mentor regarding teamwork and leadership skills.', icon: MessageSquare, gradient: 'from-emerald-500 to-emerald-600', borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-500/30' },
]

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="space-y-3.5">
    <div v-for="(record, index) in records" :key="index"
      class="group p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 cursor-default hover:shadow-md hover:-translate-y-0.5"
      :class="record.borderHover">
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-transform duration-300 group-hover:scale-110" :class="record.gradient">
          <component :is="record.icon" :size="17" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">{{ record.title }}</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{{ record.description }}</p>
            </div>
            <span class="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2.5 py-1 rounded-full whitespace-nowrap mt-0.5">
              <Calendar :size="11" />
              {{ formatDate(record.date) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="records.length === 0" class="py-16 text-center">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
        <FileText :size="32" class="text-gray-300 dark:text-gray-600" />
      </div>
      <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No records found</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Student records will appear here once available.</p>
    </div>
  </div>
</template>
