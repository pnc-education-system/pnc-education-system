
<script setup lang="ts">
defineOptions({ name: 'DashboardPage' })

import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStudentsStore } from '@/stores/students'
import { useI18n } from 'vue-i18n'
import { usePolling } from '@/composables/usePolling'
import type { User } from '@/types'
import { reportsApi, type ReportSummary, type DashboardAggregateData } from '@/services/api/reports'
import { cardsApi, type CardStats } from '@/services/api/cards'
import { evaluationApi } from '@/services/api/evaluation'
import { selectionBatchesApi } from '@/services/api/selectionBatches'

// Lucide Icons
import {
  FileText,
  Users,
  BarChart3,
  Activity,
  Clock,
  CreditCard,
  ClipboardCheck,
} from 'lucide-vue-next'

// Chart.js
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const { t } = useI18n()
const authStore = useAuthStore()
const studentsStore = useStudentsStore()


const user = ref<User | null>(null)
const summary = ref<ReportSummary | null>(null)
const aggregates = ref<DashboardAggregateData | null>(null)
const cardStats = ref<CardStats | null>(null)
const evalTemplatesCount = ref(0)
const recordsCount = ref(0)
const lastUpdated = ref('just now')
const allBatches = ref<Array<{ id: number; name: string; year: number }>>([])

// ─── Summary stat cards (extracted for clean template rendering) ───
const summaryStats = computed(() => [
  { label: t('dashboard.total'), value: summary.value?.total_students ?? studentsStore.totalStudents, sub: t('dashboard.all_students'), icon: Users, color: '#3B82F6', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: t('dashboard.cards_generated'), value: summary.value?.total_cards ?? cardStats.value?.total_generated ?? '—', sub: t('dashboard.templates_count', { count: cardStats.value?.total_templates ?? '—' }), icon: CreditCard, color: '#10B981', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: t('dashboard.evaluations'), value: (summary.value?.total_evaluations ?? evalTemplatesCount.value) || '—', sub: evalTemplatesCount.value > 0 ? t('dashboard.eval_forms', { count: evalTemplatesCount.value }) : t('dashboard.total_evaluations'), icon: ClipboardCheck, color: '#8B5CF6', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { label: t('dashboard.records'), value: (summary.value?.total_records ?? recordsCount.value) || '—', sub: recordsCount.value > 0 ? t('dashboard.student_records') : t('dashboard.total_records'), icon: FileText, color: '#F59E0B', bg: 'bg-amber-50 dark:bg-amber-500/10' },
])

async function refreshDashboard() {
  if (authStore.user) {
    user.value = authStore.user
  }

  // Fetch student stats for dashboard
  await studentsStore.fetchAll()

  // Fetch full aggregates (includes summary stats + chart data) from the real dashboard endpoint
  try {
    const full = await reportsApi.getFullAggregates()
    aggregates.value = full
    summary.value = {
      total_students: full.demographics.total_students,
      total_cards: full.card_stats.total_cards,
      total_evaluations: full.evaluation_stats.total_evaluations,
      total_records: full.record_summary.total_records,
    }
  } catch {
    // API not available — fallback to just student store data
  }

  // Fetch card generation stats
  try {
    cardStats.value = await cardsApi.getStats()
  } catch {
    // API not available — fallback gracefully
  }

  // Fetch evaluation templates count as additional fallback
  try {
    const templates = await evaluationApi.getTemplates()
    evalTemplatesCount.value = templates.length
  } catch {
    // API not available
  }

  // Fetch all batches for the batch chart
  try {
    allBatches.value = await selectionBatchesApi.list()
  } catch {
    // API not available
  }

  // Estimate record count from store data (inactive/rejected students as proxy)
  recordsCount.value = studentsStore.students.filter(
    s => s.status === 'inactive' || s.status === 'rejected'
  ).length

  // Mark when data was last refreshed
  lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const { start: startPolling } = usePolling(refreshDashboard, 60_000)

onMounted(async () => {
  await refreshDashboard()
  startPolling()
})


// ──── Enrollment Flow (Chart.js Grouped Bar) — from real aggregates API ────
const flowChartData = computed(() => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const flow = aggregates.value?.enrollment_flow

  return {
    labels: months,
    datasets: [
      {
        label: t('enrollment_flow.submitted'),
        data: flow?.submitted ?? new Array(12).fill(0),
        backgroundColor: 'rgba(53, 92, 140, 0.85)',
        borderRadius: 3,
        barPercentage: 0.35,
      },
      {
        label: t('enrollment_flow.enrolled'),
        data: flow?.enrolled ?? new Array(12).fill(0),
        backgroundColor: 'rgba(147, 197, 253, 0.85)',
        borderRadius: 3,
        barPercentage: 0.35,
      },
    ],
  }
})

const flowChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        pointStyle: 'circle',
        color: '#6B7280',
        font: { family: 'Inter, sans-serif', size: 11, weight: 500 },
        padding: 16,
      },
    },
    tooltip: {
      backgroundColor: '#1E293B',
      titleColor: '#F1F5F9',
      bodyColor: '#CBD5E1',
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 10 },
        maxRotation: 0,
      },
    },
    y: {
      grid: { color: '#F1F5F9' },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 10 },
        stepSize: 30,
      },
      beginAtZero: true,
    },
  },
}

