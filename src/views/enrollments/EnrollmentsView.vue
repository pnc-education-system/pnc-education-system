<script setup lang="ts">
defineOptions({ name: 'EnrollmentsPage' })

import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEnrollmentsStore } from '@/stores/enrollments'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import type { Enrollment, EnrollmentStatus } from '@/types'

import {
  Plus,
  Search,
  SlidersHorizontal,
  GraduationCap,
  UserCheck,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Edit,
  Trash2,
  CheckCircle2,
  Ban,
  UserPlus,
} from 'lucide-vue-next'

const router = useRouter()
const store = useEnrollmentsStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()
const { t } = useI18n()

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
  { label: 'Total Applications', value: store.totalEnrollments, color: 'text-gray-900', icon: FileText, bg: 'bg-gray-50 dark:bg-white/[0.04]' },
  { label: 'Pending Review', value: store.pendingCount, color: 'text-orange-600', icon: Clock, bg: 'bg-orange-50 dark:bg-orange-500/10' },
  { label: 'Approved', value: store.approvedCount, color: 'text-emerald-600', icon: UserCheck, bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Enrolled', value: store.enrolledCount, color: 'text-blue-600', icon: GraduationCap, bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: 'Rejected', value: store.rejectedCount, color: 'text-red-600', icon: XCircle, bg: 'bg-red-50 dark:bg-red-500/10' },
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
    showSuccessToast('Enrollment deleted successfully.', 'Deleted')
  } catch {
    showErrorToast('Failed to delete enrollment.', 'Error')
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
    showSuccessToast(`Enrollment ${statusChangeTarget.value} successfully.`, 'Status Updated')
  } catch {
    showErrorToast('Failed to update status.', 'Error')
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
  showSuccessToast('Data refreshed.', 'Refreshed')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Enrollment Management</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Manage student enrollment applications, review submissions, and update statuses.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          title="Refresh data"
        >
          <RefreshCw :size="16" />
          <span class="hidden sm:inline">Refresh</span>
        </button>
        <button
          v-if="canManage"
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <Plus :size="16" />
          New Enrollment
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div
        v-for="card in statsCards"
        :key="card.label"
        class="rounded-xl border border-gray-100 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default dark:border-gray-700/50"
        :class="[card.bg]"
      >
        <div class="flex items-center justify-between mb-3">
          <p class="text-xs font-semibold tracking-wider text-gray-400 uppercase">{{ card.label }}</p>
          <component :is="card.icon" :size="18" class="text-gray-400" />
        </div>
        <p class="text-2xl font-bold tracking-tight" :class="card.color">{{ card.value }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by student name, ID, or program..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>
      <div class="flex gap-2">
        <select
          v-model="statusFilter"
          class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="enrolled">Enrolled</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          @click="showFilters = !showFilters"
          class="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 dark:hover:bg-gray-800"
          :class="{ 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400': showFilters }"
          title="More filters"
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
          class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="">All Programs</option>
          <option v-for="program in programs" :key="program" :value="program">{{ program }}</option>
        </select>
        <select
          v-model="batchFilter"
          class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
        >
          <option value="">All Batches</option>
          <option value="Morning">Morning</option>
          <option value="Afternoon">Afternoon</option>
          <option value="Evening">Evening</option>
        </select>
      </div>
    </transition>

    <!-- Enrollments List -->
    <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden dark:bg-gray-800/20 dark:border-gray-700/50">
      <!-- Table Header (Desktop) -->
      <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 border-b border-gray-100 dark:bg-white/[0.02] dark:border-gray-700/50">
        <span class="col-span-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Student</span>
        <span class="col-span-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">Student ID</span>
        <span class="col-span-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Program</span>
        <span class="col-span-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">Batch</span>
        <span class="col-span-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">Status</span>
        <span class="col-span-2 text-xs font-semibold tracking-wider text-gray-400 uppercase text-right">Actions</span>
      </div>

      <!-- Enrollments -->
      <div class="divide-y divide-gray-100 dark:divide-gray-700/50">
        <div
          v-for="enrollment in filteredEnrollments"
          :key="enrollment.id"
          class="group px-4 md:px-6 py-4 hover:bg-gray-50/50 transition-colors duration-150 dark:hover:bg-white/[0.02]"
        >
          <!-- Mobile Layout -->
          <div class="md:hidden space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold text-white">{{ getInitials(enrollment.studentName) }}</span>
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ enrollment.studentName }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">{{ enrollment.studentId }}</p>
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
            <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pl-12">
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
                title="Approve"
              >
                <CheckCircle2 :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'approved' && canManage"
                @click="confirmStatusChange(enrollment.id, 'enrolled')"
                class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
                title="Mark as Enrolled"
              >
                <GraduationCap :size="16" />
              </button>
              <button
                v-if="enrollment.status === 'pending' && canManage"
                @click="confirmStatusChange(enrollment.id, 'rejected')"
                class="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                title="Reject"
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
              <div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ enrollment.studentName }}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(enrollment.submittedAt) }}</p>
              </div>
            </div>
            <div class="col-span-2">
              <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ enrollment.studentId }}</span>
            </div>
            <div class="col-span-3">
              <span class="text-sm text-gray-700 dark:text-gray-300">{{ enrollment.program }}</span>
            </div>
            <div class="col-span-1">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
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
                title="Mark as Enrolled"
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
            <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center dark:bg-gray-800">
              <FileText :size="32" class="text-gray-300 dark:text-gray-600" />
            </div>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
              {{ searchQuery || statusFilter !== 'all' ? 'No enrollments match your filters' : 'No enrollments yet' }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500">
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
        <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 dark:bg-gray-800">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Confirm Delete</h3>
          <p class="text-sm text-gray-500 mt-2 dark:text-gray-400">
            Are you sure you want to delete this enrollment? This action cannot be undone.
          </p>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelDelete"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
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
        <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 dark:bg-gray-800">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Confirm Status Change</h3>
          <p class="text-sm text-gray-500 mt-2 dark:text-gray-400">
            Are you sure you want to change this enrollment status to
            <strong class="text-gray-700 dark:text-gray-200 capitalize">{{ statusChangeTarget }}</strong>?
          </p>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelStatusChange"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
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
