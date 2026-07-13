<script setup lang="ts">
defineOptions({ name: 'DashboardPage' })

import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useStudentsStore } from '@/stores/students'
import type { User } from '@/types'

// Lucide Icons
import {
  FileDown,
  UserCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  Eye,
  Users,
  BarChart3,
  Activity,
  Clock,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  SlidersHorizontal,
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
})

// ──── Stat Cards (translation keys) ────
interface StatCard {
  titleKey: string
  value: string
  subtitleKey: string
  highlighted?: boolean
  filter?: string
}

const statCards = computed<StatCard[]>(() => {
  const all = enrollments.value
  const total = all.length
  const active = all.filter((e) => e.status === 'active').length
  const pending = all.filter((e) => e.status === 'pending').length
  const completed = all.filter((e) => e.status === 'completed').length
  const rate = total > 0 ? Math.round((active / total) * 100) : 0

  return [
    { titleKey: 'dashboard.total', value: String(total), subtitleKey: 'dashboard.all_intakes' },
    { titleKey: 'dashboard.pending', value: String(pending), subtitleKey: 'dashboard.awaiting_review', filter: 'pending' },
    { titleKey: 'dashboard.enrolled', value: String(active), subtitleKey: 'dashboard.active_students', filter: 'active' },
    { titleKey: 'dashboard.rejected', value: String(completed), subtitleKey: 'dashboard.not_admitted', filter: 'completed' },
    {
      titleKey: 'dashboard.enroll_rate',
      value: `${rate}%`,
      subtitleKey: 'dashboard.enrolled_total',
      highlighted: true,
    },
  ]
})

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

// ──── Enrollment Tracking ────
interface Enrollment {
  name: string
  email: string
  initials: string
  id: string
  program: string
  date: string
  status: 'active' | 'pending' | 'completed'
}

const enrollments = computed(() => useStudentsStore().students)
const enrollmentStatusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E' },
  pending: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  completed: { bg: '#EFF6FF', text: '#355C8C', dot: '#60A5FA' },
}

const searchQuery = ref('')
const statusFilter = ref('all')
const programFilter = ref('all')
const currentPage = ref(1)
const pageSize = 5

const uniquePrograms = computed(() => Array.from(new Set(enrollments.value.map((e) => e.program))))

const filteredEnrollments = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return enrollments.value.filter((e) => {
    const matchesSearch =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    const matchesStatus = statusFilter.value === 'all' || e.status === statusFilter.value
    const matchesProgram = programFilter.value === 'all' || e.program === programFilter.value
    return matchesSearch && matchesStatus && matchesProgram
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredEnrollments.value.length / pageSize)),
)

watch(currentPage, () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1
})

const paginatedEnrollments = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredEnrollments.value.slice(start, start + pageSize)
})

const showingFrom = computed(() =>
  filteredEnrollments.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize + 1,
)
const showingTo = computed(() =>
  Math.min(currentPage.value * pageSize, filteredEnrollments.value.length),
)
const totalItems = computed(() => filteredEnrollments.value.length)

// ──── Quick Actions (translation keys) ────
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

const createNewStudent = () => {
  router.push('/students/new')
}

function editStudent(enrollment: Enrollment) {
  router.push(`/students/new?id=${enrollment.id}`)
}

