<script setup lang="ts">
defineOptions({ name: 'DashboardPage' })

import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useStudentsStore } from '@/stores/students'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import type { User } from '@/types'

// Lucide Icons
import {
  FileDown,
  UserCheck,
  FileText,
  FilePenLine,
  ChevronRight,
  ChevronLeft,
  Plus,
  Eye,
  Users,
  BarChart3,
  Activity,
  Clock,
  GraduationCap,
  XCircle,
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
const router = useRouter()
const { showSuccessToast } = useToast()

const user = ref<User | null>(null)

onMounted(() => {
  if (authStore.user) {
    user.value = authStore.user
  } else {
    const userData = localStorage.getItem('user')
    if (userData) user.value = JSON.parse(userData)
  }

  // Fetch student stats for dashboard
  studentsStore.fetchAll()
  
  // Lazy-load Chart.js to keep Dashboard chunk small
  Promise.all([
    import('vue-chartjs'),
    import('chart.js'),
  ]).then(([{ Bar, Doughnut }, { Chart, registerables }]) => {
    Chart.register(...registerables)
    BarChart.value = Bar
    DoughnutChart.value = Doughnut
    chartReady.value = true
  })
})

// ── Student Stats Cards (live from studentsStore) ──
const statCards = computed(() => [
  { 
    titleKey: 'dashboard.total', 
    value: String(studentsStore.totalStudents), 
    subtitleKey: 'dashboard.all_students',
    icon: Users,
    color: 'text-gray-900 dark:text-white',
    bg: 'bg-white dark:bg-[#131B2E] border-[#E5E7EB] dark:border-gray-800',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  },
  { 
    titleKey: 'dashboard.pending_students', 
    value: String(studentsStore.pendingCount), 
    subtitleKey: 'dashboard.awaiting_review',
    icon: Clock,
    color: 'text-orange-600',
    bg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-800/50',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  },
  { 
    titleKey: 'dashboard.approved_students', 
    value: String(studentsStore.approvedCount), 
    subtitleKey: 'dashboard.ready_to_enroll',
    icon: UserCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-800/50',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  },
  { 
    titleKey: 'dashboard.enrolled_students', 
    value: String(studentsStore.enrolledCount), 
    subtitleKey: 'dashboard.active_students',
    icon: GraduationCap,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-800/50',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  },
  { 
    titleKey: 'dashboard.inactive_students', 
    value: String(studentsStore.inactiveCount), 
    subtitleKey: 'dashboard.not_active',
    icon: XCircle,
    color: 'text-gray-600',
    bg: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    highlighted: false,
  },
])

// ──── Enrollment Flow (Chart.js Grouped Bar) ────
const flowChartData = computed(() => ({
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: t('enrollment_flow.submitted'),
      data: [45, 52, 68, 74, 90, 85, 110, 128, 95, 82, 60, 38],
      backgroundColor: 'rgba(53, 92, 140, 0.85)',
      borderRadius: 3,
      barPercentage: 0.35,
    },
    {
      label: t('enrollment_flow.enrolled'),
      data: [32, 38, 51, 55, 68, 62, 78, 94, 70, 61, 45, 28],
      backgroundColor: 'rgba(147, 197, 253, 0.85)',
      borderRadius: 3,
      barPercentage: 0.35,
    },
  ],
}))

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
        font: { family: 'Inter, sans-serif', size: 11, weight: '500' },
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
      grid: { color: '#F1F5F9', drawBorder: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 10 },
        stepSize: 30,
      },
      beginAtZero: true,
    },
  },
}

// ──── Enrollment by Batch (Chart.js Bar) ────
const batchChartData = computed(() => ({
  labels: ['2022', '2023', '2024', '2025', '2026'],
  datasets: [
    {
      label: t('enrollment_by_batch.label'),
      data: [42, 68, 91, 115, 28],
      backgroundColor: [
        'rgba(53, 92, 140, 0.85)',
        'rgba(53, 92, 140, 0.85)',
        'rgba(53, 92, 140, 0.85)',
        'rgba(53, 92, 140, 0.85)',
        'rgba(53, 92, 140, 0.45)',
      ],
      borderRadius: 4,
      barPercentage: 0.55,
      categoryPercentage: 0.8,
    },
  ],
}))

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
        font: { family: 'Inter, sans-serif', size: 12, weight: '500' },
      },
    },
    y: {
      grid: { color: '#F1F5F9', drawBorder: false },
      ticks: {
        color: '#9CA3AF',
        font: { family: 'Inter, sans-serif', size: 11 },
        stepSize: 25,
      },
      beginAtZero: true,
    },
  },
}

