<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { CardStudent } from '@/services/api/cards'
import QRCode from 'qrcode'

const props = withDefaults(
  defineProps<{
    student: CardStudent | null
    size?: 'sm' | 'md' | 'lg'
    showActions?: boolean
    generated?: boolean
    layout?: 'classic' | 'modern' | 'premium'
  }>(),
  {
    size: 'md',
    showActions: false,
    generated: false,
    layout: 'classic',
  },
)

const emit = defineEmits<{
  generate: [studentId: number]
  preview: [studentId: number]
  reprint: [studentId: number]
  download: [studentId: number]
  'photo-upload': [studentId: number, file: File]
}>()

const qrDataUrl = ref<string>('')
const photoError = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const localPhotoUrl = ref<string | null>(null)

const sizePx = computed(() => {
  switch (props.size) {
    case 'sm': return { width: 220, height: 350 }
    case 'lg': return { width: 360, height: 560 }
    case 'md':
    default: return { width: 280, height: 440 }
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

async function generateQR() {
  if (!qrContent.value) return
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrContent.value, {
      width: 120, margin: 1,
      color: { dark: '#1e293b', light: '#ffffff' },
    })
  } catch { /* silent */ }
}

function handlePhotoClick() {
  photoInput.value?.click()
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !props.student) return

  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
  localPhotoUrl.value = URL.createObjectURL(file)
  photoError.value = false
  emit('photo-upload', props.student.id, file)
}

onMounted(() => { generateQR() })

onUnmounted(() => {
  if (localPhotoUrl.value) URL.revokeObjectURL(localPhotoUrl.value)
})

watch(() => props.student, () => {
  photoError.value = false
  if (localPhotoUrl.value) {
    URL.revokeObjectURL(localPhotoUrl.value)
    localPhotoUrl.value = null
  }
  generateQR()
})
</script>

