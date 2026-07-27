<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Student } from '@/types'
import { evaluationApi, type StudentEvaluation } from '@/services/api/evaluation'
import { useToast } from '@/composables/useToast'
import {
  Star,
  BookOpen,
  Zap,
  Shield,
  Crown,
  Scale,
  MessageSquareText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Brain,
  Briefcase,
  Plus,
  CalendarDays,
  Clock,
} from 'lucide-vue-next'

// Chart.js
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const { t } = useI18n()
const router = useRouter()
const props = defineProps<{ student: Student }>()
const { showErrorToast } = useToast()

// ── State ──
const latestEvaluation = ref<StudentEvaluation | null>(null)
const allEvaluations = ref<StudentEvaluation[]>([])
const loading = ref(true)
const refreshing = ref(false)
const noEvaluation = ref(false)
const selectedEvalIndex = ref(0)

// ── Category icon/color mapping ──
const categoryMeta: Record<string, { icon: any; color: string }> = {
  'Communication':        { icon: MessageSquareText, color: '#3B82F6' },
  'Teamwork':             { icon: Users,            color: '#10B981' },
  'Responsibility':       { icon: Shield,           color: '#F59E0B' },
  'Problem Solving':      { icon: Brain,            color: '#8B5CF6' },
  'Leadership':           { icon: Crown,            color: '#EC4899' },
  'Learning Mindset':     { icon: BookOpen,         color: '#14B8A6' },
  'Professional Behavior':{ icon: Briefcase,        color: '#6366F1' },
  'Self-Development':     { icon: BookOpen,         color: '#3B82F6' },
  'Diligence':            { icon: Zap,              color: '#F59E0B' },
  'Integrity':            { icon: Shield,           color: '#8B5CF6' },
  'Justice':              { icon: Scale,            color: '#6366F1' },
}

// ── Fetch evaluations ──
async function fetchEvaluations() {
  loading.value = true
  noEvaluation.value = false
  try {
    const studentId = Number(props.student.id)
    const evals = await evaluationApi.getByStudent(studentId)
    allEvaluations.value = evals
    if (evals.length > 0) {
      latestEvaluation.value = evals[selectedEvalIndex.value] ?? evals[0]
      noEvaluation.value = false
    } else {
      latestEvaluation.value = null
      noEvaluation.value = true
    }
  } catch (err) {
    console.error('[EvaluationTab] Failed to fetch evaluations:', err)
    latestEvaluation.value = null
    allEvaluations.value = []
    noEvaluation.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refreshData() {
  refreshing.value = true
  await fetchEvaluations()
}

function goToAddEvaluation() {
  router.push(`/evaluation/self?studentId=${props.student.id}`)
}

// ── On mount ──
onMounted(() => {
  fetchEvaluations()
})

function selectEvaluation(index: number) {
  selectedEvalIndex.value = index
  latestEvaluation.value = allEvaluations.value[index] ?? null
}

// ── Display data ──
interface DisplayItem {
  category: string
  score: number
  icon: any
  color: string
}

const displayItems = computed<DisplayItem[]>(() => {
  if (!latestEvaluation.value) return []
  return latestEvaluation.value.category_scores.map(cs => {
    const meta = categoryMeta[cs.category_name] ?? { icon: Star, color: '#6B7280' }
    return {
      category: cs.category_name,
      score: cs.total_score,
      icon: meta.icon,
      color: meta.color,
    }
  })
})

const labels = computed(() => displayItems.value.map(a => a.category))
const scores = computed(() => displayItems.value.map(a => a.score))

// ── Radar Chart ──
const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Score',
      data: scores.value,
      backgroundColor: 'rgba(37, 99, 235, 0.2)',
      borderColor: '#2563EB',
      borderWidth: 2.5,
      pointBackgroundColor: displayItems.value.map(a => a.color),
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true,
      tension: 0,
    },
  ],
}))

const chartOptions: ChartOptions<'radar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 800, easing: 'easeOutQuart' },
  scales: {
    r: {
      min: 0,
      max: 5,
      ticks: { stepSize: 1, color: '#9CA3AF', backdropColor: 'transparent', font: { size: 10 } },
      grid: { color: 'rgba(148, 163, 184, 0.2)', lineWidth: 0.7 },
      angleLines: { color: 'rgba(148, 163, 184, 0.2)', lineWidth: 0.7 },
      pointLabels: { color: '#6B7280', font: { size: 11, weight: 600 } },
    },
  },
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
        label: (ctx) => `Score: ${ctx.parsed.r.toFixed(1)} / 5`,
      },
    },
  },
}

// ── Computed totals ──
const totalScore = computed(() => {
  const sum = displayItems.value.reduce((s, a) => s + a.score, 0)
  return Math.round(sum * 10) / 10
})

const avgScore = computed(() => {
  const count = displayItems.value.length
  return count > 0 ? Math.round((totalScore.value / count) * 10) / 10 : 0
})

const avgPct = computed(() => Math.round((avgScore.value / 5) * 100))

// ── Color helpers ──
function scoreColor(s: number): string {
  if (s >= 4) return 'bg-emerald-500'
  if (s >= 3) return 'bg-blue-500'
  if (s >= 2) return 'bg-amber-500'
  return 'bg-red-400'
}

function scoreTextColor(s: number): string {
  if (s >= 4) return 'text-emerald-600 dark:text-emerald-400'
  if (s >= 3) return 'text-blue-600 dark:text-blue-400'
  if (s >= 2) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}
</script>

