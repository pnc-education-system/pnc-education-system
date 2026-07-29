<script setup lang="ts">
defineOptions({ name: 'SelfEvaluation' })

import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { evaluationApi } from '@/services/api/evaluation'
import { studentsApi } from '@/services/api'
import type { EvaluationTemplate, TemplateQuestion, StudentEvaluation, StudentEvaluationCategory } from '@/services/api/evaluation'
import type { Student } from '@/types'
import { resolvePhotoUrl, getInitials } from '@/utils/photoUrl'

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

// Lucide Icons
import {
  Save,
  Send,
  Clock,
  GraduationCap,
  MessageSquareText,
  Lightbulb,
  Users,
  Crown,
  Brain,
  Shield,
  BookOpen,
  Briefcase,
  Star,
  Loader2,
  CheckCircle2,
  Zap,
  ChevronRight as ChevronRightIcon,
  ArrowLeft,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

function goBack() {
  if (studentId.value > 0) {
    router.push({
      name: 'StudentProfile',
      params: { id: studentId.value },
      query: { tab: 'evaluation' },
    })
  } else {
    router.push('/students')
  }
}
const route = useRoute()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

const student = ref<Student | null>(null)
const studentId = ref<number>(0)

// ── Category name → icon/color mapping ──
const categoryMeta: Record<string, { icon: any; color: string }> = {
  'Communication':      { icon: MessageSquareText, color: '#3B82F6' },
  'Teamwork':           { icon: Users,            color: '#10B981' },
  'Responsibility':     { icon: Shield,           color: '#F59E0B' },
  'Problem Solving':    { icon: Brain,            color: '#8B5CF6' },
  'Leadership':         { icon: Crown,            color: '#EC4899' },
  'Learning Mindset':   { icon: BookOpen,         color: '#14B8A6' },
  'Professional Behavior': { icon: Briefcase,     color: '#6366F1' },
}

// ── Reactive types ──
interface LocalQuestion {
  id: string          // local unique key for Vue
  question_id: number // backend DB ID for submission
  text: string
  score: number
  max_score: number
}

interface LocalCategory {
  id: string
  name: string
  icon: any
  color: string
  questions: LocalQuestion[]
}

const categories = ref<LocalCategory[]>([])
const formId = ref<number | null>(null)
const evaluationPeriod = ref('Jun 2026')
const overallComment = ref('')
const isSubmitting = ref(false)
const isSavingDraft = ref(false)
const submitSuccess = ref(false)
const photoError = ref(false)
const loading = ref(true)
const hasPreviousEval = ref(false)

// ── Build categories from template ──
function buildCategories(template: EvaluationTemplate) {
  formId.value = template.id
  return template.categories.map((cat, ci) => {
    const meta = categoryMeta[cat.name] ?? { icon: Star, color: '#6B7280' }
    return {
      id: `cat_${ci}`,
      name: cat.name,
      icon: meta.icon,
      color: meta.color,
      questions: cat.questions.map((q: TemplateQuestion, qi: number) => ({
        id: `q_${ci}_${qi}`,
        question_id: q.id,
        text: q.question,
        score: 4,           // default if no previous eval
        max_score: q.max_score,
      })),
    }
  })
}

// ── Pre-fill scores from a previous evaluation ──
function applyPreviousEval(evaluation: StudentEvaluation) {
  const categoryMap = new Map<string, StudentEvaluationCategory>()
  for (const cat of evaluation.category_scores) {
    categoryMap.set(cat.category_name, cat)
  }

  for (const cat of categories.value) {
    const prevCat = categoryMap.get(cat.name)
    if (!prevCat) continue
    const qMap = new Map<number, number>()
    for (const q of prevCat.questions) {
      qMap.set(q.question_id, q.score)
    }
    for (const q of cat.questions) {
      if (qMap.has(q.question_id)) {
        q.score = qMap.get(q.question_id)!
      }
    }
  }

  if (evaluation.evaluation_period) {
    evaluationPeriod.value = evaluation.evaluation_period
  }
  hasPreviousEval.value = true
}

// ── On mount ──
onMounted(async () => {
  // 1. Read studentId from query params (passed from EvaluationTab)
  const rawStudentId = route.query.studentId
  studentId.value = rawStudentId ? Number(rawStudentId) : (authStore.user?.id ?? 0)

  loading.value = true
  try {
    // 2. Fetch the real student data from the API
    if (studentId.value > 0) {
      const backendStudent = await studentsApi.get(studentId.value)
      student.value = {
        id: String(backendStudent.id),
        studentIdNo: backendStudent.student_id_no,
        fullName: backendStudent.full_name,
        gender: backendStudent.gender,
        dob: backendStudent.dob ?? '',
        province: backendStudent.province ?? undefined,
        phone: backendStudent.phone ?? undefined,
        email: backendStudent.email ?? undefined,
        highSchool: backendStudent.high_school ?? undefined,
        status: backendStudent.enrollment_status?.toLowerCase() as any ?? 'pending',
        selectionBatchName: backendStudent.selection_batch_name ?? undefined,
        intakeYear: backendStudent.intake_year ? String(backendStudent.intake_year) : undefined,
        createdAt: backendStudent.created_at,
        updatedAt: backendStudent.updated_at,
        photoPath: backendStudent.photo_path ?? undefined,
      } as Student
    }

    // 3. Fetch active template
    const templates = await evaluationApi.getTemplates()
    console.log('[SelfEvaluation] Templates from API:', JSON.stringify(templates, null, 2))
    console.log('[SelfEvaluation] Template count:', templates.length)
    const activeTemplate = templates.find(t => t.is_active) ?? templates[0]
    console.log('[SelfEvaluation] Active template:', activeTemplate ? activeTemplate.name : 'NONE')

    if (activeTemplate) {
      console.log('[SelfEvaluation] Template categories:', activeTemplate.categories?.length)
      activeTemplate.categories?.forEach((cat, i) => {
        console.log(`[SelfEvaluation] Category ${i}: "${cat.name}" - ${cat.questions?.length || 0} questions`)
        cat.questions?.forEach((q, j) => {
          console.log(`[SelfEvaluation]   Question ${j}: id=${q.id}, text="${(q.question || '').substring(0, 60) || 'MISSING!'}"`)
        })
      })
      categories.value = buildCategories(activeTemplate)

      // 4. Fetch previous evaluations for this student
      if (studentId.value > 0) {
        const evals = await evaluationApi.getByStudent(studentId.value)
        if (evals.length > 0) {
          applyPreviousEval(evals[0]) // latest evaluation
        }
      }

      // 5. Try to load localStorage draft as fallback
      loadDraft()
    }
  } catch (err) {
    console.error('[SelfEvaluation] Failed to load:', err)
    showErrorToast('Failed to load evaluation form. Please try again.', 'Load Error')
  } finally {
    loading.value = false
  }
})

// ── Computed ──
function getCatScore(cat: LocalCategory): number {
  if (cat.questions.length === 0) return 0
  const total = cat.questions.reduce((s, q) => s + q.score, 0)
  return Math.round((total / cat.questions.length) * 10) / 10
}

const totalScore = computed(() => {
  return categories.value.reduce((sum, cat) => sum + getCatScore(cat), 0)
})

const totalQuestions = computed(() => {
  return categories.value.reduce((count, cat) => count + cat.questions.length, 0)
})

const maxScore = computed(() => {
  return totalQuestions.value * 5
})

const avgScore = computed(() => {
  const count = categories.value.length
  return count > 0 ? Math.round((totalScore.value / count) * 10) / 10 : 0
})

const avgPct = computed(() => Math.round((avgScore.value / 5) * 100))

const commentCharCount = computed(() => overallComment.value.length)
const commentMaxChars = 500

const studentPhotoUrl = computed(() => {
  if (student.value?.photoPath) {
    return resolvePhotoUrl(student.value.photoPath, student.value.id)
  }
  return null
})

const studentInitials = computed(() => {
  return getInitials(student.value?.fullName || 'Student')
})

// Reset photo error when the student changes
watch(student, () => { photoError.value = false })

// ── Radar Chart Data ──
const chartData = computed(() => ({
  labels: categories.value.map(c => c.name),
  datasets: [
    {
      label: 'Self Assessment',
      data: categories.value.map(c => getCatScore(c)),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3B82F6',
      borderWidth: 2.5,
      pointBackgroundColor: categories.value.map(c => c.color),
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8,
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
        color: '#94A3B8',
        backdropColor: 'transparent',
        font: { size: 10, family: 'Inter, sans-serif' },
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.2)',
        lineWidth: 0.7,
      },
      angleLines: {
        color: 'rgba(148, 163, 184, 0.2)',
        lineWidth: 0.7,
      },
      pointLabels: {
        color: '#64748B',
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

// ── Helpers ──
function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-emerald-500'
  if (score >= 3.5) return 'text-blue-500'
  if (score >= 2.5) return 'text-amber-500'
  return 'text-red-400'
}

function getBarColor(score: number): string {
  if (score >= 4) return 'bg-emerald-500'
  if (score >= 3) return 'bg-blue-500'
  if (score >= 2) return 'bg-amber-500'
  return 'bg-red-400'
}

function setQuestionScore(question: LocalQuestion, score: number) {
  question.score = score
}

// ── Save draft (localStorage) ──
function saveDraft() {
  isSavingDraft.value = true

  const draftData = {
    form_id: formId.value,
    period: evaluationPeriod.value,
    scores: categories.value.map(cat => ({
      category: cat.name,
      questions: cat.questions.map(q => ({ question_id: q.question_id, score: q.score })),
    })),
    overall_comment: overallComment.value,
    saved_at: new Date().toISOString(),
  }

  localStorage.setItem('evaluationDraft', JSON.stringify(draftData))

  setTimeout(() => {
    isSavingDraft.value = false
    showSuccessToast('Draft saved successfully', 'Saved')
  }, 500)
}

function loadDraft() {
  const savedDraft = localStorage.getItem('evaluationDraft')
  if (!savedDraft) return
  try {
    const draft = JSON.parse(savedDraft)
    draft.scores.forEach((savedScore: { category: string; questions?: { question_id: number; score: number }[] }) => {
      const category = categories.value.find(cat => cat.name === savedScore.category)
      if (!category || !savedScore.questions) return
      savedScore.questions.forEach((sq) => {
        const q = category.questions.find(qt => qt.question_id === sq.question_id)
        if (q) q.score = sq.score
      })
    })
    if (draft.overall_comment) {
      overallComment.value = draft.overall_comment
    }
    if (draft.period) {
      evaluationPeriod.value = draft.period
    }
  } catch (e) {
    console.error('Error loading draft:', e)
  }
}

// ── Submit ──
async function submitEvaluation() {
  if (isSubmitting.value || submitSuccess.value) return
  if (!formId.value) {
    showErrorToast('No evaluation form loaded. Please refresh.', 'Form Error')
    return
  }

  isSubmitting.value = true

  const answers = categories.value.flatMap(cat =>
    cat.questions.map(q => ({
      question_id: q.question_id,
      score: q.score,
      comment: null,
    }))
  )

  try {
    await evaluationApi.submit(studentId.value, {
      evaluation_form_id: formId.value,
      evaluation_period: evaluationPeriod.value,
      answers,
    })

    submitSuccess.value = true
    localStorage.removeItem('evaluationDraft')
    hasPreviousEval.value = true
    showSuccessToast('Self-assessment submitted successfully.', 'Submitted')

    // Redirect back to the student's profile evaluation tab after a short delay
    setTimeout(() => {
      if (studentId.value > 0) {
        router.push({
          name: 'StudentProfile',
          params: { id: studentId.value },
          query: { tab: 'evaluation' },
        })
      } else {
        router.push('/dashboard')
      }
    }, 1800)
  } catch (err: any) {
    console.error('[SelfEvaluation] Submission failed:', err)
    const message = err?.response?.data?.message || 'Failed to submit evaluation. Please try again.'
    showErrorToast(message, 'Submission Failed')
  } finally {
    isSubmitting.value = false
  }
}

const legend = [
  { level: 1, key: 'self_eval.needs_work' },
  { level: 2, key: 'evaluation_tab.fair' },
  { level: 3, key: 'evaluation_tab.good' },
  { level: 4, key: 'evaluation_tab.very_good' },
  { level: 5, key: 'evaluation_tab.excellent' },
]
</script>

<template>
  <div class="space-y-4" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <!-- ════════ HEADER ════════ -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <nav class="flex items-center gap-1.5 text-xs text-[#9CA3AF] dark:text-gray-500 mb-2">
          <button
            @click="router.push('/dashboard')"
            class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {{ t('dashboard.title') }}
          </button>
          <ChevronRightIcon :size="12" class="text-[#D1D5DB] dark:text-gray-600" />
          <span class="text-[#6B7280] dark:text-gray-400 font-medium">{{ t('self_eval.breadcrumb') }}</span>
        </nav>
        <h1 class="text-xl font-semibold text-[#111827] dark:text-white tracking-tight">
          {{ t('self_eval.title') }}
        </h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-0.5">
          {{ hasPreviousEval ? t('self_eval.desc_update') : t('self_eval.desc_new') }}
        </p>
      </div>
      <div class="flex items-center gap-2">          <button
          @click="goBack"
          class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E7EB] dark:border-gray-700/80 bg-white dark:bg-gray-800/50 text-sm font-medium text-[#374151] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-[0.97]"
        >
          <ArrowLeft :size="15" />
          {{ studentId > 0 ? t('student_profile.back_to_students') : t('students.title') }}
        </button>
        <span
          class="text-xs text-[#9CA3AF] dark:text-gray-500 bg-[#F8FAFC] dark:bg-white/[0.04] px-3 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-gray-700 flex items-center gap-1.5"
        >
          <Clock :size="12" class="text-[#9CA3AF]" />
          <span class="font-medium">{{ evaluationPeriod }}</span>
        </span>
      </div>
    </div>

    <!-- ════════ LOADING ════════ -->
    <div
      v-if="loading"
      class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-8 flex items-center justify-center"
      style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <div class="flex items-center gap-3">
        <Loader2 :size="20" class="animate-spin text-blue-500" />
        <span class="text-sm text-[#6B7280] dark:text-gray-400">{{ t('self_eval.loading') }}</span>
      </div>
    </div>

    <!-- ════════ STUDENT INFO CARD ════════ -->
    <div
      v-if="!loading"
      class="group rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
    >
      <div class="flex flex-row justify-between items-center gap-3">
        <div class="flex items-center gap-3">
          <!-- Avatar / Photo -->
          <div class="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
            <img
              v-if="studentPhotoUrl && !photoError"
              :src="studentPhotoUrl"
              :alt="student?.fullName || 'Student'"
              class="w-full h-full object-cover"
              @error="photoError = true"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-blue-500 to-indigo-600"
            >
              {{ studentInitials }}
            </div>
            <div
              class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#131B2E] flex items-center justify-center"
            >
              <CheckCircle2 :size="8" class="text-white" />
            </div>
          </div>
          <div>
            <h3 class="text-base font-semibold text-[#111827] dark:text-white">{{ student?.fullName || 'Student' }}</h3>
            <p class="text-xs text-[#6B7280] dark:text-gray-400">{{ student?.email || student?.studentIdNo || '' }}</p>
            <div class="flex items-center gap-1.5 mt-1">
              <span
                class="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-500/20"
              >
                <GraduationCap :size="10" />
                {{ t('self_eval.student_badge') }}
              </span>
              <span
                v-if="hasPreviousEval"
                class="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20"
              >
                <CheckCircle2 :size="10" />
                {{ t('self_eval.re_evaluating') }}
              </span>
            </div>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-gray-400">
            <GraduationCap :size="12" class="text-blue-500" />
            <span class="font-medium">{{ evaluationPeriod }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ SCORE OVERVIEW CARDS ════════ -->
    <template v-if="!loading">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Live Total -->
        <div
          class="group rounded-[14px] bg-gradient-to-br from-blue-500 to-blue-600 p-4 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-0.5 relative overflow-hidden"
        >
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)] pointer-events-none"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-semibold text-blue-100 uppercase tracking-wider">{{ t('evaluation_tab.total_score') }}</span>
              <Star :size="12" class="text-blue-200" />
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-2xl font-black text-white tabular-nums tracking-tight">{{ totalScore }}</span>
              <span class="text-sm font-medium text-blue-200">/ {{ maxScore }}</span>
            </div>
            <div class="mt-1 flex items-center gap-1 text-[11px] text-blue-200">
              <Zap :size="10" />
              <span>{{ t('self_eval.live') }}</span>
            </div>
          </div>
        </div>

        <!-- Average Score -->
        <div
          class="group rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider">{{ t('evaluation_tab.average_score') }}</span>
            <div class="flex gap-px">
              <svg
                v-for="s in 5"
                :key="s"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                :class="s <= Math.round(avgScore) ? 'text-amber-400 drop-shadow-sm' : 'text-[#D1D5DB] dark:text-gray-600'"
                class="transition-all duration-200"
              >
                <path
                  d="M12 1.5 L14.5 8.5 L22 8.5 L16 13 L18 20.5 L12 16 L6 20.5 L8 13 L2 8.5 L9.5 8.5 Z"
                  fill="currentColor"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
            </div>
          </div>
          <div class="flex items-baseline gap-0.5">
            <span class="text-xl font-bold text-[#111827] dark:text-white tabular-nums">{{ avgScore.toFixed(1) }}</span>
            <span class="text-xs font-medium text-[#9CA3AF] dark:text-gray-500">/ 5</span>
          </div>
          <div class="mt-1.5 w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :class="avgScore >= 4 ? 'bg-emerald-500' : avgScore >= 3 ? 'bg-blue-500' : avgScore >= 2 ? 'bg-amber-500' : 'bg-red-400'"
              :style="{ width: avgPct + '%' }"
            ></div>
          </div>
        </div>

        <!-- Categories Count -->
        <div
          class="group rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
          style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wider">{{ t('self_eval.categories') }}</span>
            <Lightbulb :size="12" class="text-amber-500" />
          </div>
          <div class="flex items-baseline gap-0.5">
            <span class="text-xl font-bold text-[#111827] dark:text-white">{{ categories.length }}</span>
            <span class="text-xs font-medium text-[#9CA3AF] dark:text-gray-500">{{ t('self_eval.rated') }}</span>
          </div>
          <div class="mt-1.5 flex flex-wrap gap-1">
            <span
              v-for="c in categories"
              :key="c.id"
              class="inline-block w-4 h-1 rounded-full transition-all duration-300"
              :style="{ backgroundColor: getCatScore(c) >= 3 ? c.color : '#D1D5DB' }"
            ></span>
          </div>
          <p class="text-[9px] text-[#9CA3AF] dark:text-gray-500 mt-1">{{ t('self_eval.passing', { count: categories.filter(c => getCatScore(c) >= 3).length, total: categories.length }) }}</p>
        </div>
      </div>

      <!-- ════════ MAIN CONTENT: Radar Chart + Categories ════════ -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-200"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-[#111827] dark:text-white">{{ t('self_eval.eval_categories') }}</h2>
            <p class="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
              {{ t('self_eval.click_to_rate') }}
            </p>
          </div>
          <div
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] dark:bg-[#355C8C]/20 border border-[#BFDBFE] dark:border-[#355C8C]/30"
          >
            <Star :size="11" class="fill-[#2563EB] text-[#2563EB]" />
            <span class="text-[11px] font-bold text-[#2563EB] dark:text-blue-300 tabular-nums">{{ avgScore.toFixed(1) }}</span>
            <span class="text-[9px] text-[#60A5FA] dark:text-blue-400">/ 5</span>
          </div>
        </div>

        <!-- Desktop: Radar + Side Cards -->
        <div class="hidden lg:flex items-start gap-4">
          <!-- Radar Chart -->
          <div class="flex-shrink-0 w-full max-w-[380px] mx-auto">
            <div class="h-[340px] w-full">
              <Radar :data="chartData" :options="chartOptions" />
            </div>
          </div>

          <!-- Category Cards -->
          <div class="flex-1 grid grid-cols-2 gap-2">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
            >
              <!-- Header -->
              <div class="flex items-center gap-2 mb-1.5">
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                  :style="{ backgroundColor: cat.color }"
                >
                  <component :is="cat.icon" :size="11" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-semibold text-[#374151] dark:text-gray-300 truncate leading-tight">
                      {{ cat.name }}
                    </p>
                    <span
                      class="text-[10px] font-bold tabular-nums ml-1 flex-shrink-0"
                      :class="getScoreColor(getCatScore(cat))"
                    >
                      {{ getCatScore(cat).toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                <div
                  class="h-full rounded-full transition-all duration-500 ease-out"
                  :class="getBarColor(getCatScore(cat))"
                  :style="{ width: (getCatScore(cat) / 5) * 100 + '%' }"
                ></div>
              </div>

              <!-- Questions -->
              <div class="space-y-1.5 mb-1.5">
                <div
                  v-for="q in cat.questions"
                  :key="q.id"
                  class="flex items-start gap-1"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-[#374151] dark:text-gray-300 leading-snug">{{ q.text }}</p>
                  </div>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      v-for="n in 5"
                      :key="n"
                      @click="setQuestionScore(q, n)"
                      class="w-3.5 h-3.5 rounded-sm text-[7px] font-bold transition-all duration-150 border leading-none"
                      :class="q.score === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-[#9CA3AF] dark:text-gray-500 border-[#E5E7EB] dark:border-gray-600 hover:border-blue-400 hover:text-blue-600'"
                    >
                      {{ n }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Mini progress dots -->
              <div class="flex items-center gap-1 justify-center">
                <span
                  v-for="q in cat.questions"
                  :key="'dot-' + q.id"
                  class="inline-block w-2 h-2 rounded-full transition-all duration-200"
                  :class="q.score >= 3 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile/Tablet: Categories Grid -->
        <div class="lg:hidden">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="group rounded-xl bg-white dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50 p-2.5 transition-all duration-200 hover:shadow-md"
              style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
            >
              <div class="flex items-center gap-2 mb-1.5">
                <div
                  class="w-6 h-6 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  :style="{ backgroundColor: cat.color }"
                >
                  <component :is="cat.icon" :size="11" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-semibold text-[#374151] dark:text-gray-300 truncate">{{ cat.name }}</p>
                    <span class="text-[10px] font-bold tabular-nums ml-1" :class="getScoreColor(getCatScore(cat))">
                      {{ getCatScore(cat).toFixed(1) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="w-full h-1 bg-[#F3F4F6] dark:bg-gray-700 rounded-full overflow-hidden mb-1.5">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="getBarColor(getCatScore(cat))"
                  :style="{ width: (getCatScore(cat) / 5) * 100 + '%' }"
                ></div>
              </div>
              <!-- Questions -->
              <div class="space-y-1.5 mb-1.5">
                <div
                  v-for="q in cat.questions"
                  :key="q.id"
                  class="flex items-start gap-1"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-[#374151] dark:text-gray-300 leading-snug">{{ q.text }}</p>
                  </div>
                  <div class="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      v-for="n in 5"
                      :key="n"
                      @click="setQuestionScore(q, n)"
                      class="w-3.5 h-3.5 rounded-sm text-[7px] font-bold transition-all duration-150 border leading-none"
                      :class="q.score === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-[#9CA3AF] dark:text-gray-500 border-[#E5E7EB] dark:border-gray-600 hover:border-blue-400 hover:text-blue-600'"
                    >
                      {{ n }}
                    </button>
                  </div>
                </div>
              </div>
              <!-- Mini progress dots -->
              <div class="flex items-center gap-1 justify-center">
                <span
                  v-for="q in cat.questions"
                  :key="'dotm-' + q.id"
                  class="inline-block w-2 h-2 rounded-full transition-all duration-200"
                  :class="q.score >= 3 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'"
                ></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-4 pt-4 border-t border-[#E5E7EB] dark:border-gray-700">
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div class="flex-1 w-full">
              <p class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#9CA3AF] dark:text-gray-500 mb-2">
                {{ t('self_eval.score_legend') }}
              </p>
              <div class="grid grid-cols-5 gap-1.5">
                <div
                  v-for="item in legend"
                  :key="item.level"
                  class="flex flex-col items-center py-1.5 px-1 rounded-lg bg-[#F9FAFB] dark:bg-white/[0.04] border border-[#E5E7EB] dark:border-gray-700/50"
                >
                  <div
                    class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm mb-0.5"
                    :class="
                      item.level === 5
                        ? 'bg-emerald-500'
                        : item.level === 4
                          ? 'bg-blue-500'
                          : item.level === 3
                            ? 'bg-amber-500'
                            : item.level === 2
                              ? 'bg-orange-400'
                              : 'bg-red-400'
                    "
                  >
                    {{ item.level }}
                  </div>
                  <span class="text-[8px] text-[#6B7280] dark:text-gray-400 text-center leading-tight">{{
                    t(item.key)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════ OVERALL COMMENT ════════ -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-200"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex items-center gap-2 mb-2.5">
          <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <MessageSquareText :size="12" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#111827] dark:text-white">
              {{ t('self_eval.overall_comment') }}
              <span class="text-[#9CA3AF] dark:text-gray-500 font-normal">{{ t('self_eval.optional') }}</span>
            </label>
          </div>
        </div>
        <textarea
          v-model="overallComment"
          class="w-full p-3 border border-[#E5E7EB] dark:border-gray-700 rounded-xl bg-white dark:bg-[#131B2E] text-[#111827] dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none text-xs transition-all duration-200 placeholder:text-[#9CA3AF] dark:placeholder:text-gray-600"
          rows="3"
          :placeholder="t('self_eval.comment_placeholder')"
          :maxlength="commentMaxChars"
        ></textarea>
        <div class="flex justify-end mt-1">
          <span
            class="text-[11px]"
            :class="
              commentCharCount > commentMaxChars * 0.9
                ? 'text-red-500'
                : commentCharCount > commentMaxChars * 0.75
                  ? 'text-amber-500'
                  : 'text-[#9CA3AF] dark:text-gray-500'
            "
          >
            {{ commentCharCount }} / {{ commentMaxChars }}
          </span>
        </div>
      </div>

      <!-- ════════ ACTION BUTTONS ════════ -->
      <div
        class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 p-4 transition-all duration-200"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)"
      >
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <!-- Left info -->
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20 flex items-center justify-center flex-shrink-0"
            >
              <Send :size="14" class="text-white" />
            </div>
            <div>
              <p class="text-xs font-semibold text-[#111827] dark:text-white">{{ submitSuccess ? t('self_eval.submitted_successfully') : t('self_eval.ready_to_submit') }}</p>
              <p class="text-[11px] text-[#6B7280] dark:text-gray-400 mt-0.5">
                <template v-if="submitSuccess">
                  {{ t('self_eval.submitted_msg') }}
                </template>
                <template v-else>
                  Total: <span class="font-semibold text-blue-600 dark:text-blue-400">{{ totalScore }}</span> / {{ maxScore }}
                </template>
              </p>
            </div>
          </div>

          <!-- Right actions -->
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <!-- Save Draft -->
            <button
              v-if="!submitSuccess"
              type="button"
              @click="saveDraft"
              :disabled="isSavingDraft"
              class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-700 text-[#374151] dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 font-semibold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.97] cursor-pointer"
            >
              <Save :size="13" />
              {{ isSavingDraft ? t('self_eval.saving') : t('self_eval.save_draft') }}
            </button>

            <!-- Submit -->
            <button
              v-if="!submitSuccess"
              type="button"
              @click="submitEvaluation"
              :disabled="isSubmitting"
              class="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-xl transition-all duration-200 shadow-lg active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :class="isSubmitting
                ? 'bg-blue-400'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'"
            >
              <Loader2 v-if="isSubmitting" :size="13" class="animate-spin" />
              <Send v-else :size="13" />
              {{ isSubmitting ? t('evaluation_tab.submitting') : t('evaluation_tab.submit') }}
            </button>

            <!-- Success State -->
            <div
              v-else
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
            >
              <CheckCircle2 :size="14" class="text-emerald-500" />
              <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{{ t('evaluation_tab.submitted') }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Smooth number transitions */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Page transition */
.space-y-4 {
  animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hover card glow */
.group:hover .group-hover\:shadow-md {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
}
</style>
