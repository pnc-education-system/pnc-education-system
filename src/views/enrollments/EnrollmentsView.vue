<script setup lang="ts">
defineOptions({ name: 'EnrollmentsPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEnrollmentsStore } from '@/stores/enrollments'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { EnrollmentStatus } from '@/types'

import {
  Plus,
  Search,
  SlidersHorizontal,
  GraduationCap,
  UserCheck,
  XCircle,
  Clock,
  FileText,
  Edit,
  Trash2,
  CheckCircle2,
  Ban,
  UserPlus,
} from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n()
const store = useEnrollmentsStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

onMounted(() => {
  store.fetchAll()
})

// ── Filters ──
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const programFilter = ref<string>('')
const batchFilter = ref<string>('')
const deleteConfirmId = ref<string | null>(null)
const statusChangeId = ref<string | null>(null)
const statusChangeTarget = ref<EnrollmentStatus>('pending')
const showFilters = ref(false)

const canManage = computed(() => authStore.hasPermission('enrollment.manage'))

const filteredEnrollments = computed(() => {
  return store.enrollments.filter(enrollment => {
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q ||
      enrollment.studentName.toLowerCase().includes(q) ||
      enrollment.studentId.toLowerCase().includes(q) ||
      enrollment.program.toLowerCase().includes(q)

    const matchesStatus = statusFilter.value === 'all' || enrollment.status === statusFilter.value
    const matchesProgram = !programFilter.value || enrollment.program === programFilter.value
    const matchesBatch = !batchFilter.value || enrollment.batch === batchFilter.value

    return matchesSearch && matchesStatus && matchesProgram && matchesBatch
  })
})

// ── Status Styling ──
const statusStyles: Record<EnrollmentStatus, { bg: string; text: string; dot: string; icon: string }> = {
  pending:   { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316', icon: 'clock' },
  approved:  { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E', icon: 'check' },
  rejected:  { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', icon: 'x' },
  enrolled:  { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6', icon: 'graduation' },
}

// ── Unique Programs ──
const programs = computed(() => {
  const set = new Set(store.enrollments.map(e => e.program))
  return Array.from(set).sort()
})

// ── Statistics ──
const statsCards = computed(() => [
  { label: t('enrollment_management.total_applications'), value: store.totalEnrollments, color: 'text-gray-900', icon: FileText, bg: 'bg-gray-50 dark:bg-white/[0.04]' },
  { label: t('enrollment_management.pending_review'), value: store.pendingCount, color: 'text-orange-600', icon: Clock, bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { label: t('approved'), value: store.approvedCount, color: 'text-emerald-600', icon: UserCheck, bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: t('dashboard.enrolled'), value: store.enrolledCount, color: 'text-blue-600', icon: GraduationCap, bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: t('rejected'), value: store.rejectedCount, color: 'text-red-600', icon: XCircle, bg: 'bg-red-50 dark:bg-red-500/10' },
])

// ── Navigation ──
function navigateToCreate() {
  router.push('/enrollments/new')
}

function navigateToEdit(id: string) {
  router.push(`/enrollments/${id}/edit`)
}

// ── Delete ──
function confirmDelete(id: string) {
  deleteConfirmId.value = id
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function executeDelete(id: string) {
  try {
    await store.remove(id)
    showSuccessToast(t('enrollment_management.toast_deleted'), t('enrollment_management.toast_deleted_title'))
  } catch {
    showErrorToast(t('enrollment_management.toast_delete_failed'), t('records.toast_error'))
  }
  deleteConfirmId.value = null
}

// ── Status Change ──
function confirmStatusChange(id: string, newStatus: EnrollmentStatus) {
  statusChangeId.value = id
  statusChangeTarget.value = newStatus
}

function cancelStatusChange() {
  statusChangeId.value = null
  statusChangeTarget.value = 'pending'
}

async function executeStatusChange() {
  if (!statusChangeId.value) return
  try {
    await store.updateStatus(statusChangeId.value, statusChangeTarget.value)
    showSuccessToast(t('enrollment_management.toast_status_updated', { status: statusChangeTarget.value }), t('enrollment_management.toast_status_title'))
  } catch {
    showErrorToast(t('enrollment_management.toast_status_failed'), t('records.toast_error'))
  }
  statusChangeId.value = null
  statusChangeTarget.value = 'pending'
}

// ── Helpers ──
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

async function refreshData() {
  await store.fetchAll()
  showSuccessToast(t('enrollment_management.toast_refreshed'), t('enrollment_management.toast_refreshed_title'))
}
</script>

<template>
  <div class="space-y-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">{{ t('enrollment_management.title') }}</h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">
          {{ t('enrollment_management.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#374151] bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl hover:bg-[#F8FAFC] transition-all duration-200 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800"
          :title="t('enrollment_management.refresh_data')"
        >
        <button
          v-if="canManage"
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus :size="16" />
          {{ t('enrollment_management.new_enrollment') }}
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="rounded-[14px] border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
        :class="[card.bg]"
        style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">{{ card.label }}</p>
          <component :is="card.icon" :size="18" class="text-[#9CA3AF]" />
        </div>
        <p class="text-2xl font-bold tracking-tight" :class="card.color">{{ card.value }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="t('enrollment_management.search_placeholder')"
          class="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#111827] dark:text-gray-200 placeholder-[#9CA3AF] dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="statusFilter"
          class="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <option value="all">{{ t('enrollment_management.all_status') }}</option>
          <option value="pending">{{ t('pending') }}</option>
          <option value="approved">{{ t('approved') }}</option>
          <option value="enrolled">{{ t('dashboard.enrolled') }}</option>
          <option value="rejected">{{ t('rejected') }}</option>
        </select>
        <button
          @click="showFilters = !showFilters"
          class="px-3 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-[#6B7280] hover:text-[#374151] hover:bg-[#F8FAFC] transition-all duration-200 cursor-pointer dark:hover:bg-gray-800"
          :class="{ 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400': showFilters }"
          :title="t('enrollment_management.more_filters')"
        >
          <SlidersHorizontal :size="18" />
        </button>
      </div>
    </div>

    <!-- Advanced Filters -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-20"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 max-h-20"
      leave-to-class="opacity-0 -translate-y-2 max-h-0"
    >
      <div v-if="showFilters" class="flex flex-wrap gap-3">
        <select
          v-model="programFilter"
          class="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <option value="">{{ t('enrollment_management.all_programs') }}</option>
          <option v-for="program in programs" :key="program" :value="program">{{ program }}</option>
        </select>
        <select
          v-model="batchFilter"
          class="px-4 py-2.5 bg-white dark:bg-gray-800/50 border border-[#E5E7EB] dark:border-gray-700 rounded-xl text-sm text-[#374151] dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <option value="">{{ t('enrollment_management.all_batches') }}</option>
          <option value="Morning">{{ t('enrollment_management.morning') }}</option>
          <option value="Afternoon">{{ t('enrollment_management.afternoon') }}</option>
          <option value="Evening">{{ t('enrollment_management.evening') }}</option>
        </select>
      </div>
    </transition>

    <!-- Enrollments List -->
    <div class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800 overflow-hidden" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <!-- Table Header (Desktop) -->
      <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-[#F8FAFC] dark:bg-white/[0.02] border-b border-[#E5E7EB] dark:border-gray-800">
        <span class="col-span-3 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('recent_requests.student') }}</span>
        <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('recent_requests.id') }}</span>
        <span class="col-span-3 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">{{ t('recent_requests.program') }}</span>
        <span class="col-span-1 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Batch</span>
        <span class="col-span-1 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase">Status</span>
        <span class="col-span-2 text-[11px] font-semibold tracking-[0.08em] text-[#6B7280] dark:text-gray-400 uppercase text-right">{{ t('students.table_actions') }}</span>
      </div>

      <!-- Enrollments -->
      <div class="divide-y divide-[#E5E7EB] dark:divide-gray-800">
        <div
          v-for="enrollment in filteredEnrollments"
          :key="enrollment.id"
          class="group px-4 md:px-6 py-4 hover:bg-[#F9FAFB] transition-colors duration-150 dark:hover:bg-white/[0.02]"
        >
          <!-- Mobile Layout -->
          <div class="md:hidden space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold text-white">{{ getInitials(enrollment.studentName) }}</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-[#111827] dark:text-white">{{ enrollment.studentName }}</p>
                  <p class="text-xs text-[#6B7280] dark:text-gray-400">{{ enrollment.studentId }}</p>
                </div>
              </div>
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: statusStyles[enrollment.status].bg, color: statusStyles[enrollment.status].text }"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: statusStyles[enrollment.status].dot }"></span>
                {{ enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1) }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-[#6B7280] dark:text-gray-400 pl-12">
              <span>{{ enrollment.program }}</span>
              <span>·</span>
              <span>{{ enrollment.batch }}</span>
              <span>·</span>
              <span>{{ formatDate(enrollment.submittedAt) }}</span>
            </div>
            <div class="flex items-center justify-end gap-2 pt-1 pl-12">
              <button
                v-if="enrollment.status === 'pending' && canManage"
                @click="confirmStatusChange(enrollment.id, 'approved')"
                class="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer dark:hover:bg-emerald-500/10"
                :title="t('students.action_approve')"
              >
                <CheckCircle2 :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'approved' && canManage"
                @click="confirmStatusChange(enrollment.id, 'enrolled')"
                class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
                :title="t('students.action_enroll')"
              >
                <GraduationCap :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'pending' && canManage"
                @click="confirmStatusChange(enrollment.id, 'rejected')"
                class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                :title="t('students.action_reject')"
              >
                <Ban :size="16" />
              </button>
              <button
                v-if="canManage"
                @click="navigateToEdit(enrollment.id)"
                class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
                title="Edit"
              >
                <Edit :size="16" />
              </button>
              <button
                v-if="canManage"
                @click="confirmDelete(enrollment.id)"
                class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>

          <!-- Desktop Layout -->
          <div class="hidden md:grid grid-cols-12 gap-4 items-center">
            <div class="col-span-3 flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <span class="text-xs font-bold text-white">{{ getInitials(enrollment.studentName) }}</span>
              </div>
              <div>                  <p class="text-sm font-semibold text-[#111827] dark:text-white">{{ enrollment.studentName }}</p>
                  <p class="text-xs text-[#6B7280] dark:text-gray-400">{{ formatDate(enrollment.submittedAt) }}</p>
              </div>
            </div>
            <div class="col-span-2">
              <span class="text-sm font-mono text-[#374151] dark:text-gray-400">{{ enrollment.studentId }}</span>
            </div>
            <div class="col-span-3">
              <span class="text-sm text-[#374151] dark:text-gray-300">{{ enrollment.program }}</span>
            </div>
            <div class="col-span-1">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F8FAFC] text-[#6B7280] dark:bg-gray-700 dark:text-gray-300">
                {{ enrollment.batch }}
              </span>
            </div>
            <div class="col-span-1">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                :style="{ backgroundColor: statusStyles[enrollment.status].bg, color: statusStyles[enrollment.status].text }"
              >
                <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: statusStyles[enrollment.status].dot }"></span>
                {{ enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1) }}
              </span>
            </div>
            <div class="col-span-2 flex items-center justify-end gap-1">
              <!-- Quick Status Actions -->
              <button
                v-if="enrollment.status === 'pending' && canManage"
                @click="confirmStatusChange(enrollment.id, 'approved')"
                class="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer dark:hover:bg-emerald-500/10"
                title="Approve"
              >
                <UserCheck :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'approved' && canManage"
                @click="confirmStatusChange(enrollment.id, 'enrolled')"
                class="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
                :title="t('students.action_enroll')"
              >
                <UserPlus :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'pending' && canManage"
                @click="confirmStatusChange(enrollment.id, 'rejected')"
                class="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                title="Reject"
              >
                <XCircle :size="16" />
              </button>
              <button
                v-if="canManage"
                @click="navigateToEdit(enrollment.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
                title="Edit"
              >
                <Edit :size="16" />
              </button>
              <button
                v-if="canManage"
                @click="confirmDelete(enrollment.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 :size="16" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredEnrollments.length === 0" class="py-16 text-center">
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-[14px] bg-[#F8FAFC] flex items-center justify-center dark:bg-gray-800">
              <FileText :size="32" class="text-[#9CA3AF] dark:text-gray-600" />
            </div>
            <p class="text-sm font-medium text-[#6B7280] dark:text-gray-400">
              {{ searchQuery || statusFilter !== 'all' ? 'No enrollments match your filters' : 'No enrollments yet' }}
            </p>
            <p class="text-xs text-[#9CA3AF] dark:text-gray-500">
              {{ searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first enrollment to get started' }}
            </p>
            <button
              v-if="!searchQuery && statusFilter === 'all' && canManage"
              @click="navigateToCreate"
              class="mt-2 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus :size="16" />
              New Enrollment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="cancelDelete"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-bold text-[#111827] dark:text-white">Confirm Delete</h3>
          <p class="text-sm text-[#6B7280] mt-2 dark:text-gray-400">
            Are you sure you want to delete this enrollment? This action cannot be undone.
          </p>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelDelete"
              class="px-4 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              @click="executeDelete(deleteConfirmId)"
              class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Status Change Confirmation Modal -->
    <Teleport to="body">
      <div v-if="statusChangeId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="cancelStatusChange"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h3 class="text-lg font-bold text-[#111827] dark:text-white">Confirm Status Change</h3>
          <p class="text-sm text-[#6B7280] mt-2 dark:text-gray-400">
            Are you sure you want to change this enrollment status to
            <strong class="text-[#374151] dark:text-gray-200 capitalize">{{ statusChangeTarget }}</strong>?
          </p>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelStatusChange"
              class="px-4 py-2 text-sm font-medium text-[#374151] bg-[#F8FAFC] rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              @click="executeStatusChange"
              class="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors cursor-pointer"
              :class="statusChangeTarget === 'rejected'
                ? 'bg-red-500 hover:bg-red-600'
                : statusChangeTarget === 'enrolled'
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