// ──── Enrollment by Batch (Chart.js Bar) — from real aggregates API ────
const batchChartData = computed(() => {
  const batchGroups = aggregates.value?.by_batch ?? []

  const labels = batchGroups.map(g => g.batch_name)
  const data = batchGroups.map(g => g.count)

  // Dim the last batch entry (current/in-progress)
  const bgColors = labels.map((_, i) =>
    i === labels.length - 1
      ? 'rgba(53, 92, 140, 0.45)'
      : 'rgba(53, 92, 140, 0.85)'
  )

  return {
    labels,
    datasets: [
      {
        label: t('enrollment_by_batch.label'),
        data,
        backgroundColor: bgColors,
        borderRadius: 4,
        barPercentage: 0.55,
        categoryPercentage: 0.8,
      },
    ],
  }
})

const batchChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E293B',
      titleColor: '#F1F5F9',
      bodyColor: '#CBD5E1',
      padding: 10,
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 12, weight: 500 },
      },
    },
    y: {
      grid: { color: '#F1F5F9' },
      border: { display: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 11 },
        stepSize: 25,
      },
      beginAtZero: true,
    },
  },
}

// ──── Student Status Distribution (Doughnut Chart) — from real aggregates API ────
const doughnutChartData = computed(() => {
  const statusLabels: Record<string, string> = {
    pending: t('dashboard.pending_students'),
    approved: t('dashboard.approved_students'),
    enrolled: t('dashboard.enrolled_students'),
    inactive: t('dashboard.inactive_students'),
    rejected: t('dashboard.rejected'),
    graduated: t('dashboard.graduated_status'),
    dropped: t('dashboard.dropped_status'),
  }
  const statusColors: Record<string, string> = {
    pending: '#F59E0B',
    approved: '#10B981',
    enrolled: '#3B82F6',
    inactive: '#6B7280',
    rejected: '#EF4444',
    graduated: '#8B5CF6',
    dropped: '#9CA3AF',
  }

  const rawStatusMap = aggregates.value?.demographics?.by_enrollment_status ?? {}

  // Backend returns capitalized enrollment_status keys (e.g. 'Pending', 'Enrolled')
  // Map them to lowercase to match frontend labels, then sort by count descending
  const statusEntries = Object.entries(rawStatusMap)
    .map(([status, count]) => {
      const key = status.toLowerCase()
      return {
        label: statusLabels[key] || status,
        count,
        key,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)

  return {
    labels: statusEntries.map(e => e.label),
    datasets: [
      {
        data: statusEntries.map(e => e.count),
        backgroundColor: statusEntries.map(e => statusColors[e.key] || '#93C5FD'),
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  }
})

const doughnutChartOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        pointStyle: 'circle',
        color: '#6B7280',
        font: { family: 'Inter, sans-serif', size: 10, weight: 500 },
        padding: 12,
      },
    },
    tooltip: {
      backgroundColor: '#1E293B',
      titleColor: '#F1F5F9',
      bodyColor: '#CBD5E1',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) => t('dashboard.students_tooltip', { count: ctx.parsed }),
      },
    },
  },
}
</script>
<template>
  <div
    class="space-y-6 dashboard-enter"
    style="
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
    "
  >
    <!-- ═══ HEADER ═══ -->
    <div class="relative overflow-hidden rounded-[14px] p-5 sm:p-6 bg-gradient-to-br from-[#1e3a5f] via-[#1e3a5f] to-[#162d4a] dark:from-[#0f1929] dark:via-[#0f1929] dark:to-[#0a1420] border border-[#355C8C]/30 dark:border-gray-800 animate-fadeIn">
      <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(circle at 1px 1px, white 1px, transparent 0); background-size: 24px 24px;"></div>
      <div class="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-blue-500/10 blur-3xl"></div>
      <div class="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-emerald-500/8 blur-3xl"></div>
      <div class="relative flex items-start justify-between">
        <div class="flex items-center gap-3 sm:gap-4">
          <div class="w-11 h-11 rounded-[12px] bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-xl shadow-black/10 ring-1 ring-white/20">
            <BarChart3 :size="20" class="text-white" />
          </div>
          <div>
            <div class="flex items-center gap-2 mb-0.5">
              <h1 class="text-lg sm:text-xl font-bold text-white tracking-tight">
                {{ t('dashboard.title') }}
              </h1>
              <span class="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold text-white/70 backdrop-blur-sm border border-white/10">v2.0</span>
            </div>
            <p class="text-sm text-white/70">
              {{ t('dashboard.welcome', { name: user?.name || 'Admin' }) }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span class="text-xs text-white/60 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10 flex items-center gap-1.5 shadow-sm">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span class="font-medium">Updated {{ lastUpdated }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- ═══ SUMMARY STATS ROW ═══ -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div
        v-for="(stat, i) in summaryStats"
        :key="stat.label"
        class="rounded-[12px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-3 sm:p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden animate-fadeIn"
        :style="{ animationDelay: `${i * 0.1}s` }"
      >
        <div
          class="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          :style="{ boxShadow: `inset 0 0 0 1.5px ${stat.color}40, 0 0 24px ${stat.color}15` }"
        ></div>
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-semibold tracking-[0.1em] text-[#6B7280] dark:text-gray-400 uppercase">{{ stat.label }}</span>
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-[6deg]"
            :class="stat.bg"
            :style="{ boxShadow: `0 2px 8px ${stat.color}15, inset 0 1px 0 ${stat.color}10` }"
          >
            <component :is="stat.icon" :size="16" class="transition-transform duration-300 group-hover:scale-110" :style="{ color: stat.color }" />
          </div>
        </div>
        <p class="text-lg sm:text-xl font-bold text-[#111827] dark:text-white tracking-tight tabular-nums">{{ stat.value }}</p>
        <div class="mt-2 h-1 rounded-full bg-[#F3F4F6] dark:bg-gray-800 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-1000 ease-out animate-fadeIn"
            :style="{
              width: `${Math.min(typeof stat.value === 'number' ? stat.value : parseInt(String(stat.value)) || 10, 100)}%`,
              background: `linear-gradient(to right, ${stat.color}80, ${stat.color})`
            }"
          ></div>
        </div>
        <p class="text-[11px] text-[#9CA3AF] dark:text-gray-500 mt-1.5">{{ stat.sub }}</p>
      </div>
    </div>


    <!-- ═══ ENROLLMENT FLOW + DOUGHNUT (side by side) ═══ -->
    <div class="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-4 sm:gap-5">
      <!-- Enrollment Flow Chart -->
      <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 animate-fadeIn relative overflow-hidden" style="animation-delay: 0.3s">
        <div class="absolute top-0 left-4 right-4 h-[3px] bg-gradient-to-r from-blue-400/50 via-blue-500 to-blue-400/50 rounded-full"></div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <BarChart3 :size="14" class="text-white" />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('enrollment_flow.title') }}</h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('enrollment_flow.subtitle') }}</p>
            </div>
          </div>
          <span class="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1 transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-800 cursor-default">
            <BarChart3 :size="11" class="animate-pulse-subtle" />
            {{ t('chart.badge_grouped_bar') }}
          </span>
        </div>
        <div class="h-[180px] w-full chart-container">
          <Bar :data="flowChartData" :options="flowChartOptions" />
        </div>
      </div>

      <!-- Doughnut Chart -->
      <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 animate-fadeIn relative overflow-hidden" style="animation-delay: 0.35s">
        <div class="absolute top-0 left-4 right-4 h-[3px] bg-gradient-to-r from-purple-400/50 via-purple-500 to-purple-400/50 rounded-full"></div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm shadow-purple-500/20">
              <Activity :size="14" class="text-white" />
            </div>
            <div>
              <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('dashboard.status_by_status') }}</h2>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('dashboard.status_distribution') }}</p>
            </div>
          </div>
          <span class="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1 transition-all duration-200 hover:border-purple-200 dark:hover:border-purple-800 cursor-default">
            <Activity :size="11" class="animate-pulse-subtle" />
            {{ t('chart.badge_doughnut') }}
          </span>
        </div>
        <div class="h-[200px] w-full chart-container">
          <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
        </div>
      </div>
    </div>

    <!-- ═══ BATCH ENROLLMENT CHART (full width) ═══ -->
    <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 sm:p-5 animate-fadeIn relative overflow-hidden" style="animation-delay: 0.4s">
      <div class="absolute top-0 left-4 right-4 h-[3px] bg-gradient-to-r from-emerald-400/50 via-emerald-500 to-emerald-400/50 rounded-full"></div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <BarChart3 :size="14" class="text-white" />
          </div>
          <div>
            <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('enrollment_by_batch.title') }}</h2>
            <p class="text-[11px] text-[#6B7280] dark:text-gray-400">{{ t('enrollment_by_batch.subtitle') }}</p>
          </div>
        </div>
        <span class="text-[9px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1 transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-default">
          <BarChart3 :size="11" class="animate-pulse-subtle" />
          {{ t('chart.badge_bar') }}
        </span>
      </div>
      <div class="h-[200px] w-full chart-container">
        <Bar :data="batchChartData" :options="batchChartOptions" />
      </div>
    </div>
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

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
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

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
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

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-out both;
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

/* ─── Stagger children ─── */
.activity-item {
  animation: fadeInUp 0.4s ease-out both;
}

/* ─── Card hover glow ─── */
.rounded-\[12px\]:hover,
.rounded-\[14px\]:hover {
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

/* ─── Chart containers ─── */
.chart-container {
  animation: scaleIn 0.6s ease-out 0.3s both;
}

/* ─── Gradient accent line animation ─── */
.absolute.top-0.left-4.right-4.h-\[3px\] {
  transform: scaleX(0);
  transition: transform 0.4s ease-out;
}

div:hover > .absolute.top-0.left-4.right-4.h-\[3px\] {
  transform: scaleX(1);
}

/* ─── Dashboard enter animation ─── */
.dashboard-enter {
  animation: fadeIn 0.3s ease-out;
}

/* ─── Tabular numbers for stats ─── */
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
</style>
