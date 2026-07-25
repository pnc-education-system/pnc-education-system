<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, ScanLine, CheckCircle, ExternalLink, Copy, Info, User } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { cardsApi, type CardStudent } from '@/services/api/cards'

const { t } = useI18n()

const router = useRouter()
const { showSuccessToast, showErrorToast } = useToast()

const studentIdInput = ref('')
const qrTokenInput = ref('')
interface VerifyResultData {
  valid: boolean
  student: CardStudent | null
  message?: string
}

const verifyResult = ref<VerifyResultData | null>(null)
const searching = ref(false)

// Recent verifications loaded from session storage
const recentVerifications = ref<Array<{
  name: string
  studentId: string
  status: string
  date: string
  time: string
}>>(loadRecentVerifications())

// Pagination for recent verifications
const currentPage = ref(1)
const itemsPerPage = 5

const totalPages = computed(() => Math.ceil(recentVerifications.value.length / itemsPerPage))

const paginatedVerifications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return recentVerifications.value.slice(start, end)
})

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function loadRecentVerifications() {
  try {
    const stored = sessionStorage.getItem('recentVerifications')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentVerification(item: { name: string; studentId: string; status: string }) {
  const entry = {
    ...item,
    date: new Date().toLocaleDateString('en-CA'),
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
  recentVerifications.value = [entry, ...recentVerifications.value].slice(0, 20)
  try {
    sessionStorage.setItem('recentVerifications', JSON.stringify(recentVerifications.value))
  } catch {
    // ignore storage errors
  }
}

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
  verifyResult.value = null

  try {
    // Try numeric ID first, then fall back to student_id_no
    let student
    const numericId = Number(id)
    if (!isNaN(numericId)) {
      student = await cardsApi.verifyById(numericId)
    } else {
      student = await cardsApi.getByStudentIdNo(id)
    }

    verifyResult.value = {
      valid: true,
      student: student,
    }

    saveRecentVerification({
      name: student.full_name,
      studentId: student.student_id_no,
      status: 'verified',
    })

    showSuccessToast(t('qr_verify.verified_success'), t('qr_verify.verified'))
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: { message?: string } } }

    // Show friendly message instead of error toast
    verifyResult.value = {
      valid: false,
      student: null,
      message: t('qr_verify.student_not_found'),
    }

    saveRecentVerification({
      name: id,
      studentId: id,
      status: 'failed',
    })
  } finally {
    searching.value = false
  }
}

function copyLink() {
  if (generatedVerifyLink.value) {
    navigator.clipboard.writeText(generatedVerifyLink.value)
    showSuccessToast('Verification link copied to clipboard.', 'Copied')
  }
}

function viewProfile(studentId: number) {
  router.push(`/students/${studentId}/profile`)
}

function getStatusStyle(status: string) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    enrolled: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Enrolled' },
    pending: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Pending' },
    graduated: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', label: 'Graduated' },
    rejected: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Rejected' },
    dropped: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Dropped' },
  }
  return styles[status.toLowerCase()] || { bg: 'bg-gray-50 dark:bg-gray-700/30', text: 'text-gray-600 dark:text-gray-400', label: status }
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
                  placeholder="Enter Student ID (e.g., PNC2027-020)"
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
              <div v-if="verifyResult">
                <!-- Error/Not Found Message -->
                <div v-if="verifyResult.valid === false" class="border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 rounded-xl p-4">
                  <div class="flex items-center gap-2">
                    <CheckCircle :size="18" class="text-gray-400" />
                    <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">{{ t('qr_verify.verification_failed') }}</span>
                  </div>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">{{ verifyResult.message }}</p>
                </div>

                <!-- Success Result -->
                <div v-if="verifyResult.valid && verifyResult.student" class="border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl overflow-hidden">
                <!-- Verified header -->
                <div class="flex items-center gap-2 px-4 pt-4 pb-2">
                  <CheckCircle :size="18" class="text-emerald-500" />
                  <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{{ t('qr_verify.student_found') }}</span>
                </div>

                <!-- Student details grid -->
                <div class="p-4 pt-2 space-y-3">
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.full_name') }}</p>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.full_name }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.student_id') }}</p>
                      <p class="text-sm font-mono font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.student_id_no }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.gender') }}</p>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.gender || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.batch') }}</p>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.selection_batch_name || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.intake_year') }}</p>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.intake_year || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.province') }}</p>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.province || '—' }}</p>
                    </div>
                  </div>

                  <!-- Status badge -->
                  <div class="flex items-center justify-between pt-2 border-t border-emerald-100 dark:border-emerald-500/10">
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.status') }}</p>
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      :class="getStatusStyle(verifyResult.student.enrollment_status).bg + ' ' + getStatusStyle(verifyResult.student.enrollment_status).text"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="{
                        'bg-emerald-500': verifyResult.student.enrollment_status?.toLowerCase() === 'enrolled',
                        'bg-amber-500': verifyResult.student.enrollment_status?.toLowerCase() === 'pending',
                        'bg-purple-500': verifyResult.student.enrollment_status?.toLowerCase() === 'graduated',
                        'bg-red-500': ['rejected','dropped'].includes(verifyResult.student.enrollment_status?.toLowerCase() || ''),
                      }"></span>
                      {{ getStatusStyle(verifyResult.student.enrollment_status).label }}
                    </span>
                  </div>

                  <!-- Contact info (if available) -->
                  <div v-if="verifyResult.student.phone || verifyResult.student.email || verifyResult.student.high_school" class="pt-2 border-t border-emerald-100 dark:border-emerald-500/10 space-y-2">
                    <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{{ t('qr_verify.contact_info') }}</p>
                    <div class="grid grid-cols-2 gap-2">
                      <div v-if="verifyResult.student.phone">
                        <p class="text-[10px] font-medium text-gray-400">{{ t('qr_verify.phone') }}</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.phone }}</p>
                      </div>
                      <div v-if="verifyResult.student.email">
                        <p class="text-[10px] font-medium text-gray-400">{{ t('qr_verify.email') }}</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.email }}</p>
                      </div>
                      <div v-if="verifyResult.student.high_school" class="col-span-2">
                        <p class="text-[10px] font-medium text-gray-400">{{ t('qr_verify.high_school') }}</p>
                        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ verifyResult.student.high_school }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- DOB (if available) -->
                  <div v-if="verifyResult.student.dob" class="pt-2 border-t border-emerald-100 dark:border-emerald-500/10">
                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{{ t('qr_verify.dob') }}</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ new Date(verifyResult.student.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
                  </div>

                  <!-- View Profile Button -->
                  <div class="pt-3 border-t border-emerald-100 dark:border-emerald-500/10">
                    <button
                      @click="viewProfile(verifyResult.student!.id)"
                      class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <User :size="16" />
                      View Full Profile
                    </button>
                  </div>
                </div>

                <div v-if="verifyResult.message" class="px-4 pb-3">
                  <p class="text-xs text-red-600 dark:text-red-400">{{ verifyResult.message }}</p>
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
              v-for="item in paginatedVerifications"
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

          <!-- Pagination Controls -->
          <div v-if="totalPages > 1" class="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
            <button
              @click="prevPage"
              :disabled="currentPage === 1"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div class="flex items-center gap-1">
              <button
                v-for="page in totalPages"
                :key="page"
                @click="goToPage(page)"
                class="w-8 h-8 text-xs font-medium rounded-lg transition-colors"
                :class="currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'"
              >
                {{ page }}
              </button>
            </div>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              class="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
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
