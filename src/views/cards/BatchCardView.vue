<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useStudentsStore } from '@/stores/students'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
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
    if (s.selectionBatchName) set.add(s.selectionBatchName as string)
  })
  return Array.from(set).sort()
})

const filteredStudents = computed(() => {
  let list = students.value
  if (selectedBatch.value) {
    list = list.filter((s: Record<string, unknown>) => s.selectionBatchName === selectedBatch.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((s: Record<string, unknown>) =>
      ((s.fullName as string)?.toLowerCase() || '').includes(q) ||
      ((s.studentIdNo as string)?.toLowerCase() || '').includes(q)
    )
  }
  return list
})

const eligibleCount = computed(() => students.value.filter((s: Record<string, unknown>) => s.status === 'enrolled').length)

function toggleSelectAll() {
  selectAll.value = !selectAll.value
  if (selectAll.value) {
    selectedStudents.value = new Set(filteredStudents.value.map((s: Record<string, unknown>) => Number(s.id)))
  } else {
    selectedStudents.value.clear()
  }
}

function toggleStudent(id: string) {
  const next = new Set(selectedStudents.value)
  const numericId = Number(id)
  if (next.has(numericId)) {
    next.delete(numericId)
  } else {
    next.add(numericId)
  }
  selectedStudents.value = next
  selectAll.value = next.size === filteredStudents.value.length && filteredStudents.value.length > 0
}

async function handleBatchPrint() {
  if (selectedStudents.value.size === 0) {
    showErrorToast(t('cards.selection_required'), t('cards.selection_required_title'))
    return
  }    showSuccessToast(
      t('batch_card.toast_print', { count: selectedStudents.value.size }),
      t('batch_card.toast_print_title')
    )
}

async function handleExportCsv() {
  if (selectedStudents.value.size === 0) {
    showErrorToast(t('cards.selection_required'), t('cards.selection_required_title'))
    return
  }    showSuccessToast(
      t('batch_card.toast_export', { count: selectedStudents.value.size }),
      t('batch_card.toast_export_title')
    )
}

async function handleRefresh() {
  await studentsStore.fetchAll()
  showSuccessToast(t('batch_card.toast_refreshed'), t('batch_card.toast_refreshed_title'))
}

function viewStudentCards(studentId: string) {
  router.push(`/cards/id-card?studentId=${studentId}`)
}

const { start: startPolling } = usePolling(() => studentsStore.fetchAll(), 10_000)

onMounted(async () => {
  if (!students.value.length) {
    await studentsStore.fetchAll()
  }
  startPolling()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{{ t('batch_card.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('batch_card.subtitle') }}</p>
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
          {{ t('batch_card.refresh') }}
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
          {{ t('batch_card.batch_print', { count: selectedStudents.size }) }}
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
          {{ t('batch_card.export') }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ t('batch_card.total_students') }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">{{ students.length }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ t('batch_card.eligible_for_cards') }}</p>
        <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ eligibleCount }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ t('batch_card.selected') }}</p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{{ selectedStudents.size }}</p>
      </div>
      <div class="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">{{ t('batch_card.batches') }}</p>
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
          :placeholder="t('batch_card.search_placeholder')"
          class="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
        />
      </div>
      <select
        v-model="selectedBatch"
        class="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer min-w-[180px]"
      >
        <option value="">{{ t('batch_card.all_batches') }}</option>
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
        <span>{{ t('batch_card.table_student') }}</span>
        <span>{{ t('batch_card.table_student_id') }}</span>
        <span>{{ t('batch_card.table_batch') }}</span>
        <span>{{ t('batch_card.table_status') }}</span>
        <span class="text-center">{{ t('batch_card.table_action') }}</span>
      </div>

      <!-- Table Body -->
      <div v-if="filteredStudents.length === 0" class="px-5 py-12 text-center">
        <p class="text-sm font-medium text-gray-400">{{ t('batch_card.no_students') }}</p>
        <p class="text-xs text-gray-400 mt-1">{{ t('batch_card.no_students_hint') }}</p>
      </div>

      <div
        v-for="student in filteredStudents"
        :key="student.id"
        class="grid grid-cols-[40px_1fr_1.2fr_0.8fr_0.8fr_80px] gap-4 px-5 py-3.5 items-center border-b border-gray-50 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
      >
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            :checked="selectedStudents.has(Number(student.id))"
            @change="toggleStudent(student.id as string)"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
          />
        </div>
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {{ (student.fullName || '?').charAt(0).toUpperCase() }}
          </div>
          <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ student.fullName }}</span>
        </div>
        <span class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ student.studentIdNo || '—' }}</span>
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ student.selectionBatchName || '—' }}</span>
        <div>
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            :class="{
              'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': student.status === 'enrolled',
              'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400': student.status === 'pending',
              'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400': student.status === 'graduated',
              'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400': ['rejected', 'dropped'].includes(student.status),
            }"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="{
                'bg-emerald-500': student.status === 'enrolled',
                'bg-amber-500': student.status === 'pending',
                'bg-purple-500': student.status === 'graduated',
                'bg-red-500': ['rejected', 'dropped'].includes(student.status),
              }"
            ></span>
            {{ (student.status || 'unknown').charAt(0).toUpperCase() + (student.status || 'unknown').slice(1) }}
          </span>
        </div>
        <div class="flex justify-center">
          <button
            @click="viewStudentCards(student.id as string)"
            class="text-xs font-medium text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {{ t('batch_card.view') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
