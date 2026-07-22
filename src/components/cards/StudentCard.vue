<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStudentDetailStore } from '@/stores/student'
import type { CardStudent } from '@/services/api/cards'
import QRCode from 'qrcode'
import defaultSchoolLogo from '@/assets/images/PN_logo_clear.png'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-vue-next'

// Define the component options
defineOptions({ name: 'StudentCard' })

// Props definitions, making student optional to support direct self-fetching
const props = withDefaults(
  defineProps<{
    student?: CardStudent | null
    size?: 'sm' | 'md' | 'lg'
    showActions?: boolean
    generated?: boolean
    layout?: 'classic' | 'modern' | 'premium' | 'corporate' | 'corporate-blue' | 'corporate-yellow' | 'official'
    managerName?: string
    issueDate?: string
    expiredDate?: string
    showBack?: boolean
    schoolLogo?: string | null
  }>(),
  {
    student: null,
    size: 'md',
    showActions: false,
    generated: false,
    layout: 'classic',
    managerName: 'SIM HUL',
    showBack: false,
    schoolLogo: null,
  },
)

// Emitted events
const emit = defineEmits<{
  generate: [studentId: number]
  preview: [studentId: number]
  reprint: [studentId: number]
  download: [studentId: number]
  'photo-upload': [studentId: number, file: File]
  'logo-upload': [file: File]
}>()

// Route and Pinia store configuration
const route = useRoute()
const studentStore = useStudentDetailStore()

// State variables for QR code, errors, photo inputs, and local mock uploads
const qrDataUrl = ref<string>('')
const photoError = ref(false)
const logoError = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)
const localPhotoUrl = ref<string | null>(null)
const localLogoUrl = ref<string | null>(null)
const isFlipped = ref(props.showBack)

// Computed student details: fall back to store if props is not supplied
const currentStudent = computed(() => {
  return props.student || (studentStore.student as any)
})

// Loading & error status from store (only active if self-fetching)
const isLoading = computed(() => {
  return !props.student && studentStore.loading
})

const errorMessage = computed(() => {
  return !props.student ? studentStore.error : null
})

// Formatting helpers and default values for ID Card fields (requirement 16: "N/A" fallback)
const displayFullName = computed(() => currentStudent.value?.full_name || 'N/A')
const displayStudentId = computed(() => currentStudent.value?.student_id_no || 'N/A')
const displayGender = computed(() => currentStudent.value?.gender || 'N/A')
const displayStatus = computed(() => currentStudent.value?.enrollment_status || 'N/A')
const displayIntakeYear = computed(() => currentStudent.value?.intake_year ? String(currentStudent.value.intake_year) : 'N/A')
const displayBatchName = computed(() => currentStudent.value?.selection_batch_name || currentStudent.value?.selection_batch?.name || 'N/A')

// Compute school logo
const schoolLogoUrl = computed(() => {
  if (localLogoUrl.value) return localLogoUrl.value
  if (props.schoolLogo) return props.schoolLogo
  return defaultSchoolLogo
})

// Card sizing definitions
const sizePx = computed(() => {
  switch (props.size) {
    case 'sm': return { width: 240, height: 360 }
    case 'lg': return { width: 350, height: 510 }
    case 'md':
    default: return { width: 275, height: 400 }
  }
})

// Photo sizing definitions
const photoSize = computed(() => {
  switch (props.size) {
    case 'sm': return 80
    case 'lg': return 120
    case 'md':
    default: return 100
  }
})

