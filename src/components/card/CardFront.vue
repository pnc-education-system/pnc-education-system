<script setup lang="ts">
import { computed } from 'vue'
import type { Student, CardTemplate, CardTheme, CardBackground, ThemeColors } from '@/types/card'
import { themeColors } from '@/types/card'

const props = defineProps<{
  student: Student
  template: CardTemplate
  theme: CardTheme
  background: CardBackground
  showQRCode: boolean
  showAcademicYear: boolean
  showBatch: boolean
  showStatus: boolean
  showFooter: boolean
}>()

const colors = computed<ThemeColors>(() => themeColors[props.theme])

const initials = computed(() => {
  return props.student.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const statusColors = computed(() => {
  const statusMap = {
    Active: 'bg-green-100 text-green-700 border-green-200',
    Pending: 'bg-orange-100 text-orange-700 border-orange-200',
    Inactive: 'bg-red-100 text-red-700 border-red-200',
    Graduated: 'bg-purple-100 text-purple-700 border-purple-200'
  }
  return statusMap[props.student.status] || statusMap.Pending
})
</script>

<template>
  <div 
    class="relative w-[320px] h-[500px] rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
    :style="{ backgroundColor: colors.bg }"
  >
    <!-- CLASSIC TEMPLATE -->
    <div v-if="template === 'classic'" class="h-full flex flex-col">
      <!-- Header -->
      <div 
        class="px-4 py-3 flex items-center gap-3"
        :style="{ backgroundColor: colors.primary }"
      >
        <div class="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20">
          <img v-if="student.logo" :src="student.logo" alt="Logo" class="w-8 h-8 object-contain" />
          <svg v-else class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-white truncate">{{ student.school }}</p>
          <p class="text-[10px] text-white/70">Student ID Card</p>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 p-4 flex flex-col items-center">
        <!-- Avatar -->
        <div class="relative mb-3 mt-8">
          <div 
            class="w-20 h-20 rounded-full overflow-hidden border-4 flex items-center justify-center"
            :style="{ borderColor: colors.secondary }"
          >
            <img v-if="student.avatar" :src="student.avatar" :alt="student.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center" :style="{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }">
              <span class="text-2xl font-bold text-white">{{ initials }}</span>
            </div>
          </div>
          <div 
            v-if="showStatus"
            class="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
            :class="statusColors"
          >
            {{ student.status }}
          </div>
        </div>

        <!-- Name -->
        <h2 class="text-lg font-bold text-center mb-1" :style="{ color: colors.text }">{{ student.name }}</h2>
        
        <!-- Student ID -->
        <p class="text-sm font-semibold mb-3" :style="{ color: colors.secondary }">{{ student.studentId }}</p>

        <!-- Details -->
        <div v-if="showBatch || showAcademicYear" class="flex gap-4 text-xs mb-3">
          <span v-if="showBatch" :style="{ color: colors.text }">
            <strong>Batch:</strong> {{ student.batch }}
          </span>
          <span v-if="showAcademicYear" :style="{ color: colors.text }">
            <strong>Year:</strong> {{ student.year }}
          </span>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode" class="mt-auto mb-3">
          <div class="w-16 h-16 bg-white rounded-lg p-1 border-2" :style="{ borderColor: colors.secondary }">
            <div class="w-full h-full bg-gray-100 rounded flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Scan to verify -->
        <p class="text-[10px] text-gray-400">Scan to verify: {{ student.studentId }}</p>
      </div>

      <!-- Footer -->
      <div v-if="showFooter" 
        class="px-4 py-2 text-center"
        :style="{ backgroundColor: colors.primary }"
      >
        <p class="text-[10px] text-white font-semibold">{{ student.school }}</p>
        <p class="text-[9px] text-white/70">{{ student.year }}</p>
      </div>
    </div>

    <!-- MODERN TEMPLATE -->
    <div v-if="template === 'modern'" class="h-full flex flex-col relative overflow-hidden">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 right-0 w-40 h-40 rounded-full" :style="{ backgroundColor: colors.secondary }"></div>
        <div class="absolute bottom-0 left-0 w-32 h-32 rounded-full" :style="{ backgroundColor: colors.primary }"></div>
      </div>

      <!-- Header with Glassmorphism -->
      <div 
        class="relative px-4 py-4 flex items-center gap-3 backdrop-blur-sm"
        :style="{ background: `linear-gradient(135deg, ${colors.primary}dd, ${colors.secondary}dd)` }"
      >
        <div class="w-12 h-12 rounded-xl flex items-center justify-center bg-white/30 shadow-lg">
          <img v-if="student.logo" :src="student.logo" alt="Logo" class="w-10 h-10 object-contain" />
          <svg v-else class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-base font-bold text-white truncate">{{ student.school }}</p>
          <p class="text-xs text-white/80">Student ID Card</p>
        </div>
      </div>

      <!-- Content -->
      <div class="relative flex-1 p-4 flex flex-col items-center">
        <!-- Large Avatar -->
        <div class="relative mb-4 mt-8">
          <div 
            class="w-24 h-24 rounded-2xl overflow-hidden border-4 shadow-xl flex items-center justify-center"
            :style="{ borderColor: colors.secondary }"
          >
            <img v-if="student.avatar" :src="student.avatar" :alt="student.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center" :style="{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }">
              <span class="text-3xl font-bold text-white">{{ initials }}</span>
            </div>
          </div>
          <div 
            v-if="showStatus"
            class="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold border shadow-lg"
            :class="statusColors"
          >
            {{ student.status }}
          </div>
        </div>

        <!-- Name -->
        <h2 class="text-xl font-bold text-center mb-2" :style="{ color: colors.text }">{{ student.name }}</h2>
        
        <!-- Student ID -->
        <p class="text-base font-semibold mb-4 px-4 py-1 rounded-full" :style="{ color: colors.secondary, backgroundColor: `${colors.secondary}20` }">
          {{ student.studentId }}
        </p>

        <!-- Details Pills -->
        <div class="flex flex-wrap gap-2 justify-center mb-4">
          <span v-if="showBatch" class="px-3 py-1 rounded-full text-xs font-medium bg-white shadow-md" :style="{ color: colors.text }">
            {{ student.batch }}
          </span>
          <span v-if="showAcademicYear" class="px-3 py-1 rounded-full text-xs font-medium bg-white shadow-md" :style="{ color: colors.text }">
            {{ student.year }}
          </span>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode" class="mt-auto mb-3">
          <div class="w-20 h-20 bg-white rounded-2xl p-2 shadow-lg border-2" :style="{ borderColor: colors.secondary }">
            <div class="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Scan to verify -->
        <p class="text-xs text-gray-400">Scan to verify: {{ student.studentId }}</p>
      </div>

      <!-- Footer -->
      <div v-if="showFooter" 
        class="relative px-4 py-3 text-center backdrop-blur-sm"
        :style="{ background: `linear-gradient(135deg, ${colors.primary}dd, ${colors.secondary}dd)` }"
      >
        <p class="text-xs text-white font-semibold">{{ student.school }}</p>
        <p class="text-[10px] text-white/80">{{ student.year }}</p>
      </div>
    </div>

    <!-- PREMIUM TEMPLATE -->
    <div v-if="template === 'premium'" class="h-full flex flex-col relative overflow-hidden">
      <!-- Diagonal Green Accent -->
      <div class="absolute top-0 right-0 w-32 h-full" :style="{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }">
        <div class="absolute top-4 right-4 transform rotate-90 whitespace-nowrap">
          <p class="text-white font-bold text-sm tracking-widest">STUDENT</p>
        </div>
      </div>

      <!-- Header -->
      <div class="px-4 py-3 flex items-center gap-3 relative z-10">
        <div class="w-10 h-10 rounded-lg flex items-center justify-center" :style="{ backgroundColor: colors.primary }">
          <img v-if="student.logo" :src="student.logo" alt="Logo" class="w-8 h-8 object-contain" />
          <svg v-else class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold truncate" :style="{ color: colors.text }">{{ student.school }}</p>
          <p class="text-[10px] text-gray-500">Student ID Card</p>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 p-4 flex flex-col relative z-10">
        <!-- Avatar -->
        <div class="relative mb-3 mt-8">
          <div 
            class="w-20 h-20 rounded-xl overflow-hidden border-3 flex items-center justify-center shadow-lg"
            :style="{ borderColor: colors.primary }"
          >
            <img v-if="student.avatar" :src="student.avatar" :alt="student.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center" :style="{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }">
              <span class="text-2xl font-bold text-white">{{ initials }}</span>
            </div>
          </div>
          <div 
            v-if="showStatus"
            class="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
            :class="statusColors"
          >
            {{ student.status }}
          </div>
        </div>

        <!-- Name -->
        <h2 class="text-lg font-bold mb-1" :style="{ color: colors.text }">{{ student.name }}</h2>
        
        <!-- Student ID -->
        <p class="text-sm font-semibold mb-3" :style="{ color: colors.primary }">{{ student.studentId }}</p>

        <!-- Details Grid -->
        <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div v-if="showBatch" class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[9px] uppercase">Batch</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.batch }}</p>
          </div>
          <div v-if="showAcademicYear" class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[9px] uppercase">Year</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.year }}</p>
          </div>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode" class="mt-auto mb-2">
          <div class="w-16 h-16 bg-white rounded-lg p-1 border-2 shadow" :style="{ borderColor: colors.primary }">
            <div class="w-full h-full bg-gray-100 rounded flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Scan to verify -->
        <p class="text-[10px] text-gray-400">Scan: {{ student.studentId }}</p>
      </div>

      <!-- Footer -->
      <div v-if="showFooter" 
        class="px-4 py-2 text-center relative z-10"
        :style="{ backgroundColor: `${colors.primary}10` }"
      >
        <p class="text-[10px] font-semibold" :style="{ color: colors.primary }">{{ student.school }}</p>
        <p class="text-[9px] text-gray-500">{{ student.year }}</p>
      </div>
    </div>
  </div>
</template>
