<script setup lang="ts">
import { ref, computed, shallowRef, onMounted, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudentsStore } from '@/stores/students'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import { studentsApi } from '@/services/api'
import type { Student, BackendStudent } from '@/types'
import {
  Camera,
  Pencil,
  CreditCard,
  ChevronLeft,
  MapPin,
  Calendar,
  Phone,
  Users,
  Clock,
  User,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const studentsStore = useStudentsStore()
const authStore = useAuthStore()
const { t } = useI18n()

const student = ref<Student | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const transitioning = ref(false)

type TabId = 'profile' | 'enrollment' | 'records' | 'evaluation' | 'id-card'

const tabs: { id: TabId; labelKey: string }[] = [
  { id: 'profile', labelKey: 'student_profile.tab.profile' },
  { id: 'enrollment', labelKey: 'student_profile.tab.enrollment' },
  { id: 'records', labelKey: 'student_profile.tab.records' },
  { id: 'evaluation', labelKey: 'student_profile.tab.evaluation' },
  { id: 'id-card', labelKey: 'student_profile.tab.id_card' },
]

const activeTab = ref<TabId>('profile')

const tabLoaders: Record<TabId, () => Promise<any>> = {
  profile: () => import('./tabs/ProfileTab.vue'),
  enrollment: () => import('./tabs/EnrollmentTab.vue'),
  records: () => import('./tabs/RecordsTab.vue'),
  evaluation: () => import('./tabs/EvaluationTab.vue'),
  'id-card': () => import('./tabs/IdCardTab.vue'),
}

const currentTabComponent = shallowRef<Component | null>(null)

function switchTab(tabId: TabId) {
  if (tabId === activeTab.value) return
  transitioning.value = true
  setTimeout(() => {
    activeTab.value = tabId
    loadTabComponent(tabId)
    setTimeout(() => { transitioning.value = false }, 50)
  }, 150)
}

async function loadTabComponent(tabId: TabId) {
  try {
    const mod = await tabLoaders[tabId]()
    currentTabComponent.value = mod.default
  } catch (err) {
    console.error(`Failed to load tab component: ${tabId}`, err)
  }
}

function mapBackendStudent(backend: BackendStudent): Student {
  return {
    id: String(backend.id),
    studentIdNo: backend.student_id_no,
    fullName: backend.full_name,
    gender: backend.gender,
    dob: backend.dob ?? '',
    province: backend.province ?? undefined,
    phone: backend.phone ?? undefined,
    email: backend.email ?? undefined,
    highSchool: backend.high_school ?? undefined,
    program: undefined,
    batch: undefined,
    intakeYear: backend.intake_year ? String(backend.intake_year) : undefined,
    selectionBatchId: backend.selection_batch_id ?? undefined,
    selectionBatchName: backend.selection_batch_name ?? undefined,
    status: ((backend.enrollment_status || backend.status || 'Pending') as string).toLowerCase() as any,
    enrolledAt: backend.enrolled_at ?? undefined,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    importLogId: undefined,
  }
}

async function loadStudent() {
  const id = route.params.id as string

  // If no specific student ID, try to auto-select the first student from the store
  if (!id) {
    if (studentsStore.students.length > 0) {
      student.value = studentsStore.students[0]
      await loadTabComponent(activeTab.value)
      loading.value = false
      return
    }
    // Store is empty — fetch first page and pick the first student
    try {
      await studentsStore.fetchAll({ page: 1 })
      if (studentsStore.students.length > 0) {
        student.value = studentsStore.students[0]
        await loadTabComponent(activeTab.value)
      }
    } catch { /* fall through to empty state */ }
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  try {
    const found = studentsStore.getById(id)
    if (found) {
      student.value = found
    } else {
      const backend = await studentsApi.get(Number(id))
      student.value = mapBackendStudent(backend)
    }
    await loadTabComponent(activeTab.value)
  } catch (err: any) {
    console.error('Failed to load student:', err)
    error.value = 'Failed to load student profile.'
  } finally { loading.value = false }
}

onMounted(() => { loadStudent() })

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; ring: string }> = {
    pending:   { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-600 dark:text-gray-300', ring: 'ring-gray-200 dark:ring-gray-600' },
    rejected:  { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', ring: 'ring-gray-200 dark:ring-gray-600' },
    enrolled:  { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-700 dark:text-slate-300', ring: 'ring-slate-200 dark:ring-slate-600' },
    graduated: { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-600 dark:text-gray-300', ring: 'ring-gray-200 dark:ring-gray-600' },
    dropped:   { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-500 dark:text-gray-400', ring: 'ring-gray-200 dark:ring-gray-600' },
  }
  return styles[status] ?? styles.pending
}

const statusLabels: Record<string, string> = {
  pending: 'Pending', rejected: 'Rejected', enrolled: 'Enrolled', graduated: 'Graduated', dropped: 'Dropped',
}

function goBack() { router.push('/students') }
function editProfile() { if (student.value) router.push({ name: 'StudentEdit', params: { id: student.value.id } }) }
const canEdit = computed(() => authStore.hasPermission('students.edit'))
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Loading -->
    <div v-if="loading" class="animate-pulse space-y-6">
      <div class="h-8 w-48 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
      <div class="bg-white dark:bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div class="h-32 bg-gray-100 dark:bg-gray-700"></div>
        <div class="px-6 pb-6">
          <div class="flex gap-5 -mt-12">
            <div class="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-700 ring-4 ring-white dark:ring-gray-800"></div>
            <div class="flex-1 pt-3 space-y-3">
              <div class="h-6 bg-gray-100 dark:bg-gray-700 rounded-lg w-64"></div>
              <div class="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-48"></div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-6 gap-px bg-gray-100 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-700">
          <div v-for="i in 6" :key="i" class="bg-white dark:bg-gray-800/50 p-4"><div class="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4"></div></div>
        </div>
      </div>
      <div class="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>
      <div class="h-48 bg-gray-100 dark:bg-gray-700 rounded-2xl"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!student && !loading" class="flex flex-col items-center justify-center py-20">
      <div class="w-24 h-24 rounded-3xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-6 ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm">
        <User :size="44" class="text-gray-300 dark:text-gray-500" />
      </div>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">Select a Student</h3>
      <p class="text-sm text-gray-400 dark:text-gray-400 mt-2 max-w-md text-center leading-relaxed">
        Choose a student from the Tracking List to view their full profile, enrollment history, records, evaluations, and ID card.
      </p>
      <button @click="goBack" class="mt-8 inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-slate-600 rounded-xl hover:bg-slate-700 transition-all duration-200 shadow-sm active:scale-[0.98] cursor-pointer">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
        Go to Tracking List
      </button>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20">
      <div class="w-20 h-20 rounded-3xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4 ring-1 ring-gray-200 dark:ring-gray-700">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      </div>
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Failed to load profile</h2>
      <p class="text-sm text-gray-400 dark:text-gray-400 mt-2">{{ error }}</p>
      <button @click="loadStudent" class="mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-slate-600 rounded-xl hover:bg-slate-700 transition-all duration-200 shadow-sm active:scale-[0.98] cursor-pointer">Try Again</button>
    </div>

    <!-- Content -->
    <template v-if="!loading && student">
      <button @click="goBack" class="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-all duration-200 cursor-pointer">
        <ChevronLeft :size="16" class="transition-transform duration-200 group-hover:-translate-x-0.5" />
        {{ t('student_profile.back_to_students') }}
      </button>

      <!-- Profile Header -->
      <div class="relative bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
        <div class="h-36 sm:h-40 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-500 relative overflow-hidden">
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
          <div class="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5"></div>
          <div class="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5"></div>
        </div>

        <div class="px-6 sm:px-8 pb-6">
          <div class="flex flex-col sm:flex-row items-start gap-5 sm:gap-6 -mt-14 sm:-mt-16">
            <div class="relative flex-shrink-0">
              <div class="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-600 flex items-center justify-center shadow-xl ring-4 ring-white dark:ring-gray-800 transition-transform duration-300 hover:scale-[1.02]">
                <span class="text-3xl sm:text-4xl font-bold text-white tracking-wide">{{ getInitials(student.fullName) }}</span>
              </div>
              <button class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center hover:bg-slate-600 transition-all duration-200 shadow-md hover:scale-110 active:scale-95 cursor-pointer" :title="t('student_profile.update_photo')">
                <Camera :size="14" />
              </button>
            </div>

            <div class="flex-1 pt-2 sm:pt-6 w-full">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="min-w-0">
                  <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white tracking-tight truncate">{{ student.fullName }}</h1>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                    <span class="text-sm font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/30 px-2 py-0.5 rounded-md">{{ student.studentIdNo }}</span>
                    <span class="text-gray-200 dark:text-gray-600 hidden sm:inline">·</span>
                    <span class="text-sm text-gray-400 dark:text-gray-400">{{ student.selectionBatchName || 'Batch B' }}</span>
                    <span class="text-gray-200 dark:text-gray-600">·</span>
                    <span class="text-sm text-gray-400 dark:text-gray-400">Intake {{ student.intakeYear || '2025' }}</span>
                  </div>
                </div>
                <div class="flex-shrink-0">
                  <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold ring-1 transition-all duration-200" :class="[getStatusStyle(student.status).bg, getStatusStyle(student.status).text, getStatusStyle(student.status).ring]">
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ statusLabels[student.status] || student.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 mt-5">
            <button class="group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 cursor-pointer">
              <CreditCard :size="16" class="transition-transform duration-200 group-hover:scale-110" />
              {{ t('student_profile.generate_id_card') }}
            </button>
            <button v-if="canEdit" @click="editProfile" class="group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#374151] dark:text-gray-200 bg-[#F3F4F6] dark:bg-gray-700 rounded-xl hover:bg-[#E5E7EB] dark:hover:bg-gray-600 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer">
              <Pencil :size="16" class="transition-transform duration-200 group-hover:scale-110" />
              {{ t('student_profile.edit_profile') }}
            </button>
          </div>
        </div>

        <!-- Info Row -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{{ t('student_profile.gender') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{{ student.gender || '—' }}</p>
          </div>
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Calendar :size="10" class="flex-shrink-0" /> {{ t('student_profile.dob') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{{ student.dob ? formatDate(student.dob) : '—' }}</p>
          </div>
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"><MapPin :size="10" class="flex-shrink-0" /> {{ t('student_profile.province') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{{ student.province || '—' }}</p>
          </div>
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Phone :size="10" class="flex-shrink-0" /> {{ t('student_profile.phone') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{{ student.phone || '—' }}</p>
          </div>
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Users :size="10" class="flex-shrink-0" /> {{ t('student_profile.guardian') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">—</p>
          </div>
          <div class="px-4 sm:px-5 py-3.5 sm:py-4 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors duration-150">
            <div class="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest"><Clock :size="10" class="flex-shrink-0" /> {{ t('student_profile.joined') }}</div>
            <p class="text-sm font-semibold text-gray-800 dark:text-white mt-0.5">{{ student.enrolledAt ? formatDate(student.enrolledAt) : (student.createdAt ? formatDate(student.createdAt) : '—') }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-100 dark:border-gray-700">
        <nav class="flex gap-0 -mb-px overflow-x-auto scrollbar-none" role="tablist">
          <button v-for="tab in tabs" :key="tab.id" role="tab" :aria-selected="activeTab === tab.id" @click="switchTab(tab.id)"
            class="relative px-5 sm:px-6 py-3.5 text-sm font-medium whitespace-nowrap transition-all duration-200 cursor-pointer select-none"
            :class="activeTab === tab.id ? 'text-slate-700 dark:text-slate-300' : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'">
            {{ t(tab.labelKey) }}
            <span class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full transition-all duration-300 ease-out" :class="activeTab === tab.id ? 'bg-slate-500 dark:bg-slate-400 scale-x-100' : 'bg-transparent scale-x-0'"></span>
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 shadow-sm">
        <div class="transition-all duration-200 ease-out" :class="transitioning ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'">
          <template v-if="activeTab === 'profile'">
            <div class="flex items-center justify-between mb-5">
              <h3 class="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">{{ t('student_profile.profile_details') }}</h3>
              <span class="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">{{ t('student_profile.active_tab') }}</span>
            </div>
          </template>
          <component :is="currentTabComponent" v-if="currentTabComponent" :key="activeTab" :student="student" />
        </div>
      </div>
    </template>
  </div>
</template>
