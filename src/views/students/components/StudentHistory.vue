<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { studentsApi } from '@/services/api/students'
import type { StudentActivity } from '@/services/api/students'
import { useToast } from '@/composables/useToast'
import {
  Clock,
  RefreshCw,
  FileText,
  ClipboardCheck,
  User,
} from 'lucide-vue-next'

const props = defineProps<{
  studentId: string | number
}>()

const { t } = useI18n()
const { showErrorToast } = useToast()

const history = ref<StudentActivity[]>([])
const isLoading = ref(false)

onMounted(() => {
  fetchHistory()
})

async function fetchHistory() {
  isLoading.value = true
  try {
    const studentIdNum = typeof props.studentId === 'string' ? Number(props.studentId) : props.studentId
    history.value = await studentsApi.getHistory(studentIdNum)
  } catch (err) {
    console.error('Failed to fetch student history:', err)
    showErrorToast('Failed to load activity history.', 'Load Error')
  } finally {
    isLoading.value = false
  }
}

function getEventIcon(type: string) {
  switch (type) {
    case 'status_change':
      return RefreshCw
    case 'evaluation':
      return ClipboardCheck
    case 'record_update':
      return FileText
    default:
      return Clock
  }
}

function getEventColor(type: string) {
  switch (type) {
    case 'status_change':
      return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20'
    case 'evaluation':
      return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'
    case 'record_update':
      return 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20'
    default:
      return 'bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400 border border-gray-100 dark:border-gray-500/20'
  }
}

function formatTimelineDate(dateStr: string): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6 py-4 animate-pulse">
      <div v-for="i in 3" :key="i" class="flex gap-4">
        <div class="flex flex-col items-center">
          <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div class="w-0.5 h-16 bg-gray-100 dark:bg-gray-800"></div>
        </div>
        <div class="flex-1 space-y-2 py-1">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div class="h-3 bg-gray-150 dark:bg-gray-800 rounded w-2/3"></div>
          <div class="h-3 bg-gray-100 dark:bg-gray-800/50 rounded w-1/4"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
      <div class="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-3 border border-gray-100 dark:border-gray-800">
        <Clock class="w-6 h-6 text-[#9CA3AF]" />
      </div>
      <p class="text-sm font-semibold text-[#374151] dark:text-gray-300">{{ t('student_history.empty') }}</p>
    </div>

    <!-- Timeline List -->
    <div v-else class="relative pl-4 border-l border-gray-100 dark:border-gray-800 space-y-6 py-2 ml-4">
      <div
        v-for="(item, index) in history"
        :key="item.id"
        class="relative group"
      >
        <!-- Circle icon on the timeline -->
        <span
          class="absolute -left-[33px] top-1.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
          :class="getEventColor(item.type)"
        >
          <component :is="getEventIcon(item.type)" class="w-4 h-4" />
        </span>

        <!-- Event content card -->
        <div class="flex flex-col gap-1 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 dark:bg-[#1e293b]/20 dark:hover:bg-[#1e293b]/40 border border-gray-100/50 dark:border-gray-800/30 transition-all duration-200">
          <div class="flex items-start justify-between gap-4">
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.title }}</h4>
            <span class="text-[11px] font-medium text-[#9CA3AF] dark:text-gray-400 font-mono shrink-0">{{ formatTimelineDate(item.date) }}</span>
          </div>

          <!-- Description -->
          <p class="text-xs text-[#4b5563] dark:text-gray-300 leading-relaxed">{{ item.description }}</p>

          <!-- Performed By -->
          <div class="flex items-center gap-1.5 mt-1 text-[11px] text-[#6B7280] dark:text-gray-400">
            <User class="w-3.5 h-3.5" />
            <span>{{ t('student_history.by', { name: item.performed_by }) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
