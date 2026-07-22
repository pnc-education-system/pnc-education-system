<script setup lang="ts">
import { ref, computed } from 'vue'
import IDCard from '@/components/card/IDCard.vue'
import TemplateSelector from '@/components/card/TemplateSelector.vue'
import ThemeSelector from '@/components/card/ThemeSelector.vue'
import UploadPhoto from '@/components/card/UploadPhoto.vue'
import UploadLogo from '@/components/card/UploadLogo.vue'
import ActionButtons from '@/components/card/ActionButtons.vue'
import StudentInfo from '@/components/card/StudentInfo.vue'
import type { Student, CardTemplate, CardTheme, CardBackground, CardSettings } from '@/types/card'
import defaultSchoolLogo from '@/assets/images/PN_logo_clear.png'

// Sample student data
const student = ref<Student>({
  id: "PNC2027-050",
  name: "James Davis",
  avatar: "",
  studentId: "PNC2027-050",
  batch: "Batch 2027",
  year: "2025",
  status: "Pending",
  school: "Passerelles Numériques Cambodia",
  logo: defaultSchoolLogo,
  emergencyContact: "+855 12 345 678",
  website: "https://pnc.edu.kh",
  address: "Phnom Penh, Cambodia"
})

// Card settings
const settings = ref<CardSettings>({
  template: 'classic',
  theme: 'blue',
  background: 'white',
  showQRCode: true,
  showAcademicYear: true,
  showBatch: true,
  showStatus: true,
  showFooter: true
})

const cardRef = ref<HTMLElement | null>(null)

// Dark mode
const isDarkMode = ref(false)

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Event handlers
const handleFlip = () => {
  // Flip is handled by the IDCard component
}

const handleDetails = () => {
  console.log('Show details for student:', student.value.name)
}

const handleGenerate = () => {
  console.log('Generate card for student:', student.value.name)
}

const handleDownloadPdf = async () => {
  try {
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default
    
    const element = cardRef.value
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const imgWidth = 85.6 // PVC card width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight)
    pdf.save(`ID_Card_${student.value.studentId}.pdf`)
  } catch (error) {
    console.error('PDF generation failed:', error)
  }
}

const handleDownloadPng = async () => {
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const element = cardRef.value
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    })

    const link = document.createElement('a')
    link.download = `ID_Card_${student.value.studentId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    console.error('PNG generation failed:', error)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Page Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">Card Designer</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Design and customize student ID cards</p>
        </div>
        <button
          @click="toggleDarkMode"
          class="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <svg v-if="!isDarkMode" class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
          </svg>
          <svg v-else class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
        </button>
      </div>

      <!-- Main Content -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <!-- Left Panel - Card Preview -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 lg:p-8">
          <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            Live Preview
          </h2>
          
          <div ref="cardRef" class="flex justify-center items-center min-h-[540px]">
            <IDCard
              :student="student"
              :template="settings.template"
              :theme="settings.theme"
              :background="settings.background"
              :showQRCode="settings.showQRCode"
              :showAcademicYear="settings.showAcademicYear"
              :showBatch="settings.showBatch"
              :showStatus="settings.showStatus"
              :showFooter="settings.showFooter"
            />
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 pt-6 border-t border-gray-200">
            <ActionButtons
              @flip="handleFlip"
              @details="handleDetails"
              @generate="handleGenerate"
              @download-pdf="handleDownloadPdf"
              @download-png="handleDownloadPng"
            />
          </div>
        </div>

        <!-- Right Panel - Card Designer Settings -->
        <div class="space-y-6">
          <!-- Template Selector -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <TemplateSelector v-model="settings.template" />
          </div>

          <!-- Theme Selector -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <ThemeSelector v-model="settings.theme" />
          </div>

          <!-- Upload Photo -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <UploadPhoto v-model="student.avatar" />
          </div>

          <!-- Upload Logo -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <UploadLogo v-model="student.logo" />
          </div>

          <!-- Student Information -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <StudentInfo :student="student" :editable="true" @update:student="student = $event" />
          </div>

          <!-- Show/Hide Fields -->
          <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h3 class="text-sm font-bold text-gray-800 dark:text-white mb-3">Show / Hide Fields</h3>
            <div class="space-y-2">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="settings.showQRCode"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">QR Code</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="settings.showAcademicYear"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Academic Year</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="settings.showBatch"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Batch</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="settings.showStatus"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Status</span>
              </label>
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  v-model="settings.showFooter"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">Footer</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Print-friendly styles */
@media print {
  body {
    background: white;
  }
  
  :deep(.bg-gray-50) {
    background: white;
  }
  
  :deep(.shadow-xl) {
    box-shadow: none;
  }
}
</style>
