<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useStudentsStore } from '@/stores/students'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const studentsStore = useStudentsStore()
const { showSuccessToast, showErrorToast } = useToast()

const isEditing = computed(() => !!route.query.id)
const editingId = computed(() => (route.query.id as string | undefined) || null)

const title = computed(() => (isEditing.value ? t('student_form.edit_title') : t('student_form.new_title')))
const subtitle = computed(() => (isEditing.value ? t('student_form.edit_subtitle') : t('student_form.new_subtitle')))
const sectionDetails = computed(() => t('student_form.section_details'))
const labelName = computed(() => t('student_form.label_name'))
const labelEmail = computed(() => t('student_form.label_email'))
const labelPhone = computed(() => t('student_form.label_phone'))
const labelProgram = computed(() => t('student_form.label_program'))
const placeholderProgram = computed(() => t('student_form.placeholder_program'))
const labelStatus = computed(() => t('student_form.label_status'))
const required = computed(() => t('student_form.required'))
const cancel = computed(() => t('student_form.cancel'))
const saving = computed(() => t('student_form.saving'))
const createLabel = computed(() => (isEditing.value ? t('student_form.update') : t('student_form.create')))
const toastCreated = computed(() => t('student_form.toast_created'))
const toastCreatedTitle = computed(() => t('student_form.toast_created_title'))
const toastUpdated = computed(() => t('student_form.toast_updated'))
const toastUpdatedTitle = computed(() => t('student_form.toast_updated_title'))
const toastSaveError = computed(() => t('student_form.toast_save_error'))
const toastValidation = computed(() => t('student_form.toast_validation'))
const toastValidationTitle = computed(() => t('student_form.toast_validation_title'))

const form = ref({
  name: editingId.value ? studentsStore.getById(editingId.value)?.name || '' : '',
  email: editingId.value ? studentsStore.getById(editingId.value)?.email || '' : '',
  phone: editingId.value ? studentsStore.getById(editingId.value)?.phone || '' : '',
  program: editingId.value ? studentsStore.getById(editingId.value)?.program || '' : '',
  status: (editingId.value ? studentsStore.getById(editingId.value)?.status || 'enrolled' : 'enrolled') as 'enrolled' | 'pending' | 'completed',
})

const isSaving = ref(false)

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.program.trim()) {
    showErrorToast(toastValidation.value, toastValidationTitle.value)
    return
  }

  isSaving.value = true
  try {
    const normalizedStatus = ['enrolled', 'pending', 'completed'].includes(form.value.status)
      ? (form.value.status as 'enrolled' | 'pending' | 'completed')
      : 'enrolled'

    if (isEditing.value && editingId.value) {
      studentsStore.update(editingId.value, {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        phone: form.value.phone.trim(),
        program: form.value.program.trim(),
        status: normalizedStatus,
      })
      showSuccessToast(toastUpdated.value, toastUpdatedTitle.value)
      router.push('/students')
      return
    }

    // TODO: replace with real student API/store call on create
    await new Promise((resolve) => setTimeout(resolve, 500))
    studentsStore.create({
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      phone: form.value.phone.trim(),
      program: form.value.program.trim(),
      status: normalizedStatus,
    })
    showSuccessToast(toastCreated.value, toastCreatedTitle.value)
    router.push('/students')
  } catch {
    showErrorToast(toastSaveError.value, toastValidationTitle.value)
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push('/students')
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg
          class="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ title }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ subtitle }}
        </p>
      </div>
    </div>

    <div
      class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden"
    >
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          {{ sectionDetails }}
        </h2>
      </div>

      <div class="p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelName }} <span class="text-red-400">{{ required }}</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Jane Doe"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelEmail }} <span class="text-red-400">{{ required }}</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            placeholder="e.g. jane@pnc.edu"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelPhone }}
          </label>
          <input
            v-model="form.phone"
            type="tel"
            placeholder="e.g. +855 12 345 678"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelProgram }} <span class="text-red-400">{{ required }}</span>
          </label>
          <input
            v-model="form.program"
            type="text"
            :placeholder="placeholderProgram"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
            {{ labelStatus }}
          </label>
          <select
            v-model="form.status"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="enrolled">Enrolled</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div
        class="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-end gap-3"
      >
        <button
          @click="goBack"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
        >
          {{ cancel }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="isSaving"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ isSaving ? saving : createLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
