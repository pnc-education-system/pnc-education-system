<script setup lang="ts">
defineOptions({ name: 'EnrollmentFormPage' })

import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useEnrollmentsStore } from '@/stores/enrollments'
import { useToast } from '@/composables/useToast'
import { ArrowLeft, Save, User, Hash, BookOpen, Calendar, Clock, FileText } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useEnrollmentsStore()
const { showSuccessToast, showErrorToast } = useToast()

const isEdit = computed(() => route.path.includes('/edit'))
const enrollmentId = computed(() => route.params.id as string)

const form = ref({
  studentName: '',
  studentId: '',
  program: '',
  batch: '',
  academicYear: '',
  status: 'pending' as 'pending' | 'approved' | 'rejected' | 'enrolled',
  notes: '',
})

const saving = ref(false)

// Available options
const programOptions = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Business Administration',
  'BS Computer Engineering',
  'BS Nursing',
  'BS Information Systems',
  'BS Accounting',
  'BS Marketing',
]

const batchOptions = ['Morning', 'Afternoon', 'Evening']
const academicYearOptions = ['2024-2025', '2025-2026', '2026-2027']

onMounted(() => {
  if (isEdit.value && enrollmentId.value) {
    const existing = store.getById(enrollmentId.value)
    if (existing) {
      form.value = {
        studentName: existing.studentName,
        studentId: existing.studentId,
        program: existing.program,
        batch: existing.batch,
        academicYear: existing.academicYear,
        status: existing.status,
        notes: existing.notes || '',
      }
    } else {
      showErrorToast(t('enrollment_form.toast_not_found'), 'Error')
      router.push('/enrollments')
    }
  }
})

async function handleSubmit() {
  // Validate
  if (!form.value.studentName.trim() || !form.value.studentId.trim() || !form.value.program || !form.value.batch || !form.value.academicYear) {
    showErrorToast(t('enrollment_form.validation_required'), 'Validation Error')
    return
  }

  saving.value = true

  try {
    if (isEdit.value && enrollmentId.value) {
      await store.update(enrollmentId.value, {
        student_name: form.value.studentName.trim(),
        student_id: form.value.studentId.trim(),
        program: form.value.program,
        batch: form.value.batch,
        academic_year: form.value.academicYear,
        status: form.value.status,
        notes: form.value.notes.trim() || undefined,
      })
      showSuccessToast(t('enrollment_form.toast_updated'), t('enrollment_form.toast_updated_title'))
    } else {
      await store.create({
        student_name: form.value.studentName.trim(),
        student_id: form.value.studentId.trim(),
        program: form.value.program,
        batch: form.value.batch,
        academic_year: form.value.academicYear,
        notes: form.value.notes.trim() || undefined,
      })
      showSuccessToast(t('enrollment_form.toast_created'), t('enrollment_form.toast_created_title'))
    }
    router.push('/enrollments')
  } catch {
    showErrorToast(t('enrollment_form.toast_error'), 'Error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/enrollments')
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <ArrowLeft :size="20" />
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ isEdit ? t('enrollment_form.edit_title') : t('enrollment_form.new_title') }}</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ isEdit ? t('enrollment_form.edit_subtitle') : t('enrollment_form.new_subtitle') }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <div class="bg-white border border-gray-100 rounded-2xl p-6 space-y-6 dark:bg-gray-800/20 dark:border-gray-700/50">
      <!-- Student Information Section -->
      <div>
        <div class="flex items-center gap-2 mb-4">
          <User :size="16" class="text-blue-500" />
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">{{ t('enrollment_form.section_student') }}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Student Name -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {{ t('enrollment_form.label_full_name') }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <User :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="form.studentName"
                type="text"
                :placeholder="t('enrollment_form.placeholder_name')"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <!-- Student ID -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {{ t('enrollment_form.label_student_id') }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Hash :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                v-model="form.studentId"
                type="text"
                :placeholder="t('enrollment_form.placeholder_id')"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <!-- Program -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {{ t('enrollment_form.label_program') }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <BookOpen :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                v-model="form.program"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="" disabled>{{ t('enrollment_form.select_program') }}</option>
                <option v-for="prog in programOptions" :key="prog" :value="prog">{{ prog }}</option>
              </select>
              <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Enrollment Details Section -->
      <div class="pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <div class="flex items-center gap-2 mb-4">
          <FileText :size="16" class="text-blue-500" />
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">{{ t('enrollment_form.section_enrollment') }}</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Batch -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {{ t('enrollment_form.label_batch') }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Clock :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                v-model="form.batch"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="" disabled>{{ t('enrollment_form.select_batch') }}</option>
                <option v-for="batch in batchOptions" :key="batch" :value="batch">{{ batch }}</option>
              </select>
              <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          <!-- Academic Year -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {{ t('enrollment_form.label_academic_year') }} <span class="text-red-400">*</span>
            </label>
            <div class="relative">
              <Calendar :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                v-model="form.academicYear"
                class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
              >
                <option value="" disabled>{{ t('enrollment_form.select_year') }}</option>
                <option v-for="year in academicYearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
              <svg class="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          <!-- Status (edit only) -->
          <div v-if="isEdit">
            <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">{{ t('enrollment_form.label_status') }}</label>
            <select
              v-model="form.status"
              class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="enrolled">Enrolled</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">{{ t('enrollment_form.label_notes') }}</label>
        <textarea
          v-model="form.notes"
          rows="3"
          :placeholder="t('enrollment_form.placeholder_notes')"
          class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
        <button
          @click="goBack"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
        >
          {{ t('enrollment_form.cancel') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="saving"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save :size="16" />
          {{ saving ? t('enrollment_form.saving_text') : (isEdit ? t('enrollment_form.update') : t('enrollment_form.create')) }}
        </button>
      </div>
    </div>
  </div>
</template>