<template>
  <!-- Hidden file input for photo upload -->
  <input
    ref="photoInput"
    type="file"
    accept="image/jpeg,image/png,image/webp"
    class="hidden"
    @change="handlePhotoChange"
  />

  <!-- ===== LAYOUT A: CLASSIC ===== -->
  <div
    v-if="layout === 'classic'"
    class="student-card relative overflow-hidden rounded-2xl border-2 select-none flex flex-col"
    :class="[
      generated
        ? 'border-emerald-400 shadow-lg shadow-emerald-500/20'
        : 'border-gray-200 dark:border-gray-700 shadow-md',
      size === 'sm' ? 'p-3' : size === 'lg' ? 'p-5' : 'p-4',
    ]"
    :style="{
      width: sizePx.width + 'px',
      minHeight: sizePx.height + 'px',
      background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }"
  >
    <!-- Generated badge -->
    <div v-if="generated" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 shadow-sm">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      Generated
    </div>

    <!-- PNC Logo Header -->
    <div class="flex items-center gap-2.5 mb-3">
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] flex items-center justify-center flex-shrink-0 shadow-sm ring-1 ring-white/10">
        <span class="text-[10px] font-extrabold text-white tracking-wider">PNC</span>
      </div>
      <div>
        <p class="text-[11px] font-extrabold text-gray-900 leading-tight tracking-tight">Passerelles&nbsp;Numériques</p>
        <p class="text-[8px] font-semibold text-gray-400 leading-tight tracking-wide uppercase">Cambodia</p>
      </div>
    </div>

    <div class="border-t border-gray-100 mb-3"></div>

    <!-- Clickable Photo -->
    <div
      @click="handlePhotoClick"
      class="mx-auto rounded-xl overflow-hidden mb-3 border-2 border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0 cursor-pointer group relative transition-all duration-200 hover:border-blue-300 hover:shadow-md"
      :style="{
        width: size === 'sm' ? '70px' : size === 'lg' ? '110px' : '90px',
        height: size === 'sm' ? '70px' : size === 'lg' ? '110px' : '90px',
      }"
    >
      <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name || 'Student'" class="w-full h-full object-cover" @error="photoError = true" />
      <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
        <span class="font-extrabold text-white tracking-tight" :class="size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'">{{ studentInitials }}</span>
      </div>
      <!-- Upload overlay -->
      <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
        <svg class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
        </svg>
      </div>
    </div>

    <!-- Student Info - improved typography -->
    <div class="text-center space-y-1.5 mb-auto px-1">
      <p class="font-bold text-gray-900 leading-snug tracking-tight" :class="size === 'sm' ? 'text-[12px]' : size === 'lg' ? 'text-[17px]' : 'text-[14px]'">
        {{ student?.full_name || 'Student Name' }}
      </p>
      <p class="font-mono font-semibold text-blue-600 tracking-wider" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-[14px]' : 'text-[12px]'">
        {{ student?.student_id_no || 'ST-0000' }}
      </p>
      <p class="text-gray-400 font-medium tracking-wide" :class="size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-[12px]' : 'text-[10px]'">
        {{ student?.selection_batch_name || '—' }}
        <span v-if="student?.intake_year" class="text-gray-300"> · {{ student.intake_year }}</span>
      </p>
    </div>

    <!-- QR -->
    <div class="flex justify-center mt-auto">
      <div class="bg-white rounded-lg p-1 border border-gray-100 shadow-sm" :style="{ width: size === 'sm' ? '50px' : size === 'lg' ? '70px' : '60px', height: size === 'sm' ? '50px' : size === 'lg' ? '70px' : '60px' }">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
        <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
          <svg class="w-4 h-4 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
        </div>
      </div>
    </div>

    <p class="text-center text-gray-300 font-semibold mt-2 tracking-wide" :class="size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[9px]' : 'text-[8px]'">
      Property of PNC · Valid {{ student?.intake_year || '—' }}
    </p>

    <!-- Action buttons -->
    <div v-if="showActions && student" class="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100">
      <button @click="emit('preview', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Preview</button>
      <button @click="emit('generate', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generate</button>
      <button @click="emit('reprint', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>Reprint</button>
      <button @click="emit('download', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>Download</button>
    </div>
  </div>

  <!-- ===== LAYOUT B: MODERN ===== -->
  <div
    v-if="layout === 'modern'"
    class="student-card relative overflow-hidden rounded-2xl border-2 select-none flex flex-col"
    :class="[generated ? 'border-emerald-400 shadow-lg shadow-emerald-500/20' : 'border-gray-200 dark:border-gray-700 shadow-md', 'p-0']"
    :style="{ width: sizePx.width + 'px', minHeight: sizePx.height + 'px', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }"
  >
    <!-- Gradient header -->
    <div class="relative bg-gradient-to-br from-[#0f2847] via-[#1a3f6a] to-[#2d5a8e] px-4 pt-4 pb-14">
      <div v-if="generated" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white backdrop-blur-sm shadow-sm">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Generated
      </div>

      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/30">
          <span class="text-[9px] font-extrabold text-white tracking-wider">PNC</span>
        </div>
        <div>
          <p class="text-[10px] font-extrabold text-white/95 leading-tight tracking-tight drop-shadow-sm">Passerelles Numériques</p>
          <p class="text-[7px] font-semibold text-white/50 leading-tight tracking-widest uppercase">Cambodia</p>
        </div>
      </div>

      <!-- Clickable Photo -->
      <div
        @click="handlePhotoClick"
        class="absolute -bottom-[45px] left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white shadow-lg bg-gray-100 flex items-center justify-center cursor-pointer group transition-all duration-200 hover:border-blue-200 hover:shadow-xl"
        :style="{ width: size === 'sm' ? '60px' : size === 'lg' ? '100px' : '80px', height: size === 'sm' ? '60px' : size === 'lg' ? '100px' : '80px' }"
      >
        <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name || 'Student'" class="w-full h-full object-cover" @error="photoError = true" />
        <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-300 to-blue-500">
          <span class="font-extrabold text-white drop-shadow-sm" :class="size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'">{{ studentInitials }}</span>
        </div>
        <!-- Upload overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center rounded-full">
          <svg class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Content area -->
    <div class="flex-1 flex flex-col px-4 pt-[52px] pb-4 bg-white">
      <!-- Name & ID -->
      <div class="text-center mb-2.5">
        <p class="font-bold text-gray-900 leading-snug tracking-tight" :class="size === 'sm' ? 'text-[12px]' : size === 'lg' ? 'text-[17px]' : 'text-[14px]'">
          {{ student?.full_name || 'Student Name' }}
        </p>
        <p class="font-mono font-semibold text-blue-600 tracking-wider mt-0.5" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-[14px]' : 'text-[12px]'">
          {{ student?.student_id_no || 'ST-0000' }}
        </p>
      </div>

      <!-- Info pills -->
      <div class="flex flex-wrap justify-center gap-1.5 mb-3">
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-semibold bg-blue-50 text-blue-700 tracking-wide shadow-sm">{{ student?.selection_batch_name || '—' }}</span>
        <span v-if="student?.intake_year" class="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-semibold bg-indigo-50 text-indigo-700 tracking-wide shadow-sm">{{ student.intake_year }}</span>
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-semibold bg-gray-100 text-gray-600 tracking-wide">{{ student?.gender || '—' }}</span>
      </div>

      <div class="border-t border-gray-50 mb-2"></div>

      <!-- QR row -->
      <div class="flex items-center justify-between px-1">
        <div class="flex-1">
          <p class="text-[9px] text-gray-400 font-semibold tracking-wide">Scan to verify</p>
          <p class="text-[7px] text-gray-300 font-mono mt-0.5">{{ student?.student_id_no || '' }}</p>
        </div>
        <div class="bg-white rounded-lg p-1 border border-gray-100 shadow-sm flex-shrink-0" :style="{ width: size === 'sm' ? '44px' : size === 'lg' ? '64px' : '54px', height: size === 'sm' ? '44px' : size === 'lg' ? '64px' : '54px' }">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-50 rounded">
            <svg class="w-3 h-3 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          </div>
        </div>
      </div>

      <p class="text-center text-gray-300 font-semibold mt-2 tracking-wide" :class="size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-[9px]' : 'text-[8px]'">
        PNC Education · {{ student?.intake_year || '—' }}
      </p>
    </div>

    <!-- Action buttons -->
    <div v-if="showActions && student" class="flex items-center justify-center gap-2 px-4 pb-4 bg-white border-t border-gray-100 pt-3">
      <button @click="emit('preview', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Preview</button>
      <button @click="emit('generate', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generate</button>
      <button @click="emit('reprint', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>Reprint</button>
      <button @click="emit('download', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all duration-200 cursor-pointer"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>Download</button>
    </div>
  </div>

  <!-- ===== LAYOUT C: PREMIUM ===== -->
  <div
    v-if="layout === 'premium'"
    class="student-card relative overflow-hidden rounded-2xl border-2 select-none flex flex-col"
    :class="[generated ? 'border-amber-400 shadow-lg shadow-amber-500/20' : 'border-amber-200/60 dark:border-amber-800/40 shadow-md', 'p-0']"
    :style="{
      width: sizePx.width + 'px',
      minHeight: sizePx.height + 'px',
      background: 'linear-gradient(180deg, #0c0f1e 0%, #1a1040 50%, #0c0f1e 100%)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    }"
  >
    <!-- Generated badge -->
    <div v-if="generated" class="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/20 text-amber-300 backdrop-blur-sm border border-amber-400/30 shadow-sm">
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      Generated
    </div>

    <!-- Gold decorative top bar -->
    <div class="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

    <!-- PNC Logo + Gold accent -->
    <div class="px-4 pt-4 pb-2 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
          <span class="text-[10px] font-extrabold text-white tracking-wider">PNC</span>
        </div>
        <div>
          <p class="text-[11px] font-extrabold text-amber-100/90 leading-tight tracking-tight">Passerelles&nbsp;Numériques</p>
          <p class="text-[7px] font-semibold text-amber-400/60 leading-tight tracking-widest uppercase">Cambodia</p>
        </div>
      </div>
      <div class="h-6 w-px bg-gradient-to-b from-amber-400/40 to-transparent"></div>
      <div class="text-right">
        <p class="text-[8px] font-bold text-amber-400/70 tracking-widest uppercase">Student ID</p>
      </div>
    </div>

    <!-- Gold divider -->
    <div class="mx-4 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mb-4"></div>

    <!-- Photo with decorative frame -->
    <div class="flex justify-center mb-3">
      <div class="relative p-[2px] rounded-full bg-gradient-to-br from-amber-400 via-amber-300 to-amber-500 shadow-lg shadow-amber-500/20">
        <div
          @click="handlePhotoClick"
          class="rounded-full overflow-hidden bg-gray-900 flex items-center justify-center cursor-pointer group relative"
          :style="{
            width: size === 'sm' ? '64px' : size === 'lg' ? '104px' : '84px',
            height: size === 'sm' ? '64px' : size === 'lg' ? '104px' : '84px',
          }"
        >
          <img v-if="photoUrl && !photoError" :src="photoUrl" :alt="student?.full_name || 'Student'" class="w-full h-full object-cover" @error="photoError = true" />
          <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-800">
            <span class="font-extrabold text-white drop-shadow-sm" :class="size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'">{{ studentInitials }}</span>
          </div>
          <!-- Upload overlay -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center rounded-full">
            <svg class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Student Info -->
    <div class="text-center space-y-1 px-4 mb-auto">
      <p class="font-bold text-white leading-snug tracking-tight drop-shadow-sm" :class="size === 'sm' ? 'text-[13px]' : size === 'lg' ? 'text-[18px]' : 'text-[15px]'">
        {{ student?.full_name || 'Student Name' }}
      </p>
      <p class="font-mono font-semibold text-amber-400 tracking-wider" :class="size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-[14px]' : 'text-[12px]'">
        {{ student?.student_id_no || 'ST-0000' }}
      </p>
      <div class="flex items-center justify-center gap-2 mt-1">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">{{ student?.selection_batch_name || '—' }}</span>
        <span v-if="student?.intake_year" class="inline-flex items-center px-2 py-0.5 rounded text-[8px] font-semibold bg-white/5 text-gray-300 border border-white/10">{{ student.intake_year }}</span>
      </div>
    </div>

    <!-- Gold divider -->
    <div class="mx-4 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent my-2"></div>

    <!-- QR + validity -->
    <div class="flex items-center justify-between px-4 pb-4">
      <div>
        <p class="text-[8px] text-amber-400/60 font-semibold tracking-wide">Scan to verify</p>
        <p class="text-[7px] text-gray-500 font-mono mt-0.5">{{ student?.student_id_no || '' }}</p>
      </div>
      <div class="bg-gray-900 rounded-lg p-1 border border-amber-400/20 shadow-sm" :style="{ width: size === 'sm' ? '44px' : size === 'lg' ? '64px' : '54px', height: size === 'sm' ? '44px' : size === 'lg' ? '64px' : '54px' }">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-full h-full object-contain" />
        <div v-else class="w-full h-full flex items-center justify-center">
          <svg class="w-3 h-3 text-gray-600 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
        </div>
      </div>
    </div>

    <!-- Bottom gold bar -->
    <div class="h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"></div>

    <p class="text-center text-amber-400/30 font-semibold py-1.5 tracking-wide text-[7px]">
      PNC Education · {{ student?.intake_year || '—' }} · Premium
    </p>

    <!-- Action buttons -->
    <div v-if="showActions && student" class="flex items-center justify-center gap-2 px-4 pb-4 pt-2">
      <button @click="emit('preview', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-200 cursor-pointer border border-blue-500/20"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>Preview</button>
      <button @click="emit('generate', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all duration-200 cursor-pointer border border-emerald-500/20"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>Generate</button>
      <button @click="emit('reprint', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-all duration-200 cursor-pointer border border-amber-500/20"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>Reprint</button>
      <button @click="emit('download', student.id)" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer border border-white/10"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>Download</button>
    </div>
  </div>
</template>

<style scoped>
.student-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.student-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.04);
}
</style>
