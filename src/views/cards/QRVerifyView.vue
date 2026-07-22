<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, ScanLine, CheckCircle, ExternalLink, Copy, Info } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { showSuccessToast, showErrorToast } = useToast()

const studentIdInput = ref('')
const verifyResult = ref<{
  name: string
  studentId: string
  status: string
  batch: string
  year: string
  timestamp: string
} | null>(null)
const searching = ref(false)

// Mock recent verifications
const recentVerifications = ref([
  { name: 'Sok Chan', studentId: 'STU-2025-0123', status: 'verified', date: '2026-07-19', time: '14:32' },
  { name: 'Chea Rithy', studentId: 'STU-2025-0089', status: 'verified', date: '2026-07-19', time: '11:15' },
  { name: 'Srey Neang', studentId: 'STU-2024-0456', status: 'failed', date: '2026-07-18', time: '09:47' },
  { name: 'Vannak Phirum', studentId: 'STU-2025-0234', status: 'verified', date: '2026-07-18', time: '08:02' },
])

const baseUrl = computed(() => window.location.origin)

const generatedVerifyLink = computed(() => {
  if (!studentIdInput.value.trim()) return ''
  return `${baseUrl.value}/verify/${studentIdInput.value.trim()}`
})

async function handleVerify() {
  const id = studentIdInput.value.trim()
  if (!id) {
    showErrorToast('Please enter a Student ID.', 'Input Required')
    return
  }

  searching.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 800))

  // Mock result
  verifyResult.value = {
    name: 'Sok Chan',
    studentId: id,
    status: 'enrolled',
    batch: '2025 Intake Batch 1',
    year: '2025',
    timestamp: new Date().toISOString(),
  }
  searching.value = false
  showSuccessToast('Student identity verified successfully.', 'Verified')
}

function copyLink() {
  if (generatedVerifyLink.value) {
    navigator.clipboard.writeText(generatedVerifyLink.value)
    showSuccessToast('Verification link copied to clipboard.', 'Copied')
  }
}

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    enrolled: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Enrolled' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
    graduated: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'Graduated' },
    rejected: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Rejected' },
  }
  return styles[status] || { bg: 'bg-gray-50 dark:bg-gray-700/30', text: 'text-gray-600 dark:text-gray-400', label: status }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">QR Verify</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Verify student identities through QR codes and generate verification links.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Panel: QR Input & Generator -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Verify by Student ID -->
        <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <ScanLine :size="18" class="text-blue-500" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Verify Student Identity</h2>
            </div>
          </div>
          <div class="p-5 space-y-4">
            <!-- Input + Button -->
            <div class="flex gap-3">
              <div class="relative flex-1">
                <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  v-model="studentIdInput"
                  type="text"
                  placeholder="Enter Student ID (e.g., STU-2025-0123)"
                  class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  @keyup.enter="handleVerify"
                />
              </div>
              <button
                @click="handleVerify"
                :disabled="searching"
                class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <CheckCircle :size="16" />
                {{ searching ? 'Verifying...' : 'Verify' }}
              </button>
            </div>

            <!-- Verification Result -->
            <transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="verifyResult" class="border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl p-4 space-y-3">
                <div class="flex items-center gap-2">
                  <CheckCircle :size="18" class="text-emerald-500" />
                  <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Student Found</span>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Full Name</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.name }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Student ID</p>
                    <p class="text-sm font-mono font-semibold text-gray-900 dark:text-white">{{ verifyResult.studentId }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Batch</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.batch }}</p>
                  </div>
                  <div>
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Status</p>
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mt-0.5"
                      :class="getStatusStyle(verifyResult.status).bg + ' ' + getStatusStyle(verifyResult.status).text"
                    >
                      {{ getStatusStyle(verifyResult.status).label }}
                    </span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <!-- Generate Verification Link -->
        <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <ExternalLink :size="18" class="text-purple-500" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Generate Verification Link</h2>
            </div>
          </div>
          <div class="p-5 space-y-4">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Enter a Student ID to generate a shareable verification link. Students can scan the QR code on their card to verify their identity.
            </p>
            <div v-if="generatedVerifyLink" class="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <code class="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">{{ generatedVerifyLink }}</code>
              <button
                @click="copyLink"
                class="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Copy link"
              >
                <Copy :size="14" />
              </button>
            </div>
            <p v-else class="text-xs text-gray-400 italic">Enter a Student ID above to generate a link.</p>
          </div>
        </div>
      </div>

      <!-- Right Panel: Recent Verifications -->
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-2">
              <Info :size="16" class="text-gray-400" />
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Recent Verifications</h2>
            </div>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="item in recentVerifications"
              :key="item.studentId"
              class="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="item.status === 'verified' ? 'bg-emerald-500' : 'bg-red-500'"
                ></div>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                  <p class="text-[11px] font-mono text-gray-400">{{ item.studentId }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-[11px] font-medium text-gray-400">{{ item.date }}</p>
                <p class="text-[10px] text-gray-300 dark:text-gray-500">{{ item.time }}</p>
              </div>
            </div>
          </div>
          <div v-if="recentVerifications.length === 0" class="px-5 py-8 text-center">
            <p class="text-xs text-gray-400">No recent verifications.</p>
          </div>
        </div>

        <!-- Info Card -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/5 dark:to-indigo-500/5 rounded-xl border border-blue-200 dark:border-blue-500/20 p-4">
          <h3 class="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">How QR Verify Works</h3>
          <ol class="space-y-2 text-xs text-blue-600/80 dark:text-blue-300/70">
            <li class="flex items-start gap-1.5">
              <span class="font-bold">1.</span>
              <span>Each student ID card has a unique QR code printed on it.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <span class="font-bold">2.</span>
              <span>Scan the QR code with any smartphone camera to open the verification page.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <span class="font-bold">3.</span>
              <span>The page displays the student's identity details for visual verification.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <span class="font-bold">4.</span>
              <span>You can also generate a verification link here to test or share manually.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
