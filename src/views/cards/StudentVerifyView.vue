<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { cardsApi, type CardStudent } from '@/services/api/cards'
import { CheckCircle, GraduationCap, MapPin, Calendar, User, Loader2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const studentId = computed(() => (route.params.studentId as string) || '')
const student = ref<CardStudent | null>(null)
const loading = ref(true)
const error = ref('')

// Fetch verified student data from the public API by numeric ID
async function fetchStudent() {
  loading.value = true
  error.value = ''
  try {
    const numericId = Number(studentId.value)
    if (isNaN(numericId)) {
      throw new Error('Invalid student ID')
    }
    const data = await cardsApi.verifyById(numericId)
    student.value = data as CardStudent
  } catch (err: unknown) {
    console.error('Failed to load student:', err)
    student.value = null
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
    error.value = axiosErr.response?.data?.message || 'Could not load student details.'
  } finally {
    loading.value = false
  }
}

// Fallback data from URL query params
const queryData = computed(() => ({
  name: (route.query.name as string) || student.value?.full_name || 'Student',
  gender: (route.query.gender as string) || student.value?.gender || '—',
  batch: (route.query.batch as string) || student.value?.selection_batch_name || '—',
  year: (route.query.year as string) || String(student.value?.intake_year || ''),
  status: (route.query.status as string) || student.value?.enrollment_status || 'unknown',
  dob: (route.query.dob as string) || student.value?.dob || '',
  province: (route.query.province as string) || student.value?.province || '',
}))

const initials = computed(() => {
  const name = queryData.value.name
  if (!name?.trim()) return 'ST'
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
})

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    enrolled: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6', label: 'Enrolled' },
    pending: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316', label: 'Pending' },
    graduated: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6', label: 'Graduated' },
    rejected: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'Rejected' },
    dropped: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'Dropped' },
  }
  const s = status?.toLowerCase() || 'unknown'
  return styles[s] || { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', label: status || 'Unknown' }
}

onMounted(() => {
  fetchStudent()
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-start justify-center p-4 sm:p-6">
    <div class="w-full max-w-md">
      <!-- Header -->
      <div class="text-center mb-6 mt-4 sm:mt-8">
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
          <CheckCircle :size="14" />
          Student ID Verification
        </div>
        <h1 class="text-lg font-bold text-gray-900 dark:text-white">Identity Card</h1>
        <p class="text-sm text-gray-400 mt-1">Passerelles Numériques Cambodge</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <Loader2 :size="32" class="text-blue-500 animate-spin mb-3" />
        <p class="text-sm text-gray-400">Verifying student identity...</p>
      </div>

      <!-- Student Card Display -->
      <div v-if="!loading" class="bg-white dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- Top gradient bar -->
        <div class="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>

        <!-- Verified Badge -->
        <div class="flex items-center justify-between px-5 pt-4 pb-2">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <span class="text-[10px] font-extrabold text-white tracking-wider">PNC</span>
            </div>
            <div>
              <p class="text-[10px] font-extrabold text-gray-900 dark:text-white leading-tight">Passerelles Numériques</p>
              <p class="text-[7px] font-semibold text-gray-400 tracking-widest uppercase">Cambodia</p>
            </div>
          </div>
          <div v-if="student" class="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold"
            :style="{ backgroundColor: getStatusStyle(student.enrollment_status).bg, color: getStatusStyle(student.enrollment_status).text }">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getStatusStyle(student.enrollment_status).dot }"></span>
            {{ getStatusStyle(student.enrollment_status).label }}
          </div>
        </div>

        <div class="px-5 pb-5">
          <!-- Photo + Name -->
          <div class="flex flex-col items-center mb-4 mt-1">
            <!-- Photo with frame -->
            <div class="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-md ring-4 ring-white dark:ring-gray-700 mb-3">
              <span class="text-3xl font-extrabold text-white drop-shadow-sm">{{ initials }}</span>
            </div>
            <h2 class="text-xl font-bold text-center text-gray-900 dark:text-white">{{ queryData.name }}</h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 tracking-wider">{{ studentId }}</span>
            </div>
          </div>

          <!-- Info Cards Grid -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1.5 mb-1">
                <User :size="13" class="text-gray-400" />
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Gender</p>
              </div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ queryData.gender || '—' }}</p>
            </div>
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1.5 mb-1">
                <GraduationCap :size="13" class="text-gray-400" />
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Batch</p>
              </div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ queryData.batch }}</p>
            </div>
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1.5 mb-1">
                <Calendar :size="13" class="text-gray-400" />
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Intake Year</p>
              </div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ queryData.year || '—' }}</p>
            </div>
            <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1.5 mb-1">
                <MapPin :size="13" class="text-gray-400" />
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Province</p>
              </div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ queryData.province || '—' }}</p>
            </div>
            <div v-if="queryData.dob" class="col-span-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-1.5 mb-1">
                <Calendar :size="13" class="text-gray-400" />
                <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Date of Birth</p>
              </div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatDate(queryData.dob) }}</p>
            </div>
          </div>

          <!-- Additional details from API -->
          <div v-if="student?.phone || student?.email || student?.high_school" class="border-t border-gray-100 dark:border-gray-700 pt-3 mb-3">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact &amp; Education</p>
            <div class="space-y-2">
              <div v-if="student.phone" class="flex items-center justify-between text-xs">
                <span class="text-gray-400">Phone</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ student.phone }}</span>
              </div>
              <div v-if="student.email" class="flex items-center justify-between text-xs">
                <span class="text-gray-400">Email</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ student.email }}</span>
              </div>
              <div v-if="student.high_school" class="flex items-center justify-between text-xs">
                <span class="text-gray-400">High School</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ student.high_school }}</span>
              </div>
            </div>
          </div>

          <!-- Error banner -->
          <div v-if="error" class="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle :size="15" class="text-amber-500 flex-shrink-0 mt-0.5" />
            <p class="text-xs text-amber-700 dark:text-amber-400">{{ error }}</p>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
            <div class="flex items-center justify-between text-[9px]">
              <span class="text-gray-400 font-semibold tracking-wide">Property of PNC</span>
              <span class="text-gray-300 dark:text-gray-600">Verified · {{ new Date().toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Error state (no data at all) -->
      <div v-if="!loading && !queryData.name && !student" class="bg-white dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <AlertCircle :size="28" class="text-red-500" />
        </div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Invalid Card</h2>
        <p class="text-sm text-gray-400">This student ID could not be found. The link may be invalid or the student record has been removed.</p>
      </div>

      <!-- Footer note -->
      <p class="text-center text-[10px] text-gray-400 mt-6 mb-4">
        This is an official student identity verification from Passerelles Numériques Cambodge.
      </p>
    </div>
  </div>
</template>
