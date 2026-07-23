<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import type { Student } from '@/types'
import { studentsApi, type StudentRecord, type StudentRecordCategory, type StudentRecordPayload } from '@/services/api/students'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { FileText, AlertTriangle, MessageSquare, Award, Calendar, Plus, Pencil, Trash2, X, Save } from 'lucide-vue-next'

const props = defineProps<{ student: Student }>()

const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

const categories: Array<{ value: StudentRecordCategory; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'note', label: 'Note' },
  { value: 'incident', label: 'Incident' },
  { value: 'achievement', label: 'Achievement' },
]

const records = ref<StudentRecord[]>([])
const loading = ref(false)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)

const form = reactive<StudentRecordPayload>({
  category: 'general',
  title: '',
  description: '',
  record_date: new Date().toISOString().slice(0, 10),
})

const studentId = computed(() => Number(props.student.id))
const canViewRecords = computed(() => authStore.hasAnyPermission(['records.view', 'records.manage']))
const canManageRecords = computed(() => authStore.hasPermission('records.manage'))

const categoryMeta: Record<StudentRecordCategory, { icon: typeof FileText; gradient: string; borderHover: string }> = {
  general: { icon: FileText, gradient: 'from-slate-500 to-slate-600', borderHover: 'hover:border-slate-200 dark:hover:border-slate-500/30' },
  note: { icon: MessageSquare, gradient: 'from-blue-500 to-blue-600', borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/30' },
  incident: { icon: AlertTriangle, gradient: 'from-amber-500 to-amber-600', borderHover: 'hover:border-amber-200 dark:hover:border-amber-500/30' },
  achievement: { icon: Award, gradient: 'from-emerald-500 to-emerald-600', borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-500/30' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function resetForm() {
  form.category = 'general'
  form.title = ''
  form.description = ''
  form.record_date = new Date().toISOString().slice(0, 10)
  editingId.value = null
}

async function loadRecords() {
  if (!canViewRecords.value || !studentId.value) return

  loading.value = true
  try {
    records.value = await studentsApi.listRecords(studentId.value)
  } catch {
    showErrorToast('Unable to load student records.')
  } finally {
    loading.value = false
  }
}

function startCreate() {
  resetForm()
  showForm.value = true
}

function startEdit(record: StudentRecord) {
  form.category = record.category
  form.title = record.title
  form.description = record.description
  form.record_date = record.record_date
  editingId.value = record.id
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  resetForm()
}

async function submitRecord() {
  if (!canManageRecords.value) return

  saving.value = true
  try {
    if (editingId.value) {
      const updated = await studentsApi.updateRecord(studentId.value, editingId.value, form)
      records.value = records.value.map((record) => (record.id === updated.id ? updated : record))
      showSuccessToast('Record updated successfully.')
    } else {
      const created = await studentsApi.createRecord(studentId.value, form)
      records.value = [created, ...records.value]
      showSuccessToast('Record added successfully.')
    }
    cancelForm()
  } catch {
    showErrorToast('Unable to save this record.')
  } finally {
    saving.value = false
  }
}

async function deleteRecord(record: StudentRecord) {
  if (!canManageRecords.value || !window.confirm('Delete this record?')) return

  try {
    await studentsApi.deleteRecord(studentId.value, record.id)
    records.value = records.value.filter((item) => item.id !== record.id)
    showSuccessToast('Record deleted successfully.')
  } catch {
    showErrorToast('Unable to delete this record.')
  }
}

onMounted(loadRecords)
watch(() => props.student.id, loadRecords)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-bold text-gray-900 dark:text-white">Student Records</h3>
      <button
        v-if="canManageRecords"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="saving"
        @click="startCreate"
      >
        <Plus :size="14" />
        Add Record
      </button>
    </div>

    <form
      v-if="showForm && canManageRecords"
      class="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/40"
      @submit.prevent="submitRecord"
    >
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Category
          <select v-model="form.category" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
          </select>
        </label>
        <label class="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          Date
          <input v-model="form.record_date" type="date" required class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
        </label>
      </div>
      <label class="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
        Title
        <input v-model.trim="form.title" type="text" required maxlength="255" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
        Description
        <textarea v-model.trim="form.description" required rows="3" class="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"></textarea>
      </label>
      <div class="flex justify-end gap-2">
        <button type="button" class="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700/40" @click="cancelForm">
          <X :size="14" />
          Cancel
        </button>
        <button type="submit" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="saving">
          <Save :size="14" />
          {{ editingId ? 'Save' : 'Add' }}
        </button>
      </div>
    </form>

    <div v-if="!canViewRecords" class="py-16 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50">
        <FileText :size="32" class="text-gray-300 dark:text-gray-600" />
      </div>
      <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">Records unavailable</p>
    </div>

    <div v-else-if="loading" class="py-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
      Loading records...
    </div>

    <div v-else-if="records.length > 0" class="space-y-3.5">
      <div
        v-for="record in records"
        :key="record.id"
        class="group rounded-lg border border-gray-100 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/20 sm:p-5"
        :class="categoryMeta[record.category].borderHover"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-105" :class="categoryMeta[record.category].gradient">
            <component :is="categoryMeta[record.category].icon" :size="17" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-gray-900 transition-colors duration-200 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{{ record.title }}</h4>
                <p class="mt-1.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ record.description }}</p>
              </div>
              <div class="flex flex-shrink-0 items-center gap-2">
                <span class="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-400 dark:bg-gray-700/30 dark:text-gray-500">
                  <Calendar :size="11" />
                  {{ formatDate(record.record_date) }}
                </span>
                <button v-if="canManageRecords" type="button" class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 hover:text-blue-600 dark:hover:bg-gray-700/40" title="Edit record" @click="startEdit(record)">
                  <Pencil :size="14" />
                </button>
                <button v-if="canManageRecords" type="button" class="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" title="Delete record" @click="deleteRecord(record)">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="py-16 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800/50">
        <FileText :size="32" class="text-gray-300 dark:text-gray-600" />
      </div>
      <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No records found</p>
      <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Student records will appear here once available.</p>
    </div>
  </div>
</template>
