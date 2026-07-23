<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { CardStudent } from '@/services/api/cards'
import QRCode from 'qrcode'
import defaultSchoolLogo from '@/assets/images/PN_logo_clear.png'

const props = withDefaults(
  defineProps<{
    student: CardStudent | null
    size?: 'sm' | 'md' | 'lg'
    showActions?: boolean
    generated?: boolean
    layout?: 'classic' | 'modern' | 'premium'
    managerName?: string
    issueDate?: string
    expiredDate?: string
    showBack?: boolean
    schoolLogo?: string | null
  }>(),
  {
    size: 'md',
    showActions: false,
    generated: false,
    layout: 'classic',
    managerName: 'SIM HUL',
    showBack: false,
    schoolLogo: null,
  },
)

const emit = defineEmits<{
  generate: [studentId: number]
  preview: [studentId: number]
  reprint: [studentId: number]
  download: [studentId: number]
  'photo-upload': [studentId: number, file: File]
  'logo-upload': [file: File]
}>()

const qrDataUrl = ref<string>('')
const photoError = ref(false)
const logoError = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const logoInput = ref<HTMLInputElement | null>(null)
const localPhotoUrl = ref<string | null>(null)
const localLogoUrl = ref<string | null>(null)
const isFlipped = ref(props.showBack)

const schoolLogoUrl = computed(() => {
  if (localLogoUrl.value) return localLogoUrl.value
  if (props.schoolLogo) return props.schoolLogo
  return defaultSchoolLogo
})

const sizePx = computed(() => {
  switch (props.size) {
    case 'sm': return { width: 240, height: 360 }
    case 'lg': return { width: 350, height: 510 }
    case 'md':
    default: return { width: 275, height: 400 }
  }
})

const photoSize = computed(() => {
  switch (props.size) {
    case 'sm': return 60
    case 'lg': return 95
    case 'md':
    default: return 76
  }
})

const studentInitials = computed(() => {
  if (!props.student?.full_name?.trim()) return 'ST'
  const parts = props.student.full_name.trim().split(/\s+/)
  return parts.map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'
})

const photoUrl = computed(() => {
  if (localPhotoUrl.value) return localPhotoUrl.value
  if (!props.student?.photo_path) return null
  if (/^https?:\/\//i.test(props.student.photo_path)) return props.student.photo_path
  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const apiOrigin = new URL(apiBase).origin
  const path = props.student.photo_path
  if (path.startsWith('/storage/')) return `${apiOrigin}${path}`
  if (path.startsWith('storage/')) return `${apiOrigin}/${path}`
  return `${apiOrigin}/storage/${path.replace(/^\/+/, '')}`
})

const qrContent = computed(() => {
  if (!props.student) return ''
  const origin = window.location.origin
  const params = new URLSearchParams({
    name: props.student.full_name,
    gender: props.student.gender || '',
    batch: props.student.selection_batch_name || '',
    year: String(props.student.intake_year || ''),
    status: props.student.enrollment_status,
  })
  if (props.student.dob) params.set('dob', props.student.dob)
  if (props.student.province) params.set('province', props.student.province)
  return `${origin}/verify/${encodeURIComponent(props.student.student_id_no)}?${params.toString()}`
})

const computedIssueDate = computed(() => {
  if (props.issueDate) return props.issueDate
  if (props.student?.intake_year) return `October 1, ${props.student.intake_year}`
  return '—'
})

const computedExpiredDate = computed(() => {
  if (props.expiredDate) return props.expiredDate
  if (props.student?.intake_year) return `October 1, ${props.student.intake_year + 2}`
  return '—'
})

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  enrolled: { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  pending: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  graduated: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  dropped: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
}

function getStatusStyle(status: string): { bg: string; text: string; dot: string } {
  return statusStyles[status] || statusStyles.pending
}

function capitalize(s: string | null | undefined) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function studentStatus(): string {
  return props.student?.enrollment_status ?? ''
}

function studentIdNo(): string {
  return props.student?.student_id_no ?? ''
}

async function generateQR() {
  if (!qrContent.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrContent.value, {
      width: 100, margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
  } catch { /* silent */ }
}

function handlePhotoClick() { photoInput.value?.click() }

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.student) return
  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
  localPhotoUrl.value = URL.createObjectURL(file)
  photoError.value = false
  emit('photo-upload', props.student.id, file)
}

