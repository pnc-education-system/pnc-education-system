<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { studentsApi } from '@/services/api/students'
import type { Student, StudentActivity } from '@/types'
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Clock,
  GraduationCap,
  Layers,
  UserCheck,
} from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{ student: Student }>()

const history = ref<StudentActivity[]>([])
const loadingHistory = ref(false)

// ── Build timeline from real data ──
type TimelineItem = {
  id: string
  status: string
  date: string
  note: string
  icon: any
  color: string
  performedBy?: string
}

const statusTimeline = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  // Add history entries from API
  for (const entry of history.value) {
      const isEnrolled = entry.title.toLowerCase().includes('enrolled')
      items.push({
        id: entry.id,
        status: entry.title,
        date: entry.date,
        note: entry.description,
        performedBy: entry.performed_by,
        icon: isEnrolled ? CheckCircle : entry.title.toLowerCase().includes('rejected') ? XCircle : AlertCircle,
        color: isEnrolled
          ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-500/20'
          : entry.title.toLowerCase().includes('rejected')
            ? 'text-red-600 bg-red-50 dark:bg-red-500/10 ring-red-500/20'
            : 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 ring-blue-500/20',
      })
    }

  // If no history from API, build from student's current data
  if (items.length === 0) {
    // Initial registration from created_at
    if (props.student.createdAt) {
      items.push({
        id: 'registered',
        status: t('enrollment_tab.registered') || 'Registered',
        date: props.student.createdAt,
        note: t('enrollment_tab.registered_note') || 'Student registration submitted.',
        icon: Loader,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 ring-blue-500/20',
      })
    }

    // Current status
    if (props.student.status) {
      let icon = AlertCircle
      let color = 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 ring-amber-500/20'
      let label = props.student.status.charAt(0).toUpperCase() + props.student.status.slice(1)
      let note = ''

      switch (props.student.status) {
        case 'enrolled':
          icon = CheckCircle
          color = 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-500/20'
          label = t('enrollment_tab.enrolled') || 'Enrolled'
          note = t('enrollment_tab.enrolled_note') || 'Student has been enrolled successfully.'
          break
        case 'rejected':
          icon = XCircle
          color = 'text-red-600 bg-red-50 dark:bg-red-500/10 ring-red-500/20'
          note = 'Student application was rejected.'
          break
        case 'graduated':
          icon = CheckCircle
          color = 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 ring-purple-500/20'
          note = 'Student has graduated.'
          break
        case 'dropped':
          icon = XCircle
          color = 'text-gray-600 bg-gray-50 dark:bg-gray-500/10 ring-gray-500/20'
          note = 'Student has dropped out.'
          break
        default: // pending
          icon = AlertCircle
          color = 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 ring-amber-500/20'
          label = 'Pending'
          note = 'Awaiting enrollment decision.'
      }

      const date = props.student.enrolledAt || props.student.updatedAt || props.student.createdAt
      items.push({
        id: `status-${props.student.status}`,
        status: label,
        date: date,
        note: note,
        icon,
        color,
      })
    }
  }

  // Sort by date ascending (oldest first)
  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

// ── Student enrollment info ──
const enrollmentInfo = computed(() => [
  { label: t('enrollment_tab.batch') || 'Batch', value: props.student.selectionBatchName || '—', icon: Layers },
  { label: t('enrollment_tab.intake_year') || 'Intake Year', value: props.student.intakeYear || '—', icon: GraduationCap },
  { label: 'Status', value: (props.student.status || 'pending').charAt(0).toUpperCase() + (props.student.status || 'pending').slice(1), icon: UserCheck },
  { label: 'Enrolled Date', value: props.student.enrolledAt ? formatDate(props.student.enrolledAt) : '—', icon: Calendar },
  { label: 'Created', value: props.student.createdAt ? formatDate(props.student.createdAt) : '—', icon: Clock },
  { label: 'Last Updated', value: props.student.updatedAt ? formatDate(props.student.updatedAt) : '—', icon: Clock },
])

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

async function loadHistory() {
  const studentId = Number(props.student.id)
  if (!studentId) return

  loadingHistory.value = true
  try {
    const result = await studentsApi.getHistory(studentId)
    history.value = result.filter(h => h.type === 'status_change')
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      console.error('Failed to load enrollment history:', error)
    }
  } finally {
    loadingHistory.value = false
  }
}

onMounted(loadHistory)
watch(() => props.student.id, loadHistory)
</script>

<template>
  <div class="space-y-6">
    <!-- Enrollment Info Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div
        v-for="(info, idx) in enrollmentInfo"
        :key="idx"
        class="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-600 transition-all duration-200"
      >
        <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center flex-shrink-0 shadow-sm">
          <component :is="info.icon" :size="16" class="text-slate-500 dark:text-slate-400" />
        </div>
        <div class="min-w-0">
          <p class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{{ info.label }}</p>
          <p class="text-xs font-bold text-gray-800 dark:text-white mt-0.5 truncate">{{ info.value }}</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loadingHistory" class="flex items-center justify-center py-8">
      <Loader :size="20" class="text-blue-500 animate-spin" />
    </div>

    <!-- Timeline -->
    <template v-else>
      <div v-if="statusTimeline.length > 0" class="relative px-2">
        <div class="absolute left-[23px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-200 via-emerald-200 to-emerald-300 dark:from-blue-500/30 dark:via-emerald-500/30 dark:to-emerald-500/40 rounded-full"></div>

        <div v-for="(item, index) in statusTimeline" :key="item.id" class="relative flex gap-5 pb-8 last:pb-0 group">
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
                  <p v-if="item.performedBy" class="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    by {{ item.performedBy }}
                  </p>
                </div>
                <span class="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <Calendar :size="11" />
                  {{ formatDateFull(item.date) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-12 text-center">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
          <Loader :size="32" class="text-gray-300 dark:text-gray-600" />
        </div>
        <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">{{ t('enrollment_tab.no_history') }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ t('enrollment_tab.no_history_hint') }}</p>
      </div>
    </template>
  </div>
</template>