function deleteStudent(enrollment: Enrollment) {
  const confirmed = window.confirm(`Delete ${enrollment.name}? This cannot be undone.`)
  if (!confirmed) return

  const index = enrollments.value.findIndex((e) => e.id === enrollment.id)
  if (index === -1) return

  enrollments.value.splice(index, 1)
  if (currentPage.value > Math.max(1, Math.ceil(enrollments.value.length / pageSize))) {
    currentPage.value = Math.max(1, Math.ceil(enrollments.value.length / pageSize))
  }
  showSuccessToast('Student record deleted.', 'Deleted')
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
        class="rounded-[14px] p-6 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
        :class="
          card.highlighted
            ? 'bg-[#EFF6FF] border-[#355C8C] dark:bg-[#EFF6FF]/10 dark:border-[#355C8C]/50'
            : 'bg-white dark:bg-[#131B2E] border-[#E5E7EB] dark:border-gray-800'
        "
        :style="{
          boxShadow: card.highlighted
            ? '0 1px 3px rgba(53, 92, 140, 0.08), 0 1px 2px rgba(53, 92, 140, 0.06)'
            : '0 1px 2px rgba(0, 0, 0, 0.04)',
        }"
        @click="card.filter && (statusFilter = card.filter)"
      >
        <p
          class="text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase mb-2"
        >
          {{ t(card.titleKey) }}
        </p>
        <p
          class="text-2xl font-bold tracking-tight"
          :class="card.highlighted ? 'text-[#355C8C]' : 'text-[#111827] dark:text-white'"
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

    <!-- Row 5: Enrollment Tracking -->
    <div
      class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800"
      style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <div
        class="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800"
      >
        <div>
          <h2 class="text-base font-semibold text-[#111827] dark:text-white">
            Enrollment Tracking
          </h2>
          <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">
            Track student enrollments and status changes.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="createNewStudent"
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#355C8C] hover:bg-[#2A4A70] rounded-lg shadow-sm shadow-blue-500/10 transition-colors cursor-pointer"
          >
            <Plus :size="14" />
            Create New
          </button>
          <button
            class="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#374151] dark:text-gray-300 bg-white dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-gray-700 rounded-lg hover:bg-[#F8FAFC] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <RefreshCw :size="14" />
            Refresh
          </button>
        </div>
      </div>

      <div class="px-6 py-4 flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative flex-1">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search students, IDs, or emails..."
            class="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-[#F8FAFC] dark:bg-white/[0.04] text-[#111827] dark:text-gray-200 placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#355C8C]/40 focus:border-[#355C8C]"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer"
          >
            <X :size="14" />
          </button>
        </div>
        <div class="flex items-center gap-2">
          <div class="relative">
            <select
              v-model="statusFilter"
              class="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-[#F8FAFC] dark:bg-white/[0.04] text-[#374151] dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/40 focus:border-[#355C8C] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <SlidersHorizontal
              :size="14"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
            />
          </div>
          <div class="relative">
            <select
              v-model="programFilter"
              class="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-gray-700 bg-[#F8FAFC] dark:bg-white/[0.04] text-[#374151] dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#355C8C]/40 focus:border-[#355C8C] cursor-pointer"
            >
              <option value="all">All Programs</option>
              <option v-for="program in uniquePrograms" :key="program" :value="program">
                {{ program }}
              </option>
            </select>
            <SlidersHorizontal
              :size="14"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div
        class="hidden md:grid grid-cols-6 gap-4 px-6 py-3 bg-[#F8FAFC] dark:bg-white/[0.02] text-[11px] font-semibold tracking-[0.05em] text-[#6B7280] dark:text-gray-400 uppercase"
      >
        <span>Student</span>
        <span>Student ID</span>
        <span>Program</span>
        <span>Enrollment Date</span>
        <span>Status</span>
        <span>Actions</span>
      </div>

      <div class="divide-y divide-[#E5E7EB] dark:divide-gray-800">
        <div
          v-for="enrollment in paginatedEnrollments"
          :key="enrollment.id"
          class="px-6 py-4 hover:bg-[#F8FAFC] dark:hover:bg-white/[0.02] transition-colors duration-150"
        >
          <!-- Mobile -->
          <div class="md:hidden space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                >
                  {{ enrollment.initials }}
                </div>
                <span class="text-sm font-medium text-[#111827] dark:text-white">{{
                  enrollment.name
                }}</span>
              </div>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                :style="{
                  backgroundColor:
                    enrollmentStatusStyles[enrollment.status as keyof typeof enrollmentStatusStyles]
                      ?.bg || '#9CA3AF',
                  color:
                    enrollmentStatusStyles[enrollment.status as keyof typeof enrollmentStatusStyles]
                      ?.text || '#374151',
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{
                    backgroundColor:
                      enrollmentStatusStyles[
                        enrollment.status as keyof typeof enrollmentStatusStyles
                      ]?.dot || '#9CA3AF',
                  }"
                ></span>
                {{ enrollment.status }}
              </span>
            </div>
            <div class="text-xs text-[#9CA3AF] dark:text-gray-500 pl-11">
              {{ enrollment.email }} · {{ enrollment.id }} · {{ enrollment.program }} ·
              {{ enrollment.date }}
            </div>
            <div class="flex items-center gap-2 pl-11">
              <button
                @click="editStudent(enrollment)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[#F8FAFC] dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 hover:bg-[#EFF6FF] dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <Pencil :size="12" /> Edit
              </button>
              <button
                @click="deleteStudent(enrollment)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-[#F8FAFC] dark:bg-white/[0.06] border border-[#E5E7EB] dark:border-gray-700 text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 :size="12" /> Delete
              </button>
            </div>
          </div>

          <!-- Desktop -->
          <div class="hidden md:grid grid-cols-6 gap-4 items-center">
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
              >
                {{ enrollment.initials }}
              </div>
              <div class="min-w-0">
                <p class="text-sm font-medium text-[#111827] dark:text-white truncate">
                  {{ enrollment.name }}
                </p>
                <p class="text-xs text-[#9CA3AF] dark:text-gray-500 truncate">
                  {{ enrollment.email }}
                </p>
              </div>
            </div>
            <div class="text-sm text-[#6B7280] dark:text-gray-400 font-mono">
              {{ enrollment.id }}
            </div>
            <div class="text-sm text-[#6B7280] dark:text-gray-400">{{ enrollment.program }}</div>
            <div class="text-sm text-[#6B7280] dark:text-gray-400">{{ enrollment.date }}</div>
            <div>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                :style="{
                  backgroundColor:
                    enrollmentStatusStyles[enrollment.status as keyof typeof enrollmentStatusStyles]
                      ?.bg || '#9CA3AF',
                  color:
                    enrollmentStatusStyles[enrollment.status as keyof typeof enrollmentStatusStyles]
                      ?.text || '#374151',
                }"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :style="{
                    backgroundColor:
                      enrollmentStatusStyles[
                        enrollment.status as keyof typeof enrollmentStatusStyles
                      ]?.dot || '#9CA3AF',
                  }"
                ></span>
                {{ enrollment.status }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="editStudent(enrollment)"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-[#355C8C] dark:hover:text-blue-400 hover:bg-[#EFF6FF] dark:hover:bg-[#355C8C]/10 transition-colors cursor-pointer"
              >
                <Pencil :size="14" />
              </button>
              <button
                @click="deleteStudent(enrollment)"
                class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        class="flex items-center justify-between px-6 py-3 border-t border-[#E5E7EB] dark:border-gray-800"
      >
        <span class="text-xs text-[#6B7280] dark:text-gray-400">
          Showing {{ showingFrom }} to {{ showingTo }} of {{ totalItems }} results
        </span>
        <div class="flex items-center gap-1">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft :size="14" />
          </button>
          <span
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold text-white bg-[#355C8C]"
            >{{ currentPage }}</span
          >
          <button
            @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#6B7280] dark:text-gray-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