// Photo URL computation with backend URL prepended
const photoUrl = computed(() => {
  if (localPhotoUrl.value) return localPhotoUrl.value
  if (!currentStudent.value?.photo_path) return null
  if (/^https?:\/\//i.test(currentStudent.value.photo_path)) return currentStudent.value.photo_path
  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const apiOrigin = new URL(apiBase).origin
  const path = currentStudent.value.photo_path
  if (path.startsWith('/storage/')) return `${apiOrigin}${path}`
  if (path.startsWith('storage/')) return `${apiOrigin}/${path}`
  return `${apiOrigin}/storage/${path.replace(/^\/+/, '')}`
})

// QR Code contents generated using qr_token (requirement 6)
const qrContent = computed(() => {
  if (!currentStudent.value) return ''
  // Use frontend URL from environment variable for QR code so phone can access the verification page
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin
  
  // Use unique qr_token if available
  if (currentStudent.value.qr_token) {
    return `${frontendUrl}/verify/${currentStudent.value.qr_token}`
  }
  // Fallback to student ID if no QR token
  return `${frontendUrl}/verify/${encodeURIComponent(displayStudentId.value)}`
})

const computedIssueDate = computed(() => {
  if (props.issueDate) return props.issueDate
  if (currentStudent.value?.intake_year) return `October 1, ${currentStudent.value.intake_year}`
  return '—'
})

const computedExpiredDate = computed(() => {
  if (props.expiredDate) return props.expiredDate
  if (currentStudent.value?.intake_year) return `October 1, ${currentStudent.value.intake_year + 2}`
  return '—'
})

// Enrollment status display colors mapping
const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  enrolled: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  pending: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  graduated: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  dropped: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
}

function getStatusStyle(status: string) {
  const key = status?.toLowerCase() || 'pending'
  return statusStyles[key] || statusStyles.pending
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

// Generate the QR code using the qr_token or fallback verify link
async function generateQR() {
  if (!qrContent.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrContent.value, {
      width: 100,
      margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
  } catch (err) {
    console.error('QR Generation failed:', err)
  }
}

// Actions click triggers
function handlePhotoClick() {
  photoInput.value?.click()
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !currentStudent.value) return
  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
  localPhotoUrl.value = URL.createObjectURL(file)
  photoError.value = false
  emit('photo-upload', currentStudent.value.id, file)
}

function handleLogoClick() {
  logoInput.value?.click()
}

function handleLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (localLogoUrl.value) URL.revokeObjectURL(localLogoUrl.value)
  localLogoUrl.value = URL.createObjectURL(file)
  logoError.value = false
  emit('logo-upload', file)
}

function toggleFlip() {
  isFlipped.value = !isFlipped.value
}

// Fetch student details from API if not passed as a prop
async function loadStudentData() {
  if (!props.student) {
    const studentId = route.params.studentId || route.query.studentId || route.params.id
    if (studentId) {
      await studentStore.fetchStudent(studentId as string)
    }
  }
  generateQR()
}

// Lifecycle hooks
onMounted(() => {
  loadStudentData()
})

onUnmounted(() => {
  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
  if (localLogoUrl.value) URL.revokeObjectURL(localLogoUrl.value)
})

// Watchers for data updates
watch(() => currentStudent.value, () => {
  photoError.value = false
  if (localPhotoUrl.value) {
    URL.revokeObjectURL(localPhotoUrl.value)
    localPhotoUrl.value = null
  }
  generateQR()
}, { deep: true })

watch(() => props.schoolLogo, () => {
  if (props.schoolLogo) {
    logoError.value = false
  }
})

watch(() => props.showBack, (val) => {
  isFlipped.value = val
})


</script>

