<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { evaluationApi, type EvaluationHistoryResponse, type EvaluationHistoryItem } from '@/services/api/evaluation'
import { useStudentsStore } from '@/stores/students'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
import type { Student } from '@/types'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Clock,
  BarChartHorizontal,
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  Target,
  Activity,
  ArrowUp,
  ArrowDown,
  Search,
  User,
} from 'lucide-vue-next'

// Chart.js
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const { showErrorToast } = useToast()

// ── State ──
const historyData = ref<EvaluationHistoryResponse | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref<string | null>(null)
const studentSearchQuery = ref('')
const selectedStudent = ref<Student | null>(null)
const studentSearchResults = ref<Student[]>([])

// ── Computed ──

// Evaluations in chronological order (oldest first) for the chart
const sortedEvaluations = computed(() => {
  if (!historyData.value?.evaluations) return []
  return [...historyData.value.evaluations].reverse()
})

const trendSummary = computed(() => historyData.value?.trend_summary)

const chartLabels = computed(() =>
  sortedEvaluations.value.map(e => e.evaluation_period || `#${e.id}`)
)

const chartScores = computed(() =>
  sortedEvaluations.value.map(e => e.total_score)
)

// Determine colors for chart bars based on period-over-period
const chartColors = computed(() => {
  const colors: string[] = []
  for (let i = 0; i < sortedEvaluations.value.length; i++) {
    const ev = sortedEvaluations.value[i]
    if (i === 0) {
      colors.push('rgba(59, 130, 246, 0.85)') // Blue for first
    } else if (ev.period_over_period) {
      const change = parseFloat(ev.period_over_period.change)
      if (change > 0) colors.push('rgba(16, 185, 129, 0.85)') // Green for improvement
      else if (change < 0) colors.push('rgba(239, 68, 68, 0.85)') // Red for decline
      else colors.push('rgba(148, 163, 184, 0.85)') // Gray for flat
    } else {
      colors.push('rgba(59, 130, 246, 0.85)') // Blue default
    }
  }
  return colors
})

