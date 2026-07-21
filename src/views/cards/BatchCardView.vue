<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStudentsStore } from '@/stores/students'
import { useToast } from '@/composables/useToast'
import { Download, Printer, Search } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const studentsStore = useStudentsStore()
const { showSuccessToast, showErrorToast } = useToast()

const searchQuery = ref('')
const selectedBatch = ref('')
const selectedStudents = ref<Set<number>>(new Set())
const selectAll = ref(false)

const students = computed(() => studentsStore.students || [])

const batches = computed(() => {
  const set = new Set<string>()
  students.value.forEach((s: Record<string, unknown>) => {
    if (s.selection_batch_name) set.add(s.selection_batch_name)
  })
  return Array.from(set).sort()
})

const filteredStudents = computed(() => {
  let list = students.value
  if (selectedBatch.value) {
    list = list.filter((s: Record<string, unknown>) => s.selection_batch_name === selectedBatch.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((s: Record<string, unknown>) =>
      ((s.full_name as string)?.toLowerCase() || '').includes(q) ||
      ((s.student_id_no as string)?.toLowerCase() || '').includes(q)
    )
  }
  return list
})

const eligibleCount = computed(() => students.value.filter((s: Record<string, unknown>) => s.enrollment_status === 'enrolled').length)

function toggleSelectAll() {
  selectAll.value = !selectAll.value
  if (selectAll.value) {
    selectedStudents.value = new Set(filteredStudents.value.map((s: Record<string, unknown>) => s.id as number))
  } else {
    selectedStudents.value.clear()
  }
}

function toggleStudent(id: number) {
  const next = new Set(selectedStudents.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedStudents.value = next
  selectAll.value = next.size === filteredStudents.value.length && filteredStudents.value.length > 0
}

async function handleBatchPrint() {
  if (selectedStudents.value.size === 0) {
    showErrorToast(t('cards.selection_required'), t('cards.selection_required_title'))
    return
  }
  showSuccessToast(
    `Queued ${selectedStudents.value.size} card(s) for batch printing.`,
    'Batch Print Initiated'
  )
}

async function handleExportCsv() {
  if (selectedStudents.value.size === 0) {
    showErrorToast(t('cards.selection_required'), t('cards.selection_required_title'))
    return
  }
  showSuccessToast(
    `Exporting ${selectedStudents.value.size} card record(s).`,
    'Export Started'
  )
}

async function handleRefresh() {
  await studentsStore.fetchStudents()
  showSuccessToast('Student data refreshed.', 'Refreshed')
}

function viewStudentCards(studentId: number) {
  router.push(`/cards/id-card?studentId=${studentId}`)
}

onMounted(async () => {
  if (!students.value.length) {
    await studentsStore.fetchStudents()
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Batch Card</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Print or export multiple student ID cards at once.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="handleRefresh"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh
        </button>
        <button
          @click="handleBatchPrint"
          :disabled="selectedStudents.size === 0"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="selectedStudents.size > 0
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'"
        >
          <Printer :size="16" />
          Batch Print ({{ selectedStudents.size }})
        </button>
        <button
          @click="handleExportCsv"
          :disabled="selectedStudents.size === 0"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          :class="selectedStudents.size > 0
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400'"
        >
          <Download :size="16" />
          Export
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Students</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ students.length }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Eligible for Cards</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ eligibleCount }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Selected</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ selectedStudents.size }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Batches</p>
        <p class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{{ batches.length }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or student ID..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        />
      </div>
      <select
        v-model="selectedBatch"
        class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[180px]"
      >
        <option value="">All Batches</option>
        <option v-for="batch in batches" :key="batch" :value="batch">{{ batch }}</option>
      </select>
    </div>

    <!-- Student Table -->
    <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <!-- Table Header -->
      <div class="grid grid-cols-[40px_1fr_1.2fr_0.8fr_0.8fr_80px] gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-400 uppercase tracking-wider">
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            :checked="selectAll"
            :indeterminate="selectedStudents.size > 0 && selectedStudents.size < filteredStudents.length"
            @change="toggleSelectAll"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
          />
        </div>
        <span>Student</span>
        <span>Student ID</span>
        <span>Batch</span>
        <span>Status</span>
        <span class="text-center">Action</span>
      </div>

      <!-- Table Body -->
      <div v-if="filteredStudents.length === 0" class="px-5 py-12 text-center">
        <p class="text-sm font-medium text-gray-400">No students found</p>
        <p class="text-xs text-gray-400 mt-1">Try adjusting your search or filter criteria.</p>
      </div>

      <div
        v-for="student in filteredStudents"
        :key="student.id"
        class="grid grid-cols-[40px_1fr_1.2fr_0.8fr_0.8fr_80px] gap-4 px-5 py-3.5 items-center border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
      >
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            :checked="selectedStudents.has(student.id)"
            @change="toggleStudent(student.id)"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
          />
        </div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {{ (student.full_name || '?').charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ student.full_name }}</span>
        </div>
        <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ student.student_id_no || '—' }}</span>
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ student.selection_batch_name || '—' }}</span>
        <div>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="{
              'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': student.enrollment_status === 'enrolled',
              'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400': student.enrollment_status === 'pending',
              'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400': student.enrollment_status === 'graduated',
              'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400': ['rejected', 'dropped'].includes(student.enrollment_status),
            }"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="{
                'bg-emerald-500': student.enrollment_status === 'enrolled',
                'bg-amber-500': student.enrollment_status === 'pending',
                'bg-purple-500': student.enrollment_status === 'graduated',
                'bg-red-500': ['rejected', 'dropped'].includes(student.enrollment_status),
              }"
            ></span>
            {{ (student.enrollment_status || 'unknown').charAt(0).toUpperCase() + (student.enrollment_status || 'unknown').slice(1) }}
          </span>
        </div>
        <div class="flex justify-center">
          <button
            @click="viewStudentCards(student.id)"
            class="text-xs font-medium text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            View
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