<template>
  <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handlePhotoChange" />
  <input ref="logoInput" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="handleLogoChange" />

  <!-- Loading State (requirement 7) -->
  <div v-if="isLoading" class="flex flex-col items-center justify-center p-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl shadow" :style="{ width: sizePx.width + 'px', height: sizePx.height + 'px' }">
    <Loader2 class="w-10 h-10 text-blue-500 animate-spin mb-3" />
    <p class="text-sm text-gray-500 dark:text-gray-400 font-semibold">Loading Student Card...</p>
  </div>

  <!-- Error State (requirement 8) -->
  <div v-else-if="errorMessage" class="flex flex-col items-center justify-center p-6 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 rounded-2xl shadow text-center" :style="{ width: sizePx.width + 'px', height: sizePx.height + 'px' }">
    <AlertCircle class="w-10 h-10 text-red-500 mb-3" />
    <p class="text-sm font-bold text-red-700 dark:text-red-400 mb-1">Identity Check Error</p>
    <p class="text-xs text-red-500 dark:text-red-400/80 mb-4 px-2">{{ errorMessage }}</p>
    <button @click="loadStudentData" class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow transition-colors">
      <RefreshCw class="w-3.5 h-3.5" />
      Retry
    </button>
  </div>

  <!-- Main Card Container -->
  <div v-else class="card-wrap" :style="{ width: sizePx.width + 'px', height: sizePx.height + 'px', perspective: '1000px' }">
    <div
      class="card-inner relative w-full h-full"
      :class="{ flipped: isFlipped }"
      :style="{ transformStyle: 'preserve-3d', transition: 'transform 0.5s ease' }"
    >
      <!-- ══ FRONT ══ -->
      <div class="card-face absolute inset-0">

        <!-- ── CLASSIC ── -->
        <div v-if="layout === 'classic'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <!-- Header bar -->
          <div class="bg-[#1e3a5f] px-4 py-2.5">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/70 leading-tight">Cambodia</p>
              </div>
              <div v-if="generated" class="shrink-0 px-2.5 py-1 rounded-full text-[7px] font-semibold bg-white/20 text-white border border-white/30">
                Generated
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo (requirement 15: avatar fallback) -->
            <div @click="handlePhotoClick"
              class="rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-900 text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-blue-600 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Status & Batch -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                :style="{ backgroundColor: getStatusStyle(displayStatus).bg, color: getStatusStyle(displayStatus).text }">
                <span class="w-1 h-1 rounded-full inline-block mr-1" :style="{ backgroundColor: getStatusStyle(displayStatus).dot }"></span>
                {{ capitalize(displayStatus) }}
              </span>
              <span v-if="displayBatchName !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">Intake: {{ displayIntakeYear }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR Code (requirement 6) -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-gray-500 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-600 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border border-gray-200 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/90 text-gray-600 hover:bg-white hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>

        <!-- ── MODERN ── -->
        <div v-if="layout === 'modern'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="bg-gradient-to-r from-[#0f2847] to-[#2563eb] px-4 py-2.5">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/77 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-2xl overflow-hidden border-[3px] border-white shadow bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-900 text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-blue-600 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200">Year: {{ displayIntakeYear }}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">{{ displayGender }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-gray-500 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-600 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border border-gray-200 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/90 text-gray-600 hover:bg-white hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>

        <!-- ── PREMIUM ── -->
        <div v-if="layout === 'premium'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden shadow"
          :style="{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }"
          :class="generated ? 'border-amber-300' : 'border-gray-200/60 dark:border-gray-600/60'"
        >
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>
          <div class="px-4 pt-2.5 pb-2">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-sm overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-amber-100/90 leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-amber-400/70 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo -->
            <div class="p-[3px] rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shrink-0 mt-8">
              <div @click="handlePhotoClick"
                class="rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer group relative"
                :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
                <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-800 text-amber-400">
                  <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-white text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-amber-400 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2 py-0.5 rounded text-[9px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/15">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-gray-300 border border-white/10">Intake: {{ displayIntakeYear }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-amber-400/50 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-400 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-gray-900 rounded-lg p-1 border border-amber-400/15 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-800 rounded">
                  <Loader2 class="w-3 h-3 text-amber-500 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/10 text-amber-300 hover:bg-white/20 hover:text-amber-200 transition cursor-pointer border border-amber-400/20 backdrop-blur-sm shadow-md">
            Show Back
          </button>
        </div>

        <!-- ── CORPORATE ── -->
        <div v-if="layout === 'corporate'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <!-- Top right green decorative corner -->
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-green-600 to-green-500 rounded-bl-2xl"></div>
          </div>

          <!-- Header bar -->
          <div class="bg-[#16A34A] px-4 py-2.5">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/70 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-2xl overflow-hidden border-2 border-green-500 bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-900 text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-green-600 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Status & Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-green-100 text-green-700 border border-green-200">
                {{ displayStatus }}
              </span>
              <span class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">Intake: {{ displayIntakeYear }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-gray-500 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-600 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border-2 border-green-500 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/90 text-gray-600 hover:bg-white hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>

        <!-- ── CORPORATE-BLUE ── -->
        <div v-if="layout === 'corporate-blue'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-blue-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-blue-600 to-blue-500 rounded-bl-2xl"></div>
          </div>

          <!-- Header bar -->
          <div class="bg-[#2563EB] px-4 py-2.5">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/70 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-2xl overflow-hidden border-2 border-blue-500 bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-900 text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-blue-600 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Status & Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {{ displayStatus }}
              </span>
              <span class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">Intake: {{ displayIntakeYear }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-gray-500 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-600 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border-2 border-blue-500 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/90 text-gray-600 hover:bg-white hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>

        <!-- ── CORPORATE-YELLOW ── -->
        <div v-if="layout === 'corporate-yellow'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-yellow-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-600 to-yellow-500 rounded-bl-2xl"></div>
          </div>

          <!-- Header bar -->
          <div class="bg-[#EAB308] px-4 py-2.5">
            <div class="flex items-center gap-3">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/70 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-4 pt-4 pb-3 gap-1.5 justify-center">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-2xl overflow-hidden border-2 border-yellow-500 bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-900 text-center truncate w-full px-2" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-yellow-600 text-center tracking-wide" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ displayStudentId }}
            </p>

            <!-- Status & Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center">
              <span class="px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                {{ displayStatus }}
              </span>
              <span class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">{{ displayBatchName }}</span>
              <span v-if="displayIntakeYear !== 'N/A'" class="px-2 py-0.5 rounded text-[9px] font-medium text-gray-600 bg-gray-100 border border-gray-200">Intake: {{ displayIntakeYear }}</span>
            </div>

            <div class="flex-1 min-h-[4px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-1">
              <div class="flex-1 min-w-0 pr-2">
                <p class="text-[8px] text-gray-500 font-semibold">Scan to verify</p>
                <p class="text-[8px] text-gray-600 font-mono truncate">{{ displayStudentId }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border-2 border-yellow-500 shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>
          </div>

          <button @click="toggleFlip" class="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>

        <!-- ── OFFICIAL ── -->
        <div v-if="layout === 'official'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white shadow"
          :class="generated ? 'border-blue-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <!-- Left gold stripe -->
          <div class="absolute left-0 top-0 bottom-0 w-2.5 bg-[#F5C518] z-10"></div>

          <!-- Header -->
          <div class="bg-[#1B3FA0] pl-5 pr-12 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick"
                class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-1" @error="logoError = true" />
                <span v-else class="text-[10px] font-extrabold text-white tracking-wide">PNC</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[11px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[8px] font-medium text-white/70 leading-tight">Cambodia</p>
              </div>
            </div>
          </div>

          <!-- Photo + Name -->
          <div class="flex flex-col items-center pt-4 pb-2 pl-3 gap-1.5 justify-center">
            <div @click="handlePhotoClick"
              class="rounded-full overflow-hidden border-4 border-[#1B3FA0] bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0 mt-8"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="displayFullName" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg class="w-1/2 h-1/2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p class="font-bold text-[#1B3FA0] text-center truncate w-full px-4" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base'">
              {{ displayFullName }}
            </p>
            <span class="px-3 py-0.5 rounded-full text-[8px] font-bold bg-[#F5C518] text-[#1B3FA0] tracking-wider uppercase">Student</span>
          </div>

          <!-- Info fields -->
          <div class="flex flex-col gap-1 px-3 pl-5" :class="size === 'sm' ? 'text-[8px]' : 'text-[9px]'">
            <div class="flex items-center gap-1">
              <span class="text-gray-400 font-semibold shrink-0" :style="{ width: '44px' }">ID No</span>
              <span class="text-gray-700 font-bold font-mono truncate">: {{ displayStudentId }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-gray-400 font-semibold shrink-0" :style="{ width: '44px' }">Batch</span>
              <span class="text-gray-700 font-semibold truncate">: {{ displayBatchName }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-gray-400 font-semibold shrink-0" :style="{ width: '44px' }">Year</span>
              <span class="text-gray-700 font-semibold">: {{ displayIntakeYear }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-gray-400 font-semibold shrink-0" :style="{ width: '44px' }">Status</span>
              <span class="text-gray-700 font-semibold capitalize">: {{ displayStatus }}</span>
            </div>
          </div>

          <!-- Barcode at bottom -->
          <div class="mt-auto pl-3 pb-2.5 pr-3 flex flex-col items-center gap-0.5">
            <svg class="w-full" :height="size === 'sm' ? '24' : '28'" viewBox="0 0 140 28" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="2" height="28" fill="#111"/><rect x="3" y="0" width="1" height="28" fill="#111"/><rect x="5" y="0" width="2" height="28" fill="#111"/><rect x="8" y="0" width="3" height="28" fill="#111"/><rect x="12" y="0" width="1" height="28" fill="#111"/><rect x="14" y="0" width="2" height="28" fill="#111"/><rect x="17" y="0" width="1" height="28" fill="#111"/><rect x="19" y="0" width="3" height="28" fill="#111"/><rect x="23" y="0" width="1" height="28" fill="#111"/><rect x="25" y="0" width="2" height="28" fill="#111"/><rect x="28" y="0" width="3" height="28" fill="#111"/><rect x="32" y="0" width="1" height="28" fill="#111"/><rect x="34" y="0" width="2" height="28" fill="#111"/><rect x="37" y="0" width="1" height="28" fill="#111"/><rect x="39" y="0" width="3" height="28" fill="#111"/><rect x="43" y="0" width="2" height="28" fill="#111"/><rect x="46" y="0" width="1" height="28" fill="#111"/><rect x="48" y="0" width="2" height="28" fill="#111"/><rect x="51" y="0" width="3" height="28" fill="#111"/><rect x="55" y="0" width="1" height="28" fill="#111"/><rect x="57" y="0" width="2" height="28" fill="#111"/><rect x="60" y="0" width="1" height="28" fill="#111"/><rect x="62" y="0" width="3" height="28" fill="#111"/><rect x="66" y="0" width="2" height="28" fill="#111"/><rect x="69" y="0" width="1" height="28" fill="#111"/><rect x="71" y="0" width="2" height="28" fill="#111"/><rect x="74" y="0" width="3" height="28" fill="#111"/><rect x="78" y="0" width="1" height="28" fill="#111"/><rect x="80" y="0" width="2" height="28" fill="#111"/><rect x="83" y="0" width="1" height="28" fill="#111"/><rect x="85" y="0" width="3" height="28" fill="#111"/><rect x="89" y="0" width="2" height="28" fill="#111"/><rect x="92" y="0" width="1" height="28" fill="#111"/><rect x="94" y="0" width="2" height="28" fill="#111"/><rect x="97" y="0" width="3" height="28" fill="#111"/><rect x="101" y="0" width="1" height="28" fill="#111"/><rect x="103" y="0" width="2" height="28" fill="#111"/><rect x="106" y="0" width="1" height="28" fill="#111"/><rect x="108" y="0" width="3" height="28" fill="#111"/><rect x="112" y="0" width="2" height="28" fill="#111"/><rect x="115" y="0" width="1" height="28" fill="#111"/><rect x="117" y="0" width="2" height="28" fill="#111"/><rect x="120" y="0" width="3" height="28" fill="#111"/><rect x="124" y="0" width="1" height="28" fill="#111"/><rect x="126" y="0" width="2" height="28" fill="#111"/><rect x="129" y="0" width="1" height="28" fill="#111"/><rect x="131" y="0" width="3" height="28" fill="#111"/><rect x="135" y="0" width="2" height="28" fill="#111"/><rect x="138" y="0" width="2" height="28" fill="#111"/>
            </svg>
            <p class="text-[7px] font-mono text-gray-500 tracking-widest">{{ displayStudentId }}</p>
          </div>

          <button @click="toggleFlip" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium bg-white/90 text-gray-600 hover:bg-white hover:text-gray-700 transition cursor-pointer shadow-md border border-gray-200">
            Show Back
          </button>
        </div>
      </div>

      <!-- ══ BACK ══ -->
      <div class="card-face absolute inset-0">

        <!-- ── BACK: CLASSIC ── -->
        <div v-if="layout === 'classic'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="bg-[#1e3a5f] px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-[#1e3a5f] dark:text-[#38bdf8] font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-blue-600 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
            </div>
            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                <p class="text-[8px] font-semibold text-blue-600 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-blue-800">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>

        <!-- ── BACK: MODERN ── -->
        <div v-if="layout === 'modern'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="bg-gradient-to-r from-[#0f2847] to-[#2563eb] px-3.5 pt-2.5 pb-3">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight drop-shadow-sm">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 bg-white justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-[#2563eb] dark:text-[#60a5fa] font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-indigo-600 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
            </div>
            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-2.5 py-1.5 border border-blue-100">
                <p class="text-[8px] font-semibold text-blue-600 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-blue-800">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>

        <!-- ── BACK: PREMIUM ── -->
        <div v-if="layout === 'premium'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-amber-300' : 'border-gray-200/60 dark:border-gray-600/60'"
          :style="{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)' }"
        >
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>
          <div class="px-3.5 pt-2.5 pb-2">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-amber-100/90 leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-amber-400/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="mx-3.5 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-amber-400 font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-white/5 p-2 rounded-lg border border-amber-400/15 text-[10px] leading-relaxed text-gray-200">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-amber-400/70 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-amber-100/90">{{ managerName }}</p>
            </div>
            <div class="h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-white/5 rounded-lg px-2.5 py-1.5 border border-amber-400/15">
                <p class="text-[8px] font-semibold text-amber-400/70 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-amber-200">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-white/5 rounded-lg px-2.5 py-1.5 border border-amber-400/15">
                <p class="text-[8px] font-semibold text-amber-400/70 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-200">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-amber-400/30 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-white/10 text-amber-300/70 hover:bg-white/20 hover:text-amber-300 transition cursor-pointer border border-amber-400/15">
              Show Front
            </button>
          </div>
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>
        </div>

        <!-- ── BACK: CORPORATE ── -->
        <div v-if="layout === 'corporate'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-green-600 to-green-500 rounded-bl-2xl"></div>
          </div>
          <div class="bg-[#16A34A] px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-green-600 dark:text-green-400 font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-green-600 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
            </div>
            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-green-50 rounded-lg px-2.5 py-1.5 border border-green-100">
                <p class="text-[8px] font-semibold text-green-600 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-green-800">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>

        <!-- ── BACK: CORPORATE-BLUE ── -->
        <div v-if="layout === 'corporate-blue'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-blue-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-blue-600 to-blue-500 rounded-bl-2xl"></div>
          </div>
          <div class="bg-[#2563EB] px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-blue-600 dark:text-blue-400 font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-blue-600 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
            </div>
            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                <p class="text-[8px] font-semibold text-blue-600 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-blue-800">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>

        <!-- ── BACK: CORPORATE-YELLOW ── -->
        <div v-if="layout === 'corporate-yellow'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-yellow-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <div class="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
            <div class="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-yellow-600 to-yellow-500 rounded-bl-2xl"></div>
          </div>
          <div class="bg-[#EAB308] px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-yellow-600 dark:text-yellow-400 font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer pushes manager/dates to lower half -->
            <div class="flex-1"></div>

            <div class="flex flex-col items-center gap-0.5">
              <p class="text-[8px] font-semibold text-yellow-600 uppercase tracking-wider">Education Manager</p>
              <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
            </div>
            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-yellow-50 rounded-lg px-2.5 py-1.5 border border-yellow-100">
                <p class="text-[8px] font-semibold text-yellow-600 uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-yellow-800">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>

        <!-- ── BACK: OFFICIAL ── -->
        <div v-if="layout === 'official'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden bg-white"
          :class="generated ? 'border-blue-300' : 'border-gray-200 dark:border-gray-600'"
        >
          <!-- Left gold stripe -->
          <div class="absolute left-0 top-0 bottom-0 w-2.5 bg-[#F5C518] z-10"></div>
          <div class="bg-[#1B3FA0] pl-5 pr-12 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col pl-5 pr-4 py-3 gap-1.5 justify-center">
            <!-- About Us Section -->
            <div class="flex flex-col gap-1 text-left">
              <span class="text-[#1B3FA0] font-bold text-[8px] uppercase tracking-wider">About Us</span>
              <p class="bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-[10.5px] leading-relaxed text-gray-600 dark:text-gray-300">
                <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
              </p>
            </div>

            <!-- Spacer -->
            <div class="flex-1"></div>

            <!-- QR + Manager side by side -->
            <div class="flex items-end justify-between gap-2">
              <div class="flex flex-col gap-0.5">
                <p class="text-[8px] font-semibold text-[#1B3FA0] uppercase tracking-wider">Education Manager</p>
                <p class="text-[11px] font-bold text-gray-900">{{ managerName }}</p>
              </div>
              <div class="bg-white rounded-lg p-1 border-2 border-[#1B3FA0] shrink-0 shadow-sm" :style="{ width: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px', height: size === 'sm' ? '40px' : size === 'lg' ? '56px' : '48px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
                  <Loader2 class="w-3 h-3 text-gray-300 animate-spin" />
                </div>
              </div>
            </div>

            <div class="border-t border-gray-200"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-blue-50 rounded-lg px-2.5 py-1.5 border border-blue-100">
                <p class="text-[8px] font-semibold text-[#1B3FA0] uppercase tracking-wider">Issue Date</p>
                <p class="text-[10px] font-bold text-[#1B3FA0]">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                <p class="text-[8px] font-semibold text-amber-600 uppercase tracking-wider">Expired Date</p>
                <p class="text-[10px] font-bold text-amber-800">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <p class="text-center text-gray-400 text-[8px] font-medium">Property of PNC Cambodia • Valid ID Card</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-600 transition cursor-pointer border border-gray-200">
              Show Front
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions block if requested -->
    <div v-if="showActions && currentStudent" class="flex items-center justify-center gap-2 px-4 pb-3 pt-2 mt-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <button @click="emit('preview', currentStudent.id)" class="px-2.5 py-1 rounded-lg text-[9px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer">Preview</button>
      <button @click="emit('generate', currentStudent.id)" class="px-2.5 py-1 rounded-lg text-[9px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 cursor-pointer">Generate</button>
      <button @click="emit('reprint', currentStudent.id)" class="px-2.5 py-1 rounded-lg text-[9px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 cursor-pointer">Reprint</button>
      <button @click="emit('download', currentStudent.id)" class="px-2.5 py-1 rounded-lg text-[9px] font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 cursor-pointer">PDF</button>
    </div>
  </div>
</template>

<style scoped>
.card-wrap {
  display: inline-block;
}
.card-inner {
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.card-inner.flipped {
  transform: rotateY(180deg);
}
.card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 0.75rem;
  overflow: hidden;
}
.card-face:last-child {
  transform: rotateY(180deg);
}
</style>