const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: t('evaluation_trend.chart_label'),
      data: chartScores.value,
      backgroundColor: chartColors.value,
      borderColor: chartColors.value.map(c => c.replace('0.85', '1')),
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.55,
      categoryPercentage: 0.7,
    },
  ],
}))

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E293B',
      titleColor: '#F1F5F9',
      bodyColor: '#CBD5E1',
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        title: (items) => items[0]?.label ?? '',
        label: (ctx) => `Score: ${ctx.parsed.y.toFixed(2)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 10, weight: '600' as any },
      },
    },
    y: {
      grid: { color: '#F1F5F9' },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 10 },
      },
      beginAtZero: true,
    },
  },
}

// ── Trajectory indicator ──
const trajectoryInfo = computed(() => {
  const summary = trendSummary.value
  if (!summary || summary.total_evaluations < 2) {
    return { icon: Minus, text: t('evaluation_trend.trajectory_insufficient'), color: '#9CA3AF', value: '—' }
  }

  // Parse improvement rate
  const rateStr = summary.improvement_rate
  const isPositive = rateStr.startsWith('+')
  const isNegative = rateStr.startsWith('-')

  if (isPositive) {
    return { icon: TrendingUp, text: t('evaluation_trend.trajectory_improving'), color: '#10B981', value: rateStr }
  } else if (isNegative) {
    return { icon: TrendingDown, text: t('evaluation_trend.trajectory_declining'), color: '#EF4444', value: rateStr }
  }
  return { icon: Minus, text: t('evaluation_trend.trajectory_stable'), color: '#F59E0B', value: rateStr }
})

// ── Helpers ──
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function changeColor(change: string): string {
  if (change.startsWith('+')) return 'text-emerald-600 dark:text-emerald-400'
  if (change.startsWith('-')) return 'text-red-500 dark:text-red-400'
  return 'text-gray-500 dark:text-gray-400'
}

function changeIcon(change: string) {
  if (change.startsWith('+')) return ArrowUp
  if (change.startsWith('-')) return ArrowDown
  return Minus
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-blue-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-400'
}

// ── Student search ──
function searchStudent() {
  const query = studentSearchQuery.value.toLowerCase().trim()
  if (!query) {
    studentSearchResults.value = []
    return
  }
  studentSearchResults.value = studentsStore.students.filter(
    s =>
      s.fullName.toLowerCase().includes(query) ||
      s.studentIdNo.toLowerCase().includes(query)
  ).slice(0, 10)
}

function selectStudent(student: Student) {
  selectedStudent.value = student
  studentSearchQuery.value = `${student.fullName} (${student.studentIdNo})`
  studentSearchResults.value = []
  // Navigate to the trend page for this student
  router.push(`/students/${student.id}/evaluations/trend`)
}

function clearStudentSelection() {
  selectedStudent.value = null
  studentSearchQuery.value = ''
  historyData.value = null
}

// ── Fetch ──
async function fetchHistory() {
  const studentId = route.params.studentId as string
  if (!studentId) {
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  try {
    const data = await evaluationApi.getHistory(Number(studentId))
    historyData.value = data
  } catch (err: any) {
    console.error('[EvaluationTrend] Failed to fetch evaluation history:', err)
    error.value = err?.response?.data?.message || t('evaluation_trend.fetch_failed')
    showErrorToast(t('evaluation_trend.fetch_failed'), t('evaluation_trend.error_title'))
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refreshData() {
  refreshing.value = true
  await fetchHistory()
}

function goBack() {
  const studentId = route.params.studentId as string
  if (studentId) {
    router.push(`/students/${studentId}/profile?tab=evaluation`)
  } else if (selectedStudent.value) {
    router.push(`/students/${selectedStudent.value.id}/profile?tab=evaluation`)
  } else {
    router.push('/students')
  }
}

// Watch for route param changes (searching for a different student)
watch(() => route.params.studentId, (newId) => {
  if (newId) {
    fetchHistory()
  } else {
    historyData.value = null
    selectedStudent.value = null
    studentSearchQuery.value = ''
    loading.value = false
    error.value = null
  }
})

const { start: startPolling } = usePolling(() => {
  if (route.params.studentId) {
    fetchHistory()
  }
}, 10_000)

onMounted(async () => {
  // Pre-load students for search
  if (studentsStore.students.length === 0) {
    try {
      await studentsStore.fetchAll({ page: 1 })
    } catch { /* ignore */ }
  }
  fetchHistory()
  startPolling()
})
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-5 evaluation-trend-enter">
    <!-- ═══ HEADER ═══ -->
    <div
      class="relative overflow-hidden rounded-[14px] p-5 sm:p-6 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#162d4a] dark:from-[#0f1929] dark:via-[#0f1929] dark:to-[#0a1420] border border-[#355C8C]/30 dark:border-gray-800 animate-fadeIn"
    >
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px"></div>
      <div class="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-emerald-500/8 blur-3xl"></div>
      <div class="relative flex items-start justify-between">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="w-11 h-11 rounded-[12px] bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-xl shadow-black/10 ring-1 ring-white/20">
            <Activity :size="20" class="text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2 mb-0.5">
              <h1 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                {{ t('evaluation_trend.title') }}
              </h1>
              <span class="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold text-white/70 backdrop-blur-sm border border-white/10">Trend</span>
            </div>
            <p class="text-sm text-white/70">
              {{ historyData?.student_name ? `${historyData.student_name} — ${t('evaluation_trend.subtitle')}` : t('evaluation_trend.subtitle') }}
            </p>
          </div>
        </div>
        <button
          @click="goBack"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 text-xs font-medium cursor-pointer"
        >
          <ChevronLeft :size="14" />
          {{ t('evaluation_trend.back') }}
        </button>
      </div>
    </div>

    <!-- ════════ LOADING ════════ -->
    <div
      v-if="loading"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-12 flex items-center justify-center animate-fadeIn"
    >
      <div class="flex items-center gap-2.5">
        <Loader2 :size="18" class="animate-spin text-blue-500" />
        <span class="text-sm text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.loading') }}</span>
      </div>
    </div>

    <!-- ════════ SELECT STUDENT (no studentId in route) ════════ -->
    <div
      v-else-if="!route.params.studentId && !historyData"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-10 flex flex-col items-center text-center animate-fadeIn"
    >
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
        <Activity :size="30" class="text-white" />
      </div>
      <h3 class="text-lg font-bold text-[#111827] dark:text-white mb-1">{{ t('evaluation_trend.select_student_title') }}</h3>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 max-w-md mb-6">
        {{ t('evaluation_trend.select_student_hint') }}
      </p>

      <!-- Search input -->
      <div class="relative w-full max-w-md">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search :size="16" class="text-[#9CA3AF] dark:text-gray-500" />
        </div>
        <input
          v-model="studentSearchQuery"
          @input="searchStudent"
          type="text"
          :placeholder="t('evaluation_trend.search_placeholder')"
          class="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-[#F9FAFB] dark:bg-white/[0.04] text-sm text-[#374151] dark:text-gray-200 placeholder:text-[#9CA3AF] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-200"
        />
      </div>

      <!-- Search results -->
      <div v-if="studentSearchResults.length > 0" class="w-full max-w-md mt-3 rounded-xl border border-[#E5E7EB] dark:border-gray-700 bg-white dark:bg-[#131B2E] overflow-hidden shadow-lg">
        <button
          v-for="student in studentSearchResults"
          :key="student.id"
          @click="selectStudent(student)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] dark:hover:bg-white/[0.04] transition-colors duration-150 border-b border-[#E5E7EB] dark:border-gray-700/50 last:border-b-0 cursor-pointer"
        >
          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {{ student.fullName.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-[#374151] dark:text-gray-200 truncate">{{ student.fullName }}</p>
            <p class="text-xs text-[#9CA3AF] dark:text-gray-500">{{ student.studentIdNo }} · {{ student.selectionBatchName || '—' }}</p>
          </div>
        </button>
      </div>

      <!-- No results -->
      <p v-if="studentSearchQuery && studentSearchResults.length === 0" class="text-xs text-[#9CA3AF] dark:text-gray-500 mt-3">
        {{ t('evaluation_trend.no_students_found') }}
      </p>
    </div>

    <!-- ════════ ERROR ════════ -->
    <div
      v-else-if="error"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-10 flex flex-col items-center text-center animate-fadeIn"
    >
      <div class="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4 border border-red-200 dark:border-red-500/20">
        <AlertCircle :size="26" class="text-red-400 dark:text-red-400" />
      </div>
      <h3 class="text-sm font-semibold text-[#111827] dark:text-white mb-1">{{ t('evaluation_trend.error_title') }}</h3>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 max-w-xs">{{ error }}</p>
      <div class="flex items-center gap-2.5 mt-5">
        <button
          @click="fetchHistory"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-[0.97] cursor-pointer"
        >
          <RefreshCw :size="15" />
          {{ t('evaluation_trend.retry') }}
        </button>
        <button
          @click="goBack"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#374151] dark:text-gray-200 bg-[#F3F4F6] dark:bg-gray-700 rounded-xl hover:bg-[#E5E7EB] dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
        >
          {{ t('evaluation_trend.back_to_student') }}
        </button>
      </div>
    </div>

    <!-- ════════ EMPTY ════════ -->
    <div
      v-else-if="!historyData || historyData.evaluations.length === 0"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-10 flex flex-col items-center text-center animate-fadeIn"
    >
      <div class="w-14 h-14 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.04] flex items-center justify-center mb-4 border border-[#E5E7EB] dark:border-gray-700">
        <BarChart3 :size="26" class="text-[#9CA3AF] dark:text-gray-500" />
      </div>
      <h3 class="text-sm font-semibold text-[#111827] dark:text-white mb-1">{{ t('evaluation_trend.no_data') }}</h3>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 max-w-xs">
        {{ t('evaluation_trend.no_data_hint') }}
      </p>
      <button
        @click="goBack"
        class="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-[0.97] cursor-pointer"
      >
        <ChevronLeft :size="15" />
        {{ t('evaluation_trend.back_to_student') }}
      </button>
    </div>

    <!-- ════════ TREND CONTENT ════════ -->
    <template v-else>
      <!-- ═══ TREND SUMMARY CARDS ═══ -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-fadeIn">
        <!-- Average Score -->
        <div class="rounded-[12px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold tracking-[0.1em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('evaluation_trend.avg_score') }}</span>
            <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110" style="box-shadow: 0 2px 8px rgba(59,130,246,0.15)">
              <Target :size="16" class="text-blue-500" />
            </div>
          </div>
          <p class="text-lg sm:text-xl font-bold text-[#111827] dark:text-white tracking-tight tabular-nums">
            {{ trendSummary?.average_score.toFixed(2) || '0.00' }}
          </p>
          <div class="mt-2 h-1.5 rounded-full bg-[#F3F4F6] dark:bg-gray-800 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-out"
              :style="{
                width: `${Math.min((trendSummary?.average_score || 0) / 100 * 100, 100)}%`,
                background: 'linear-gradient(to right, #3B82F680, #3B82F6)'
              }"
            ></div>
          </div>
        </div>

        <!-- Improvement Rate -->
        <div class="rounded-[12px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold tracking-[0.1em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('evaluation_trend.improvement') }}</span>
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
              :class="trajectoryInfo.color === '#10B981' ? 'bg-emerald-50 dark:bg-emerald-500/10' : trajectoryInfo.color === '#EF4444' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-amber-50 dark:bg-amber-500/10'"
              :style="{ boxShadow: `0 2px 8px ${trajectoryInfo.color}15` }"
            >
              <component :is="trajectoryInfo.icon" :size="16" :style="{ color: trajectoryInfo.color }" />
            </div>
          </div>
          <p class="text-lg sm:text-xl font-bold tracking-tight tabular-nums" :style="{ color: trajectoryInfo.color }">
            {{ trendSummary?.improvement_rate || '0%' }}
          </p>
          <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-1">{{ trajectoryInfo.text }}</p>
        </div>

        <!-- Best Period -->
        <div class="rounded-[12px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold tracking-[0.1em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('evaluation_trend.best_period') }}</span>
            <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110" style="box-shadow: 0 2px 8px rgba(245,158,11,0.15)">
              <Award :size="16" class="text-amber-500" />
            </div>
          </div>
          <p class="text-lg sm:text-xl font-bold text-[#111827] dark:text-white tracking-tight truncate">
            {{ trendSummary?.best_period || '—' }}
          </p>
          <div class="flex items-center gap-1 mt-1">
            <span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{{ trendSummary?.best_score?.toFixed(1) || '—' }}</span>
            <span class="text-[11px] text-[#9CA3AF] dark:text-gray-500">pts</span>
          </div>
        </div>

        <!-- Total Evaluations -->
        <div class="rounded-[12px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md group relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold tracking-[0.1em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('evaluation_trend.total_evals') }}</span>
            <div class="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110" style="box-shadow: 0 2px 8px rgba(139,92,246,0.15)">
              <BarChart3 :size="16" class="text-purple-500" />
            </div>
          </div>
          <p class="text-lg sm:text-xl font-bold text-[#111827] dark:text-white tracking-tight tabular-nums">
            {{ trendSummary?.total_evaluations || 0 }}
          </p>
          <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-1">{{ t('evaluation_trend.periods_compared') }}</p>
        </div>
      </div>

      <!-- ═══ BAR CHART ═══ -->
      <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 animate-fadeIn relative overflow-hidden" style="animation-delay: 0.15s">
        <div class="absolute top-0 left-4 right-4 h-[3px] bg-gradient-to-r from-blue-400/50 via-blue-500 to-blue-400/50 rounded-full"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <BarChartHorizontal :size="14" class="text-white" />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('evaluation_trend.score_comparison') }}</h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.score_comparison_sub') }}</p>
            </div>
          </div>
          <span class="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1">
            <BarChart3 :size="11" class="animate-pulse-subtle" />
            {{ t('evaluation_trend.bar_badge') }}
          </span>
        </div>
        <div class="h-[260px] w-full chart-container">
          <Bar v-if="sortedEvaluations.length > 0" :data="chartData" :options="chartOptions" />
        </div>
        <!-- Chart legend -->
        <div class="flex items-center gap-4 mt-3 pt-3 border-t border-[#E5E7EB] dark:border-gray-800">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-[rgba(16,185,129,0.85)]"></span>
            <span class="text-[10px] text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.legend_improved') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-[rgba(239,68,68,0.85)]"></span>
            <span class="text-[10px] text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.legend_declined') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-sm bg-[rgba(59,130,246,0.85)]"></span>
            <span class="text-[10px] text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.legend_baseline') }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ COMPARISON TABLE ═══ -->
      <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 animate-fadeIn relative overflow-hidden" style="animation-delay: 0.25s">
        <div class="absolute top-0 left-4 right-4 h-[3px] bg-gradient-to-r from-emerald-400/50 via-emerald-500 to-emerald-400/50 rounded-full"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <BarChart3 :size="14" class="text-white" />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('evaluation_trend.detail_comparison') }}</h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.detail_comparison_sub') }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="refreshData"
              :disabled="refreshing"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 text-[#6B7280] dark:text-gray-400 hover:text-[#374151] dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw :size="12" :class="{ 'animate-spin': refreshing }" />
              {{ t('evaluation_trend.refresh') }}
            </button>
          </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[#E5E7EB] dark:border-gray-700">
                <th class="text-left py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_period') }}</th>
                <th class="text-right py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_score') }}</th>
                <th class="text-right py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_change') }}</th>
                <th class="text-center py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_vs_previous') }}</th>
                <th class="text-left py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_status') }}</th>
                <th class="text-left py-3 px-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#6B7280] dark:text-gray-400">{{ t('evaluation_trend.col_date') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(ev, idx) in sortedEvaluations"
                :key="ev.id"
                class="border-b border-[#E5E7EB] dark:border-gray-700/50 transition-colors duration-150 hover:bg-[#F9FAFB] dark:hover:bg-white/[0.02]"
                :class="{
                  'bg-emerald-50/30 dark:bg-emerald-500/[0.03]': ev.period_over_period && parseFloat(ev.period_over_period.change) > 0,
                  'bg-red-50/30 dark:bg-red-500/[0.03]': ev.period_over_period && parseFloat(ev.period_over_period.change) < 0,
                }"
              >
                <td class="py-3 px-2">
                  <div class="flex items-center gap-1.5">
                    <CalendarDays :size="12" class="text-[#9CA3AF] dark:text-gray-500 flex-shrink-0" />
                    <span class="text-sm font-medium text-[#374151] dark:text-gray-200">
                      {{ ev.evaluation_period || `#${ev.id}` }}
                    </span>
                  </div>
                </td>
                <td class="py-3 px-2 text-right">
                  <span class="text-sm font-bold tabular-nums" :class="scoreBarColor(ev.total_score).replace('bg-', 'text-')">
                    {{ ev.total_score.toFixed(2) }}
                  </span>
                </td>
                <td class="py-3 px-2 text-right">
                  <template v-if="ev.period_over_period">
                    <span class="text-sm font-semibold tabular-nums" :class="changeColor(ev.period_over_period.change)">
                      {{ ev.period_over_period.change }}
                    </span>
                  </template>
                  <span v-else class="text-sm text-[#9CA3AF] dark:text-gray-500">—</span>
                </td>
                <td class="py-3 px-2 text-center">
                  <template v-if="ev.period_over_period">
                    <div class="inline-flex items-center gap-1">
                      <!-- Mini bar -->
                      <div class="w-20 h-2 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          :class="scoreBarColor(ev.total_score)"
                          :style="{ width: `${(ev.total_score / 100) * 100}%` }"
                        ></div>
                      </div>
                      <span
                        class="text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums"
                        :class="changeColor(ev.period_over_period.change)"
                      >
                        {{ ev.period_over_period.change_percent }}
                      </span>
                    </div>
                  </template>
                  <span v-else class="text-[10px] text-[#9CA3AF] dark:text-gray-500">{{ t('evaluation_trend.baseline') }}</span>
                </td>
                <td class="py-3 px-2">
                  <span
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold"
                    :class="ev.status === 'Approved' || ev.status === 'Completed'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : ev.status === 'Pending'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                      : 'bg-gray-50 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600/30'"
                  >
                    {{ ev.status }}
                  </span>
                </td>
                <td class="py-3 px-2">
                  <div class="flex items-center gap-1.5">
                    <Clock :size="11" class="text-[#9CA3AF] dark:text-gray-500 flex-shrink-0" />
                    <span class="text-xs text-[#6B7280] dark:text-gray-400">{{ formatDate(ev.submitted_at) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════
   ENTRANCE ANIMATIONS
   ═══════════════════════════════════════════ */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-subtle {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out both;
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

.chart-container {
  animation: scaleIn 0.6s ease-out 0.3s both;
}

.evaluation-trend-enter {
  animation: fadeIn 0.3s ease-out;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* ─── Dark mode tweaks ─── */
@media (prefers-reduced-motion: reduce) {
  .animate-fadeIn,
  .chart-container {
    animation: none !important;
  }
}

/* ─── Derived text colors from bg classes ─── */
.text-emerald-500 {
  color: #10B981;
}
.text-blue-500 {
  color: #3B82F6;
}
.text-amber-500 {
  color: #F59E0B;
}
.text-red-400 {
  color: #F87171;
}
</style>