// ──── Enrollment Distribution (Doughnut Chart) ────
const doughnutChartData = computed(() => ({
  labels: [
    t('program.doughnut_cs'),
    t('program.doughnut_it'),
    t('program.doughnut_ba'),
    t('program.doughnut_eng'),
    t('program.doughnut_nursing'),
  ],
  datasets: [
    {
      data: [312, 245, 198, 156, 109],
      backgroundColor: ['#355C8C', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}))

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
        font: { family: 'Inter, sans-serif', size: 10, weight: '500' },
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
        label: (ctx) => `${ctx.parsed} students`,
      },
    },
  },
}
interface QuickAction {
  labelKey: string
  icon: string
  route: string
}

const quickActions: QuickAction[] = [
  { labelKey: 'quick_actions.new_enrollment', icon: 'plus', route: '/students' },
  { labelKey: 'quick_actions.review', icon: 'eye', route: '/students' },
  { labelKey: 'quick_actions.manage_students', icon: 'users', route: '/students' },
  { labelKey: 'quick_actions.view_reports', icon: 'chart', route: '/students' },
]

const navigateTo = (path: string) => {
  router.push(path)
}
</script>
<template>
  <div
    class="space-y-6"
    style="
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
    "
  >
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">
          {{ t('dashboard.title') }}
        </h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
          {{ t('dashboard.welcome', { name: user?.name || 'Admin' }) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="text-xs text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1.5"
        >
          <Clock :size="12" class="text-[#9CA3AF]" />
          <span class="font-medium">{{ t('dashboard.updated_ago') }}</span>
        </span>
      </div>
    </div>

    <!-- Row 1: Top Statistics Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
      <div
        v-for="card in statCards"
        :key="card.titleKey"
        class="rounded-[14px] p-6 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        :class="card.bg"
        :style="{ boxShadow: card.boxShadow }"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">
            {{ t(card.titleKey) }}
          </p>
          <component :is="card.icon" :size="18" class="text-gray-400" />
        </div>
        <p
          class="text-2xl font-bold tracking-tight"
          :class="card.color"
        >
          {{ card.value }}
        </p>
        <p class="text-[13px] text-[#9CA3AF] dark:text-gray-500 mt-1">{{ t(card.subtitleKey) }}</p>
      </div>
    </div>

    <!-- Row 2: Enrollment Flow + Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- Enrollment Flow Chart -->
      <div
        class="lg:col-span-2 rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-base font-semibold text-[#111827] dark:text-white">
              {{ t('enrollment_flow.title') }}
            </h2>
            <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">
              {{ t('enrollment_flow.subtitle') }}
            </p>
          </div>
          <span
            class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1"
          >
            <BarChart3 :size="12" />
            {{ t('chart.badge_grouped_bar') }}
          </span>
        </div>
        <div class="h-[200px] w-full">
          <Bar :data="flowChartData" :options="flowChartOptions" />
        </div>
      </div>

      <!-- Quick Actions -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <h2 class="text-base font-semibold text-[#111827] dark:text-white mb-4">
          {{ t('quick_actions.title') }}
        </h2>
        <div class="space-y-2">
          <button
            v-for="action in quickActions"
            :key="action.labelKey"
            @click="navigateTo(action.route)"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#374151] dark:text-gray-300 hover:bg-[#F8FAFC] dark:hover:bg-white/[0.04] transition-all duration-200 cursor-pointer group border border-transparent hover:border-[#E5E7EB] dark:hover:border-gray-700 active:scale-[0.98]"
          >
            <div
              class="w-8 h-8 rounded-lg flex items-center justify-center bg-[#F8FAFC] dark:bg-white/[0.06] group-hover:bg-white dark:group-hover:bg-white/[0.08] transition-colors border border-[#E5E7EB] dark:border-gray-700"
            >
              <Plus
                v-if="action.icon === 'plus'"
                :size="16"
                class="text-[#6B7280] dark:text-gray-400"
              />
              <Eye
                v-else-if="action.icon === 'eye'"
                :size="16"
                class="text-[#6B7280] dark:text-gray-400"
              />
              <Users
                v-else-if="action.icon === 'users'"
                :size="16"
                class="text-[#6B7280] dark:text-gray-400"
              />
              <BarChart3
                v-else-if="action.icon === 'chart'"
                :size="16"
                class="text-[#6B7280] dark:text-gray-400"
              />
            </div>
            <span class="flex-1 text-left">{{ t(action.labelKey) }}</span>
            <ChevronRight
              :size="16"
              class="text-[#D1D5DB] dark:text-gray-600 group-hover:text-[#9CA3AF] dark:group-hover:text-gray-400 transition-colors"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Row 3: Enrollment by Batch (65%) + Doughnut Chart (35%) -->
    <div class="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-5">
      <!-- Left: Bar Chart -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-base font-semibold text-[#111827] dark:text-white">
              {{ t('enrollment_by_batch.title') }}
            </h2>
            <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">
              {{ t('enrollment_by_batch.subtitle') }}
            </p>
          </div>
          <span
            class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1"
          >
            <BarChart3 :size="12" />
            {{ t('chart.badge_bar') }}
          </span>
        </div>
        <div class="h-[220px] w-full">
          <Bar :data="batchChartData" :options="batchChartOptions" />
        </div>
      </div>

      <!-- Right: Doughnut Chart -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[#111827] dark:text-white">
            {{ t('doughnut.title') }}
          </h2>
          <span
            class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1"
          >
            <Activity :size="12" />
            {{ t('chart.badge_doughnut') }}
          </span>
        </div>
        <div class="h-[240px] w-full">
          <Doughnut :data="doughnutChartData" :options="doughnutChartOptions" />
        </div>
      </div>
    </div>

    <!-- Row 4: Recent Activity Timeline -->
    <div
      class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-6"
      style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-base font-semibold text-[#111827] dark:text-white">
            {{ t('recent_activity.title') }}
          </h2>
          <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">
            {{ t('recent_activity.subtitle') }}
          </p>
        </div>
        <span
          class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-2.5 py-1 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1.5"
        >
          <Clock :size="12" />
          {{ t('recent_activity.last_24h') }}
        </span>
      </div>

      <div class="relative">
        <div
          class="absolute left-[19px] top-3 bottom-3 w-[2px] bg-[#E5E7EB] dark:bg-gray-700 rounded-full"
        ></div>

        <div class="space-y-0">
          <!-- Activity 1 -->
          <div class="relative flex gap-5 pb-7">
            <div
              class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#EFF6FF] dark:bg-[#355C8C]/20 border-2 border-white dark:border-[#131B2E] shadow-sm"
            >
              <FileDown :size="16" class="text-[#355C8C]" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 tabular-nums"
                  >10:24</span
                >
                <span
                  class="text-[11px] font-medium text-[#355C8C] bg-[#EFF6FF] dark:bg-[#355C8C]/15 dark:text-blue-300 px-2 py-0.5 rounded-md"
                  >{{ t('admin') }}</span
                >
              </div>
              <p class="text-sm font-medium text-[#111827] dark:text-white mt-1.5 leading-snug">
                {{ t('recent_activity.imported') }}
                <span class="font-mono text-[#6B7280] dark:text-gray-400 text-xs"
                  >"Intake-2025-B.xlsx"</span
                >
              </p>
              <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                {{ t('recent_activity.students_added', { count: 487 }) }}
              </p>
            </div>
          </div>

          <!-- Activity 2 -->
          <div class="relative flex gap-5 pb-7">
            <div
              class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F0FDF4] dark:bg-emerald-500/20 border-2 border-white dark:border-[#131B2E] shadow-sm"
            >
              <UserCheck :size="16" class="text-[#16A34A]" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 tabular-nums"
                  >09:51</span
                >
                <span
                  class="text-[11px] font-medium text-[#6B7280] dark:text-gray-400 bg-[#F8FAFC] dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-[#E5E7EB] dark:border-gray-700"
                  >{{ t('staff') }}</span
                >
              </div>
              <p class="text-sm font-medium text-[#111827] dark:text-white mt-1.5 leading-snug">
                {{ t('recent_activity.status_changed') }}
              </p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-[#6B7280] dark:text-gray-400 font-medium">SOK Dara</span>
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F0FDF4] text-[#16A34A] dark:bg-emerald-500/15 dark:text-emerald-400"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-[#22C55E]"></span>
                  {{ t('recent_activity.enrolled_badge') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Activity 3 -->
          <div class="relative flex gap-5">
            <div
              class="relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFF7ED] dark:bg-amber-500/20 border-2 border-white dark:border-[#131B2E] shadow-sm"
            >
              <FileText :size="16" class="text-[#C2410C]" />
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="text-xs font-semibold text-[#6B7280] dark:text-gray-400 tabular-nums"
                  >09:03</span
                >
                <span
                  class="text-[11px] font-medium text-[#6B7280] dark:text-gray-400 bg-[#F8FAFC] dark:bg-white/[0.06] px-2 py-0.5 rounded-md border border-[#E5E7EB] dark:border-gray-700"
                  >{{ t('staff') }}</span
                >
              </div>
              <p class="text-sm font-medium text-[#111827] dark:text-white mt-1.5 leading-snug">
                {{ t('recent_activity.pdf_generated') }}
              </p>
              <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                {{ t('recent_activity.cards', { count: 48 }) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
