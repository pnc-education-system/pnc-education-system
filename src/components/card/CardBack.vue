<script setup lang="ts">
import { computed } from 'vue'
import type { Student, CardTemplate, CardTheme, ThemeColors } from '@/types/card'
import { themeColors } from '@/types/card'

const props = defineProps<{
  student: Student
  template: CardTemplate
  theme: CardTheme
}>()

const colors = computed<ThemeColors>(() => themeColors[props.theme])
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
      <div class="flex-1 p-4 flex flex-col">
        <!-- About Us -->
        <div class="mb-4">
          <h3 class="text-xs font-bold uppercase mb-2" :style="{ color: colors.primary }">About Us</h3>
          <p class="text-xs leading-relaxed" :style="{ color: colors.text }">
            <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
          </p>
        </div>

        <!-- Emergency Contact -->
        <div v-if="student.emergencyContact" class="mb-4 p-2 rounded-lg" :style="{ backgroundColor: `${colors.primary}10` }">
          <p class="text-[10px] font-semibold mb-1" :style="{ color: colors.primary }">Emergency Contact</p>
          <p class="text-xs font-medium" :style="{ color: colors.text }">{{ student.emergencyContact }}</p>
        </div>

        <!-- QR Code -->
        <div class="flex justify-center mb-4">
          <div class="w-24 h-24 bg-white rounded-lg p-2 border-2" :style="{ borderColor: colors.secondary }">
            <div class="w-full h-full bg-gray-100 rounded flex items-center justify-center">
              <svg class="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Card Details -->
        <div class="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[9px] uppercase">Card No</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.studentId.slice(-8) }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[9px] uppercase">Valid Until</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.year }}</p>
          </div>
        </div>

        <!-- Signature -->
        <div class="mt-auto">
          <p class="text-[10px] text-gray-500 mb-1">Student Signature</p>
          <div class="h-10 border-b-2 border-gray-300 flex items-end">
            <p class="text-sm font-script text-gray-700 italic">{{ student.name }}</p>
          </div>
        </div>

        <!-- Website -->
        <div v-if="student.website" class="mt-2 text-center">
          <a :href="student.website" class="text-xs font-semibold" :style="{ color: colors.secondary }">
            {{ student.website }}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div 
        class="px-4 py-2 text-center"
        :style="{ backgroundColor: colors.primary }"
      >
        <p class="text-[10px] text-white font-semibold">{{ student.school }}</p>
        <p class="text-[9px] text-white/70">Authorized Signature</p>
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
      <div class="relative flex-1 p-4 flex flex-col">
        <!-- About Us -->
        <div class="mb-4">
          <h3 class="text-xs font-bold uppercase mb-2 text-white" :style="{ color: colors.primary }">About Us</h3>
          <p class="text-xs leading-relaxed text-gray-600">
            <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
          </p>
        </div>

        <!-- Emergency -->
        <div v-if="student.emergencyContact" class="mb-4 p-3 rounded-xl bg-white shadow-md">
          <p class="text-[10px] font-semibold mb-1" :style="{ color: colors.primary }">Emergency Contact</p>
          <p class="text-xs font-medium text-gray-800">{{ student.emergencyContact }}</p>
        </div>

        <!-- QR Code -->
        <div class="flex justify-center mb-4">
          <div class="w-28 h-28 bg-white rounded-2xl p-3 shadow-lg border-2" :style="{ borderColor: colors.secondary }">
            <div class="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center">
              <svg class="w-18 h-18 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div class="bg-white rounded-xl p-2 shadow-sm">
            <p class="text-gray-500 text-[9px] uppercase">Card No</p>
            <p class="font-semibold text-gray-800">{{ student.studentId.slice(-8) }}</p>
          </div>
          <div class="bg-white rounded-xl p-2 shadow-sm">
            <p class="text-gray-500 text-[9px] uppercase">Valid Until</p>
            <p class="font-semibold text-gray-800">{{ student.year }}</p>
          </div>
        </div>

        <!-- Signature -->
        <div class="mt-auto">
          <p class="text-[10px] text-gray-500 mb-1">Student Signature</p>
          <div class="h-10 border-b-2 border-gray-300 flex items-end">
            <p class="text-sm font-script text-gray-700 italic">{{ student.name }}</p>
          </div>
        </div>

        <!-- Website -->
        <div v-if="student.website" class="mt-2 text-center">
          <a :href="student.website" class="text-xs font-semibold" :style="{ color: colors.secondary }">
            {{ student.website }}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div 
        class="relative px-4 py-3 text-center backdrop-blur-sm"
        :style="{ background: `linear-gradient(135deg, ${colors.primary}dd, ${colors.secondary}dd)` }"
      >
        <p class="text-xs text-white font-semibold">{{ student.school }}</p>
        <p class="text-[10px] text-white/80">Authorized Signature</p>
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
        <!-- About Us -->
        <div class="mb-3">
          <h3 class="text-[10px] font-bold uppercase mb-1" :style="{ color: colors.primary }">About Us</h3>
          <p class="text-[10.5px] leading-relaxed" :style="{ color: colors.text }">
            <strong>Passerelles Numeriques</strong> is a french non-profit organization, created in 2005, which intends to enable the most under pribilged young people access to to higher education and skilled employment in the promising sector of information technology
          </p>
        </div>

        <!-- Emergency -->
        <div v-if="student.emergencyContact" class="mb-3 p-2 rounded-lg" :style="{ backgroundColor: `${colors.primary}10` }">
          <p class="text-[9px] font-semibold mb-0.5" :style="{ color: colors.primary }">Emergency Contact</p>
          <p class="text-[10px] font-medium" :style="{ color: colors.text }">{{ student.emergencyContact }}</p>
        </div>

        <!-- QR Code -->
        <div class="flex justify-center mb-3">
          <div class="w-20 h-20 bg-white rounded-lg p-1 border-2 shadow" :style="{ borderColor: colors.primary }">
            <div class="w-full h-full bg-gray-100 rounded flex items-center justify-center">
              <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="grid grid-cols-2 gap-2 mb-3 text-[10px]">
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[8px] uppercase">Card No</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.studentId.slice(-8) }}</p>
          </div>
          <div class="bg-gray-50 rounded-lg p-2">
            <p class="text-gray-500 text-[8px] uppercase">Valid Until</p>
            <p class="font-semibold" :style="{ color: colors.text }">{{ student.year }}</p>
          </div>
        </div>

        <!-- Signature -->
        <div class="mt-auto">
          <p class="text-[10px] text-gray-500 mb-1">Student Signature</p>
          <div class="h-8 border-b-2 border-gray-300 flex items-end">
            <p class="text-xs font-script text-gray-700 italic">{{ student.name }}</p>
          </div>
        </div>

        <!-- Website -->
        <div v-if="student.website" class="mt-1 text-center">
          <a :href="student.website" class="text-[10px] font-semibold" :style="{ color: colors.secondary }">
            {{ student.website }}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div 
        class="px-4 py-2 text-center relative z-10"
        :style="{ backgroundColor: `${colors.primary}10` }"
      >
        <p class="text-[10px] font-semibold" :style="{ color: colors.primary }">{{ student.school }}</p>
        <p class="text-[9px] text-gray-500">Authorized Signature</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');

.font-script {
  font-family: 'Dancing Script', cursive;
}
</style>