<template>
  <div class="space-y-4">

    <!-- ════════ LOADING ════════ -->
    <div
      v-if="loading"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-12 flex items-center justify-center"
    >
      <div class="flex items-center gap-2.5">
        <Loader2 :size="18" class="animate-spin text-blue-500" />
        <span class="text-sm text-[#6B7280] dark:text-gray-400">{{ t('evaluation_tab.loading') }}</span>
      </div>
    </div>

    <!-- ════════ NO EVALUATION ════════ -->
    <div
      v-else-if="noEvaluation"
      class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 p-10 flex flex-col items-center text-center"
    >
      <div class="w-14 h-14 rounded-xl bg-[#F3F4F6] dark:bg-white/[0.04] flex items-center justify-center mb-4 border border-[#E5E7EB] dark:border-gray-700">
        <AlertCircle :size="26" class="text-[#9CA3AF] dark:text-gray-500" />
      </div>
      <h3 class="text-sm font-semibold text-[#111827] dark:text-white mb-1">Self-Assessment</h3>
      <p class="text-sm text-[#6B7280] dark:text-gray-400 max-w-xs">
        No evaluation submitted yet. Complete the self-evaluation form to get started.
      </p>
      <button
        @click="goToAddEvaluation"
        class="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md shadow-blue-500/20 active:scale-[0.97] cursor-pointer"
      >
        <Plus :size="15" />
        Add Evaluation
      </button>
    </div>

    <!-- ════════ EVALUATION RESULTS ════════ -->
    <div v-else-if="latestEvaluation">

      <!-- ──── Top Bar: History + Add ──── -->
      <div class="flex flex-col gap-3">
        <!-- Header row -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Clock :size="15" class="text-[#6B7280] dark:text-gray-400" />
            <span class="text-sm font-semibold text-[#111827] dark:text-white">
              {{ latestEvaluation.evaluation_period || 'Evaluation' }}
            </span>
            <span
              class="text-[11px] text-[#6B7280] dark:text-gray-400"
            >
              · {{ latestEvaluation.submitted_at ? new Date(latestEvaluation.submitted_at).toLocaleDateString() : '' }}
            </span>
          </div>
          <button
            @click="goToAddEvaluation"
            class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 active:scale-[0.97] cursor-pointer"
          >
            <Plus :size="12" />
            {{ t('evaluation_tab.add') }}
          </button>
        </div>

        <!-- History pills -->
        <div v-if="allEvaluations.length > 1" class="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            v-for="(ev, idx) in allEvaluations"
            :key="ev.id"
            @click="selectEvaluation(idx)"
            class="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer"
            :class="selectedEvalIndex === idx
              ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
              : 'bg-white dark:bg-white/[0.04] border-[#E5E7EB] dark:border-gray-700 text-[#6B7280] dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-700'"
          >
            <CalendarDays :size="10" />
            {{ ev.evaluation_period || `#${idx + 1}` }}
          </button>
        </div>
      </div>

      <!-- ──── Main Score Card ──── -->
      <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-[#E5E7EB] dark:border-gray-800 overflow-hidden">

        <!-- Score summary bar -->
        <div class="flex items-center gap-4 px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 border-b border-[#E5E7EB] dark:border-gray-800">
          <div class="flex items-center gap-2.5">
            <div class="flex items-baseline gap-0.5">
              <span class="text-xl font-bold text-[#111827] dark:text-white tabular-nums">{{ avgScore.toFixed(1) }}</span>
              <span class="text-xs text-[#6B7280] dark:text-gray-400">/ 5</span>
            </div>
            <div class="w-20 h-1.5 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                :class="scoreColor(avgScore)"
                :style="{ width: avgPct + '%' }"
              ></div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-gray-400">
            <span class="font-medium text-[#374151] dark:text-gray-300">{{ displayItems.length }}</span>
            categories ·
            <span class="font-medium text-[#374151] dark:text-gray-300">{{ totalScore.toFixed(1) }}</span>
            / {{ displayItems.length * 5 }} total
          </div>
        </div>

        <!-- Content: Chart + Categories -->
        <div class="p-5">
          <div class="flex flex-col lg:flex-row items-center gap-5">
            <!-- Radar Chart -->
            <div class="flex-shrink-0 w-full max-w-[320px]">
              <div class="h-[280px] w-full">
                <Radar :data="chartData" :options="chartOptions" />
              </div>
            </div>

            <!-- Category List -->
            <div class="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="a in displayItems"
                :key="a.category"
                class="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F9FAFB] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50"
              >
                <div
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  :style="{ backgroundColor: a.color }"
                >
                  <component :is="a.icon" :size="14" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-1">
                    <p class="text-xs font-medium text-[#374151] dark:text-gray-300 truncate">{{ a.category }}</p>
                    <span class="text-xs font-bold tabular-nums flex-shrink-0" :class="scoreTextColor(a.score)">
                      {{ a.score.toFixed(1) }}
                    </span>
                  </div>
                  <div class="mt-1 w-full h-1.5 bg-[#E5E7EB] dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="scoreColor(a.score)"
                      :style="{ width: (a.score / 5) * 100 + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer: Refresh + Status -->
        <div class="flex items-center justify-between px-5 py-3 bg-[#F9FAFB] dark:bg-white/[0.02] border-t border-[#E5E7EB] dark:border-gray-800">
          <div class="flex items-center gap-2.5">
            <div class="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-gray-400">
              <Clock :size="12" />
              <span>{{ latestEvaluation.submitted_at ? new Date(latestEvaluation.submitted_at).toLocaleString() : '—' }}</span>
            </div>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
            >
              <CheckCircle2 :size="10" />
              {{ latestEvaluation.status }}
            </span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              @click="refreshData"
              :disabled="refreshing"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 text-[#6B7280] dark:text-gray-400 hover:text-[#374151] dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw :size="12" :class="{ 'animate-spin': refreshing }" />
              {{ t('evaluation_tab.refresh') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
