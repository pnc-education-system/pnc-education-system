<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { cardsApi, type CardStudent } from '@/services/api/cards'
import StudentCard from '@/components/cards/StudentCard.vue'
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-vue-next'

const route = useRoute()
const token = computed(() => (route.params.token as string) || '')

// Extract student data from QR code URL query params (fallback when API fails)
const qrFallbackData = computed((): Partial<CardStudent> | null => {
  const q = route.query
  if (!q.name) return null // No query params = no fallback
  return {
    id: 0,
    student_id_no: token.value || '',
    full_name: (q.name as string) || '',
    gender: (q.gender as string) || '',
    dob: (q.dob as string) || null,
    province: (q.province as string) || '',
    enrollment_status: (q.status as string) || 'Unknown',
    intake_year: q.year ? Number(q.year) : null,
    selection_batch_name: (q.batch as string) || '',
  }
})
const student = ref<CardStudent | null>(null)
const loading = ref(true)
const error = ref('')
const valid = ref(false)
const cardVisible = ref(false)

const mounted = ref(false)

onMounted(() => {
  // Trigger entrance animation
  nextTick(() => { mounted.value = true })
  if (token.value) {
    fetchStudent()
  } else {
    loading.value = false
    error.value = 'No verification token provided'
  }
})

// Whether the student has a generated ID card
const hasCard = computed(() => !!student.value?.qr_token)

// Friendly card status notice
const cardNotice = computed(() => {
  if (!student.value) return ''
  if (!hasCard.value) {
    return 'ID card coming soon! An administrator will generate this student\'s ID card.'
  }
  return ''
})

// Error header based on context
const errorHeader = computed(() => {
  if (!error.value) return 'Student Not Found'
  if (error.value.toLowerCase().includes('token') || error.value.toLowerCase().includes('qr')) {
    return 'Invalid Verification Link'
  }
  if (error.value.toLowerCase().includes('not found')) {
    return 'Student Not Found'
  }
  return 'Verification Failed'
})

// Fetch verified student data from the public API
async function fetchStudent() {
  loading.value = true
  error.value = ''
  cardVisible.value = false
  try {
    // First try looking up by QR token
    try {
      const data = await cardsApi.verifyQrToken(token.value)
      student.value = data as CardStudent
      valid.value = true
    } catch (qrErr: unknown) {
      // Fallback: look up by student ID number (e.g. "STU-2025-0001")
      try {
        const data = await cardsApi.getByStudentIdNo(token.value)
        student.value = data as CardStudent
        valid.value = true
      } catch (idErr: unknown) {
        // Fallback: look up by numeric database ID (e.g. "/verify/1")
        const numericId = Number(token.value)
        if (!isNaN(numericId) && numericId > 0) {
          const data = await cardsApi.verifyById(numericId)
          student.value = data as CardStudent
          valid.value = true
        } else {
          // Re-throw so outer catch handles it
          throw idErr
        }
      }
    }

    // Animate card in after a tiny delay
    setTimeout(() => {
      cardVisible.value = true
    }, 100)
  } catch (err: unknown) {
    // Fallback: try to use data embedded in the QR code URL query params
    if (qrFallbackData.value) {
      student.value = qrFallbackData.value as CardStudent
      valid.value = true
      // Card becomes visible with a warning banner
      await nextTick()
      setTimeout(() => {
        cardVisible.value = true
      }, 100)
      return
    }

    student.value = null
    valid.value = false
    const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
    error.value = axiosErr.response?.data?.message || (axiosErr.response?.status === 404 ? 'Student not found. The link may be invalid or the student has been removed.' : 'Could not load student details. Please try again later.')
  } finally {
    loading.value = false
  }
}

const initials = computed(() => {
  const name = student.value?.full_name
  if (!name?.trim()) return 'ST'
  return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 flex items-start justify-center p-4 sm:p-6 relative overflow-hidden">
    <!-- Background decorative elements -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-blue-200/20 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-100/10 to-indigo-100/10 dark:from-blue-500/3 dark:to-indigo-500/3 rounded-full blur-3xl"></div>
    </div>

    <div class="w-full max-w-md relative z-10">
      <!-- Header -->
      <div
        class="text-center mb-6 mt-4 sm:mt-8 transition-all duration-700 ease-out"
        :class="mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'"
      >
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3 backdrop-blur-sm border border-blue-200/50 dark:border-blue-500/20 shadow-sm">
          <ShieldCheck :size="14" />
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
      <div
        v-if="!loading && valid && student"
        class="transition-all duration-500 ease-out"
        :class="cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <!-- Card Notice Banner (no card or using URL fallback data) -->
        <div v-if="cardNotice || student.id === 0" class="mx-0 mb-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3 transition-all duration-300 hover:shadow-md">
          <AlertCircle :size="18" class="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p class="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {{ student.id === 0 ? 'Limited Information' : 'No ID Card Generated' }}
            </p>
            <p class="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
              {{ student.id === 0 ? 'Student data was extracted from the QR code. Full details may not be available from the server.' : cardNotice }}
            </p>
          </div>
        </div>

        <!-- Student Card Component -->
        <StudentCard
          :student="student"
          :generated="hasCard"
          layout="classic"
          size="lg"
        />
      </div>

      <!-- Error state -->
      <div
        v-if="!loading && !valid"
        class="bg-white dark:bg-gray-800/80 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center transition-all duration-500"
        :class="mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'"
      >
        <div class="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-500/10 dark:to-red-500/5 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <AlertCircle :size="28" class="text-red-500" />
        </div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ errorHeader }}</h2>
        <p class="text-sm text-gray-400">{{ error || 'This student ID could not be found. The link may be invalid or the student record has been removed.' }}</p>
      </div>

      <!-- Footer note -->
      <p class="text-center text-[10px] text-gray-400 mt-6 mb-4 transition-all duration-700" :class="mounted ? 'opacity-100' : 'opacity-0'">
        This is an official student identity verification from Passerelles Numériques Cambodge.
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes sv-gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient {
  animation: sv-gradient-shift 3s ease infinite;
}
</style>
