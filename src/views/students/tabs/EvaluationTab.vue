<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import type { Student } from '@/types'
import {
  Star,
  BookOpen,
  CheckCircle,
  Zap,
  Shield,
  Target,
  Crown,
  Scale,
  MessageSquareText,
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

defineProps<{ student: Student }>()

// ── Assessment Data (1–5 scale) ──
interface Assessment {
  category: string
  score: number
  icon: any
}

const assessments: Assessment[] = [
  { category: t('evaluation_tab.self_dev'), score: 4.0, icon: BookOpen },
  { category: t('evaluation_tab.responsibility'),   score: 4.6, icon: CheckCircle },
  { category: t('evaluation_tab.diligence'),        score: 4.4, icon: Zap },
  { category: t('evaluation_tab.integrity'),        score: 4.3, icon: Shield },
  { category: t('evaluation_tab.teamwork'),         score: 4.5, icon: Target },
  { category: t('evaluation_tab.leadership'),       score: 3.5, icon: Crown },
  { category: t('evaluation_tab.justice'),          score: 3.9, icon: Scale },
  { category: t('evaluation_tab.communication'),    score: 3.8, icon: MessageSquareText },
]

const labels = assessments.map(a => a.category)
const scores = assessments.map(a => a.score)

// ── Radar Chart Data ──
const chartData = computed(() => ({
  labels,
  datasets: [
    {
      label: 'Assessment Score',
      data: scores,
      backgroundColor: 'rgba(37, 99, 235, 0.25)',
      borderColor: '#2563EB',
      borderWidth: 2.5,
      pointBackgroundColor: '#2563EB',
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
  animation: {
    duration: 800,
    easing: 'easeOutQuart',
  },
  scales: {
    r: {
      min: 0,
      max: 5,
      ticks: {
        stepSize: 1,
        color: '#9CA3AF',
        backdropColor: 'transparent',
        font: { size: 10, family: 'Inter, sans-serif' },
      },
      grid: {
        color: '#E5E7EB',
        lineWidth: 0.7,
      },
      angleLines: {
        color: '#E5E7EB',
        lineWidth: 0.7,
      },
      pointLabels: {
        color: '#6B7280',
        font: { size: 11, family: 'Inter, sans-serif', weight: 600 },
      },
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

// ── Averages ──
const avgScore = computed(() => {
  const sum = assessments.reduce((s, a) => s + a.score, 0)
  return Math.round((sum / assessments.length) * 10) / 10
})
const avgPct = computed(() => Math.round((avgScore.value / 5) * 100))

// ── Legend ──
const legend = [
  { level: 1, label: 'Needs Improvement' },
  { level: 2, label: 'Fair' },
  { level: 3, label: 'Good' },
  { level: 4, label: 'Very Good' },
  { level: 5, label: 'Excellent' },
]

// ── Helpers ──
function barColor(s: number) {
  if (s >= 4.0) return 'bg-blue-500'
  if (s >= 3.0) return 'bg-blue-400'
  return 'bg-blue-300'
}

function grade(s: number) {
  if (s >= 4.5) return 'A'
  if (s >= 4.0) return 'B+'
  if (s >= 3.5) return 'B'
  if (s >= 3.0) return 'C+'
  if (s >= 2.0) return 'C'
  return 'D'
}
</script>

<template>
  <div class="space-y-5">
    <!-- ────── MAIN CARD ────── -->
    <div
      class="bg-white dark:bg-[#131B2E] rounded-[14px] border border-[#E5E7EB] dark:border-gray-800 p-5 sm:p-6"
      style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-base font-semibold text-[#111827] dark:text-white">{{ t('evaluation_tab.title') }}</h3>
          <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">{{ t('evaluation_tab.subtitle') }}</p>
        </div>
        <div
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] dark:bg-[#355C8C]/20 border border-[#BFDBFE] dark:border-[#355C8C]/30"
        >
          <Star :size="13" class="fill-[#2563EB] text-[#2563EB]" />
          <span class="text-xs font-bold text-[#2563EB] dark:text-blue-300 tabular-nums">{{ avgScore.toFixed(1) }}</span>
          <span class="text-[10px] text-[#60A5FA] dark:text-blue-400">/ 5</span>
        </div>
      </div>

      <!-- ──── Desktop Layout: 3 cards + chart + 3 cards ──── -->
      <div class="hidden lg:flex items-start gap-4">
        <!-- Left cards (1–3) -->
        <div class="flex flex-col gap-2.5 flex-1 max-w-[180px] pt-2">
          <div
            v-for="a in assessments.slice(0, 3)"
            :key="a.category"
            class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              >
                <component :is="a.icon" :size="13" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold text-[#374151] dark:text-gray-300 truncate leading-tight">
                  {{ a.category }}
                </p>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">{{
                    a.score.toFixed(1)
                  }}</span>
                  <span class="text-[8px] text-[#9CA3AF] dark:text-gray-500 font-medium">{{ grade(a.score) }}</span>
                </div>
              </div>
            </div>
            <div class="mt-1.5 w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="barColor(a.score)"
                :style="{ width: (a.score / 5) * 100 + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Radar Chart -->
        <div class="flex-shrink-0 w-full max-w-[380px] mx-auto">
          <div class="h-[320px] w-full">
            <Radar :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Right cards (4–6) -->
        <div class="flex flex-col gap-2.5 flex-1 max-w-[180px] pt-2">
          <div
            v-for="a in assessments.slice(3, 6)"
            :key="a.category"
            class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              >
                <component :is="a.icon" :size="13" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold text-[#374151] dark:text-gray-300 truncate leading-tight">
                  {{ a.category }}
                </p>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">{{
                    a.score.toFixed(1)
                  }}</span>
                  <span class="text-[8px] text-[#9CA3AF] dark:text-gray-500 font-medium">{{ grade(a.score) }}</span>
                </div>
              </div>
            </div>
            <div class="mt-1.5 w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="barColor(a.score)"
                :style="{ width: (a.score / 5) * 100 + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ──── Bottom cards on desktop (7–8) centered ──── -->
      <div class="hidden lg:grid grid-cols-4 gap-2.5 mt-4">
        <div></div>
        <div
          v-for="a in assessments.slice(6, 8)"
          :key="a.category"
          class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            >
              <component :is="a.icon" :size="13" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold text-[#374151] dark:text-gray-300 truncate leading-tight">
                {{ a.category }}
              </p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">{{
                  a.score.toFixed(1)
                }}</span>
                <span class="text-[8px] text-[#9CA3AF] dark:text-gray-500 font-medium">{{ grade(a.score) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-1.5 w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="barColor(a.score)"
              :style="{ width: (a.score / 5) * 100 + '%' }"
            ></div>
          </div>
        </div>
        <div></div>
      </div>

      <!-- ──── Mobile: chart + all 8 cards ──── -->
      <div class="lg:hidden flex flex-col items-center gap-4">
        <div class="w-full max-w-[360px] mx-auto">
          <div class="h-[280px] w-full">
            <Radar :data="chartData" :options="chartOptions" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2.5 w-full">
          <div
            v-for="a in assessments"
            :key="a.category"
            class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
              >
                <component :is="a.icon" :size="13" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-semibold text-[#374151] dark:text-gray-300 truncate leading-tight">
                  {{ a.category }}
                </p>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 tabular-nums">{{
                    a.score.toFixed(1)
                  }}</span>
                  <span class="text-[8px] text-[#9CA3AF] dark:text-gray-500 font-medium">{{ grade(a.score) }}</span>
                </div>
              </div>
            </div>
            <div class="mt-1.5 w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="barColor(a.score)"
                :style="{ width: (a.score / 5) * 100 + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ────── Average Score & Legend ────── -->
      <div class="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-gray-700">
        <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <!-- Average score block -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <div
              class="w-12 h-12 rounded-xl bg-[#EFF6FF] dark:bg-[#355C8C]/20 border border-[#BFDBFE] dark:border-[#355C8C]/30 flex items-center justify-center"
            >
              <span class="text-lg font-black text-[#2563EB] dark:text-blue-300 tabular-nums">{{
                avgScore.toFixed(1)
              }}</span>
            </div>
            <div>
              <p class="text-xs font-semibold text-[#374151] dark:text-gray-300">{{ t('evaluation_tab.average_score') }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <div class="flex gap-px">
                  <svg
                    v-for="s in 5"
                    :key="s"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    :class="s <= Math.round(avgScore) ? 'text-[#F59E0B] drop-shadow-sm' : 'text-[#D1D5DB] dark:text-gray-600'"
                    class="transition-all duration-200"
                  >
                    <path
                      d="M12 1.5 L14.5 8.5 L22 8.5 L16 13 L18 20.5 L12 16 L6 20.5 L8 13 L2 8.5 L9.5 8.5 Z"
                      fill="currentColor"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>
                <span class="text-[10px] text-[#9CA3AF] dark:text-gray-500">{{ avgPct }}%</span>
              </div>
            </div>
          </div>

          <div class="hidden sm:block w-px h-10 bg-[#E5E7EB] dark:bg-gray-700"></div>

          <!-- Legend -->
          <div class="flex-1 w-full">
            <p
              class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 mb-2 text-center sm:text-left"
            >
              {{ t('evaluation_tab.legend') }}
            </p>
            <div class="grid grid-cols-5 gap-1.5">
              <div
                v-for="item in legend"
                :key="item.level"
                class="flex flex-col items-center py-1.5 px-1 rounded-lg bg-[#F9FAFB] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50"
              >
                <div
                  class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-[#2563EB] shadow-sm mb-0.5"
                >
                  {{ item.level }}
                </div>
                <span class="text-[8px] text-[#6B7280] dark:text-gray-400 text-center leading-tight">{{
                  item.label
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