function handleLogoClick() { logoInput.value?.click() }

function handleLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (localLogoUrl.value) URL.revokeObjectURL(localLogoUrl.value)
  localLogoUrl.value = URL.createObjectURL(file)
  logoError.value = false
  emit('logo-upload', file)
}

function toggleFlip() { isFlipped.value = !isFlipped.value }

onMounted(() => { generateQR() })

onUnmounted(() => {
  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
  if (localLogoUrl.value) URL.revokeObjectURL(localLogoUrl.value)
})

watch(() => props.student, () => {
  photoError.value = false
  if (localPhotoUrl.value) {
    URL.revokeObjectURL(localPhotoUrl.value)
    localPhotoUrl.value = null
  }
  isFlipped.value = props.showBack
  generateQR()
})

watch(() => props.schoolLogo, () => {
  if (props.schoolLogo) {
    logoError.value = false
  }
})

watch(() => props.showBack, (val) => { isFlipped.value = val })
</script>

<template>
  <input ref="photoInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="handlePhotoChange" />
  <input ref="logoInput" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" class="hidden" @change="handleLogoChange" />

  <div class="card-wrap" :style="{ width: sizePx.width + 'px', height: sizePx.height + 'px', perspective: '1000px' }">
    <div
      class="card-inner relative w-full h-full"
      :class="{ flipped: isFlipped }"
      :style="{ transformStyle: 'preserve-3d', transition: 'transform 0.5s ease' }"
    >
      <!-- ══ FRONT ══ -->
      <div class="card-face absolute inset-0">

        <!-- ── CLASSIC ── -->
        <div v-if="layout === 'classic'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-emerald-300 shadow-md' : 'border-gray-200 dark:border-gray-600 shadow'"
          :style="{ background: '#fff', fontFamily: 'Inter, sans-serif' }"
        >
          <!-- Header bar -->
          <div class="bg-[#1e3a5f] px-3.5 py-2">
            <div class="flex items-center gap-2.5">
              <div @click="handleLogoClick"
                class="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[9px] font-extrabold text-white tracking-wide">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Cambodia</p>
              </div>
              <div v-if="generated" class="shrink-0 px-2 py-0.5 rounded-full text-[7px] font-semibold bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
                <svg class="w-2 h-2 inline mr-0.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generated
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-3.5 pt-3 pb-2.5 gap-1">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
                <span class="font-bold text-white" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'">{{ studentInitials }}</span>
              </div>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center rounded-full">
                <svg class="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-800 text-center truncate w-full px-1" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ student?.full_name || 'Student Name' }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-blue-500 text-center tracking-wide" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'">
              {{ studentIdNo() || 'ST-0000' }}
            </p>

            <!-- Status & Batch -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center mt-0.5">
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold"
                :style="{ backgroundColor: getStatusStyle(studentStatus()).bg, color: getStatusStyle(studentStatus()).text }">
                <span class="w-1 h-1 rounded-full" :style="{ backgroundColor: getStatusStyle(studentStatus()).dot }"></span>
                {{ capitalize(studentStatus()) }}
              </span>
              <span v-if="student?.selection_batch_name" class="text-[8px] text-gray-400 font-medium">{{ student.selection_batch_name }}</span>
              <span v-if="student?.intake_year" class="text-[8px] text-gray-300">· {{ student.intake_year }}</span>
            </div>

            <div class="flex-1 min-h-[2px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-0.5 mt-auto">
              <div class="flex-1 min-w-0 pr-1">
                <p class="text-[7px] text-gray-400 font-semibold">Scan to verify</p>
                <p class="text-[7px] text-gray-300 font-mono truncate">{{ student?.student_id_no || '' }}</p>
              </div>
              <div class="bg-white rounded p-0.5 border border-gray-100/60 shrink-0" :style="{ width: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px', height: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded"><svg class="w-3 h-3 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg></div>
              </div>
            </div>

            <p class="text-center text-gray-300 text-[7px] font-medium">Passerelles Numériques · {{ student?.intake_year || '—' }}</p>
          </div>

          <!-- Flip -->
          <button @click="toggleFlip" class="absolute bottom-1 right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium bg-gray-100/60 text-gray-400 hover:bg-gray-200 hover:text-gray-500 transition cursor-pointer border border-gray-200/40">
            <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Flip
          </button>

          <div v-if="showActions && student" class="flex items-center justify-center gap-1.5 px-3 pb-2 pt-1.5 border-t border-gray-100">
            <button @click="emit('preview', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition cursor-pointer">Preview</button>
            <button @click="emit('generate', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer">Generate</button>
            <button @click="emit('reprint', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer">Reprint</button>
            <button @click="emit('download', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 transition cursor-pointer">PDF</button>
          </div>
        </div>

        <!-- ── MODERN ── -->
        <div v-if="layout === 'modern'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-emerald-300 shadow-md' : 'border-gray-200 dark:border-gray-600 shadow'"
          :style="{ background: '#fff', fontFamily: 'Inter, sans-serif' }"
        >
          <!-- Top gradient band -->
          <div class="bg-gradient-to-r from-[#0f2847] to-[#2563eb] px-3.5 pt-2.5 pb-7">
            <div class="flex items-center gap-2.5">
              <div @click="handleLogoClick"
                class="w-7 h-7 rounded-md bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[9px] font-extrabold text-white tracking-wide">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-white leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Cambodia</p>
              </div>
              <div v-if="generated" class="shrink-0 px-2 py-0.5 rounded-full text-[7px] font-semibold bg-white/15 text-white border border-white/25 backdrop-blur">
                <svg class="w-2 h-2 inline mr-0.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generated
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-3.5 pb-2.5 gap-1 -mt-5">
            <!-- Photo -->
            <div @click="handlePhotoClick"
              class="rounded-full overflow-hidden border-[3px] border-white shadow bg-gray-50 flex items-center justify-center cursor-pointer group relative shrink-0"
              :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
              <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name" class="w-full h-full object-cover" @error="photoError = true" />
              <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-300 to-blue-500">
                <span class="font-bold text-white drop-shadow-sm" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'">{{ studentInitials }}</span>
              </div>
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center rounded-full">
                <svg class="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-gray-800 text-center truncate w-full px-1" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ student?.full_name || 'Student Name' }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-blue-500 text-center tracking-wide" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'">
              {{ student?.student_id_no || 'ST-0000' }}
            </p>

            <!-- Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center mt-0.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-semibold bg-blue-50 text-blue-600">{{ student?.selection_batch_name || '—' }}</span>
              <span v-if="student?.intake_year" class="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-semibold bg-indigo-50 text-indigo-600">{{ student.intake_year }}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-semibold bg-gray-50 text-gray-500">{{ student?.gender || '—' }}</span>
            </div>

            <div class="flex-1 min-h-[2px]"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-0.5 mt-auto">
              <div class="flex-1 min-w-0 pr-1">
                <p class="text-[7px] text-gray-400 font-semibold">Scan to verify</p>
                <p class="text-[7px] text-gray-300 font-mono truncate">{{ student?.student_id_no || '' }}</p>
              </div>
              <div class="bg-white rounded p-0.5 border border-gray-100/60 shrink-0" :style="{ width: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px', height: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded"><svg class="w-3 h-3 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg></div>
              </div>
            </div>

            <p class="text-center text-gray-300 text-[7px] font-medium">Passerelles Numériques · {{ student?.intake_year || '—' }}</p>
          </div>

          <button @click="toggleFlip" class="absolute bottom-1 right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium bg-white/70 text-gray-400 hover:bg-white hover:text-gray-500 transition cursor-pointer border border-gray-200/60 backdrop-blur-sm shadow-xs">
            <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Flip
          </button>

          <div v-if="showActions && student" class="flex items-center justify-center gap-1.5 px-3 pb-2 pt-1.5 border-t border-gray-100 bg-white">
            <button @click="emit('preview', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition cursor-pointer">Preview</button>
            <button @click="emit('generate', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer">Generate</button>
            <button @click="emit('reprint', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition cursor-pointer">Reprint</button>
            <button @click="emit('download', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 transition cursor-pointer">PDF</button>
          </div>
        </div>

        <!-- ── PREMIUM ── -->
        <div v-if="layout === 'premium'"
          class="relative w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-amber-300 shadow-md' : 'border-gray-200/60 dark:border-gray-600/60 shadow'"
          :style="{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)', fontFamily: 'Inter, sans-serif' }"
        >
          <!-- Gold line -->
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>

          <!-- Header -->
          <div class="px-3.5 pt-2 pb-1">
            <div class="flex items-center gap-2.5">
              <div @click="handleLogoClick"
                class="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-sm overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[9px] font-extrabold text-white tracking-wide">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-amber-100/90 leading-tight truncate">Passerelles Numériques</p>
                <p class="text-[7px] font-medium text-amber-400/50 leading-tight">Cambodia</p>
              </div>
              <div v-if="generated" class="shrink-0 px-2 py-0.5 rounded-full text-[7px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20 backdrop-blur-sm">
                <svg class="w-2 h-2 inline mr-0.5 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generated
              </div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center px-3.5 pb-2.5 gap-1">
            <!-- Decorative divider -->
            <div class="w-10 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent mb-1"></div>

            <!-- Photo -->
            <div class="p-[2px] rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/10">
              <div @click="handlePhotoClick"
                class="rounded-full overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer group relative"
                :style="{ width: photoSize + 'px', height: photoSize + 'px' }">
                <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name" class="w-full h-full object-cover" @error="photoError = true" />
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-800">
                  <span class="font-bold text-white" :class="size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg'">{{ studentInitials }}</span>
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center rounded-full">
                  <svg class="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Name -->
            <p class="font-bold text-white text-center truncate w-full px-1 drop-shadow-sm" :class="size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'">
              {{ student?.full_name || 'Student Name' }}
            </p>

            <!-- ID -->
            <p class="font-mono font-semibold text-amber-400 text-center tracking-wide" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'">
              {{ student?.student_id_no || 'ST-0000' }}
            </p>

            <!-- Pills -->
            <div class="flex items-center gap-1.5 flex-wrap justify-center mt-0.5">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/15">{{ student?.selection_batch_name || '—' }}</span>
              <span v-if="student?.intake_year" class="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold bg-white/5 text-gray-300 border border-white/10">{{ student.intake_year }}</span>
            </div>

            <div class="flex-1 min-h-[2px]"></div>

            <!-- Divider -->
            <div class="w-full h-px bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"></div>

            <!-- QR -->
            <div class="flex items-center justify-between w-full px-0.5">
              <div class="flex-1 min-w-0 pr-1">
                <p class="text-[7px] text-amber-400/50 font-semibold">Scan to verify</p>
                <p class="text-[7px] text-gray-500 font-mono truncate">{{ student?.student_id_no || '' }}</p>
              </div>
              <div class="bg-gray-900 rounded p-0.5 border border-amber-400/15 shrink-0" :style="{ width: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px', height: size === 'sm' ? '38px' : size === 'lg' ? '54px' : '46px' }">
                <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex items-center justify-center"><svg class="w-3 h-3 text-gray-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg></div>
              </div>
            </div>

            <p class="text-center text-amber-400/20 text-[7px] font-medium">Passerelles Numériques · {{ student?.intake_year || '—' }}</p>
          </div>

          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>

          <button @click="toggleFlip" class="absolute bottom-1 right-1 z-10 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-medium bg-black/30 text-amber-300/50 hover:bg-black/50 hover:text-amber-300 transition cursor-pointer border border-amber-400/15 backdrop-blur-sm">
            <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Flip
          </button>

          <div v-if="showActions && student" class="flex items-center justify-center gap-1.5 px-3 pb-2 pt-1.5 border-t border-amber-400/10">
            <button @click="emit('preview', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition cursor-pointer border border-blue-500/15">Preview</button>
            <button @click="emit('generate', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition cursor-pointer border border-emerald-500/15">Generate</button>
            <button @click="emit('reprint', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition cursor-pointer border border-amber-500/15">Reprint</button>
            <button @click="emit('download', student.id)" class="px-2 py-0.5 rounded text-[8px] font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition cursor-pointer border border-white/10">PDF</button>
          </div>
        </div>
      </div>

      <!-- ══ BACK ══ -->
      <div class="card-face absolute inset-0">

        <!-- ── BACK: CLASSIC ── -->
        <div v-if="layout === 'classic'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
          :style="{ background: '#fff', fontFamily: 'Inter, sans-serif' }"
        >
          <div class="bg-[#1e3a5f] px-3.5 py-2.5">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-3.5 py-2.5 gap-1.5">
            <p class="text-[7px] text-gray-500 leading-relaxed line-clamp-3"><b>Passerelles Numériques Cambodia.</b> Is a french non-profit organization, created in 2005, wihich intends to enable the most under priviliged young people access to higher education and skilled employment in the promising sector of Information Technology.</p>
            <div class="border-t border-gray-100"></div>
            <p class="text-[7px] font-semibold text-gray-400 uppercase tracking-wider">Education Manager</p>
            <p class="text-[10px] font-bold text-gray-700 -mt-0.5">{{ managerName }}</p>
            <div class="border-t border-gray-100"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-blue-50/70 rounded px-2.5 py-1.5">
                <p class="text-[6px] font-semibold text-blue-500 uppercase tracking-wider">Issue Date</p>
                <p class="text-[8px] font-bold text-blue-700">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-amber-50/70 rounded px-2.5 py-1.5">
                <p class="text-[6px] font-semibold text-amber-500 uppercase tracking-wider">Expired Date</p>
                <p class="text-[8px] font-bold text-amber-700">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <div class="flex-1"></div>
            <p class="text-center text-gray-300 text-[6px] font-medium">Property of PNC Cambodia</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[7px] font-medium bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500 transition cursor-pointer">
              <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Front
            </button>
          </div>
        </div>

        <!-- ── BACK: MODERN ── -->
        <div v-if="layout === 'modern'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-emerald-300' : 'border-gray-200 dark:border-gray-600'"
          :style="{ background: '#fff', fontFamily: 'Inter, sans-serif' }"
        >
          <div class="bg-gradient-to-r from-[#0f2847] to-[#2563eb] px-3.5 pt-2.5 pb-3">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-white/15 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-bold text-white leading-tight drop-shadow-sm">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-white/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="flex-1 flex flex-col px-3.5 py-2.5 gap-1.5 bg-white">
            <p class="text-[7px] text-gray-500 leading-relaxed line-clamp-3"><b>Passerelles Numériques Cambodia.</b> Is a french non-profit organization, created in 2005, wihich intends to enable the most under priviliged young people access to higher education and skilled employment in the promising sector of Information Technology.</p>
            <div class="border-t border-gray-100"></div>
            <div class="flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-indigo-500"></span><p class="text-[7px] font-semibold text-gray-400 uppercase tracking-wider">Education Manager</p></div>
            <p class="text-[10px] font-bold text-gray-700 -mt-0.5 ml-2.5">{{ managerName }}</p>
            <div class="border-t border-gray-100"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100/30 rounded px-2.5 py-1.5 border border-blue-100/50">
                <p class="text-[6px] font-semibold text-blue-500 uppercase tracking-wider">Issue Date</p>
                <p class="text-[8px] font-bold text-blue-700">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-gradient-to-br from-amber-50 to-amber-100/30 rounded px-2.5 py-1.5 border border-amber-100/50">
                <p class="text-[6px] font-semibold text-amber-500 uppercase tracking-wider">Expired Date</p>
                <p class="text-[8px] font-bold text-amber-700">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <div class="flex-1"></div>
            <p class="text-center text-gray-300 text-[6px] font-medium">Property of PNC Cambodia</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[7px] font-medium bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-500 transition cursor-pointer">
              <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Front
            </button>
          </div>
        </div>

        <!-- ── BACK: PREMIUM ── -->
        <div v-if="layout === 'premium'"
          class="w-full h-full rounded-xl border select-none flex flex-col overflow-hidden"
          :class="generated ? 'border-amber-300' : 'border-gray-200/60 dark:border-gray-600/60'"
          :style="{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)', fontFamily: 'Inter, sans-serif' }"
        >
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>
          <div class="px-3.5 pt-2.5 pb-2">
            <div class="flex items-center gap-2">
              <div @click="handleLogoClick" class="w-6 h-6 rounded bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group relative">
                <img v-if="schoolLogoUrl && !logoError" :src="schoolLogoUrl" alt="School Logo" class="w-full h-full object-contain p-0.5" @error="logoError = true" />
                <span v-else class="text-[8px] font-extrabold text-white">PNC</span>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-200 flex items-center justify-center">
                  <svg class="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </div>
              </div>
              <div>
                <p class="text-[10px] font-bold text-amber-100/90 leading-tight">Passerelles Numériques Cambodge</p>
                <p class="text-[7px] font-medium text-amber-400/50 leading-tight">Education for a Better Future</p>
              </div>
            </div>
          </div>
          <div class="mx-3.5 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent"></div>
          <div class="flex-1 flex flex-col px-3.5 py-2.5 gap-1.5">
            <p class="text-[7px] text-gray-400 leading-relaxed line-clamp-3"><b>Passerelles Numériques Cambodia.</b> Is a french non-profit organization, created in 2005, wihich intends to enable the most under priviliged young people access to higher education and skilled employment in the promising sector of Information Technology.</p>
            <div class="h-px bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"></div>
            <div class="flex items-center gap-1.5"><span class="w-1 h-1 rounded-full bg-amber-500"></span><p class="text-[7px] font-semibold text-amber-400/60 uppercase tracking-wider">Education Manager</p></div>
            <p class="text-[10px] font-bold text-amber-100/90 -mt-0.5 ml-2.5">{{ managerName }}</p>
            <div class="h-px bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"></div>
            <div class="grid grid-cols-2 gap-2">
              <div class="bg-white/5 rounded px-2.5 py-1.5 border border-amber-400/15">
                <p class="text-[6px] font-semibold text-amber-400/60 uppercase tracking-wider">Issue Date</p>
                <p class="text-[8px] font-bold text-amber-200">{{ computedIssueDate }}</p>
              </div>
              <div class="bg-white/5 rounded px-2.5 py-1.5 border border-amber-400/15">
                <p class="text-[6px] font-semibold text-amber-400/60 uppercase tracking-wider">Expired Date</p>
                <p class="text-[8px] font-bold text-amber-200">{{ computedExpiredDate }}</p>
              </div>
            </div>
            <div class="flex-1"></div>
            <p class="text-center text-amber-400/20 text-[6px] font-medium">Property of PNC Cambodia</p>
            <button @click="toggleFlip" class="self-center inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[7px] font-medium bg-white/5 text-amber-300/50 hover:bg-white/10 hover:text-amber-300 transition cursor-pointer border border-amber-400/15">
              <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2L21 6L17 10"/><path d="M3 12V14C3 17.3 5.7 20 9 20H11"/><path d="M7 2L3 6L7 10"/><path d="M21 12V14C21 17.3 18.3 20 15 20H13"/></svg>Front
            </button>
          </div>
          <div class="h-[3px] bg-gradient-to-r from-amber-500/40 via-amber-400 to-amber-500/40"></div>
        </div>
      </div>
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
