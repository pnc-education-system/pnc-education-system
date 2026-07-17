<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { studentsApi, type StudentFormPayload } from '@/services/api/students'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { showSuccessToast, showErrorToast } = useToast()

const editingId = computed(() => {
  const routeId = route.params.id
  if (Array.isArray(routeId)) return routeId[0] || null
  return routeId || (route.query.id as string | undefined) || null
})
const isEditing = computed(() => !!editingId.value)

const title = computed(() =>
  isEditing.value ? t('student_form.edit_title') : t('student_form.new_title'),
)
const subtitle = computed(() =>
  isEditing.value ? t('student_form.edit_subtitle') : t('student_form.new_subtitle'),
)
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
const createLabel = computed(() =>
  isEditing.value ? t('student_form.update') : t('student_form.create'),
)
const toastCreated = computed(() => t('student_form.toast_created'))
const toastCreatedTitle = computed(() => t('student_form.toast_created_title'))
const toastUpdated = computed(() => t('student_form.toast_updated'))
const toastUpdatedTitle = computed(() => t('student_form.toast_updated_title'))
const toastSaveError = computed(() => t('student_form.toast_save_error'))
const toastValidation = computed(() => t('student_form.toast_validation'))
const toastValidationTitle = computed(() => t('student_form.toast_validation_title'))

const form = ref({
  student_id_no: '',
  full_name: '',
  gender: 'Male' as 'Male' | 'Female',
  dob: '',
  phone: '',
  email: '',
  province: '',
  high_school: '',
  selection_batch_id: null as number | null,
  enrollment_status: 'Pending' as 'Pending' | 'Enrolled' | 'Rejected' | 'Graduated' | 'Dropped',
  intake_year: new Date().getFullYear(),
})

const selectionBatches = ref<SelectionBatch[]>([])
const isSaving = ref(false)
const isLoading = ref(false)
const selectedPhoto = ref<File | null>(null)
const existingPhotoPath = ref<string | null>(null)
const photoPreviewUrl = ref<string | null>(null)
const photoInput = ref<HTMLInputElement | null>(null)

const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp']
const allowedStatuses = ['Pending', 'Enrolled', 'Rejected', 'Graduated', 'Dropped'] as const
type EnrollmentStatusOption = (typeof allowedStatuses)[number]

const displayPhotoUrl = computed(() => photoPreviewUrl.value || resolvePhotoUrl(existingPhotoPath.value))

onMounted(async () => {
  try {
    const response = await selectionBatchesApi.list()
    selectionBatches.value = response
    console.log('Selection batches loaded:', selectionBatches.value)
    if (selectionBatches.value.length > 0 && selectionBatches.value[0]) {
      form.value.selection_batch_id = selectionBatches.value[0].id
    }
  } catch (error) {
    console.error('Failed to load selection batches:', error)
    showErrorToast('Failed to load selection batches', 'Error')
  }

  if (isEditing.value && editingId.value) {
    isLoading.value = true
    try {
      const student = await studentsApi.get(Number(editingId.value))
      form.value = {
        student_id_no: student.student_id_no,
        full_name: student.full_name,
        gender: student.gender === 'Female' ? 'Female' : 'Male',
        dob: student.dob || '',
        phone: student.phone || '',
        email: student.email || '',
        province: student.province || '',
        high_school: student.high_school || '',
        selection_batch_id: student.selection_batch_id ?? null,
        enrollment_status: normalizeEnrollmentStatus(student.enrollment_status),
        intake_year: student.intake_year || new Date().getFullYear(),
      }
      existingPhotoPath.value = student.photo_path || null
    } catch (error) {
      showErrorToast('Failed to load student data', 'Error')
      router.push('/students')
    } finally {
      isLoading.value = false
    }
  }
})

onUnmounted(() => {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
  }
})

async function handleSubmit() {
  const selectionBatchId = form.value.selection_batch_id

  if (!form.value.student_id_no.trim() || !form.value.full_name.trim() || selectionBatchId === null || selectionBatchId === 0) {
    showErrorToast(toastValidation.value, toastValidationTitle.value)
    return
  }

  if (!(allowedStatuses as readonly string[]).includes(form.value.enrollment_status)) {
    showErrorToast('Invalid enrollment status.', toastValidationTitle.value)
    return
  }

  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    showErrorToast('Email must be a valid email address.', toastValidationTitle.value)
    return
  }

  if (selectedPhoto.value && !allowedPhotoTypes.includes(selectedPhoto.value.type)) {
    showErrorToast('Student photo must be a JPG, PNG, or WEBP file.', toastValidationTitle.value)
    return
  }

  isSaving.value = true
  try {
    const payload: StudentFormPayload = {
      student_id_no: form.value.student_id_no.trim(),
      full_name: form.value.full_name.trim(),
      gender: form.value.gender,
      dob: form.value.dob || null,
      phone: form.value.phone.trim() || null,
      email: form.value.email.trim() || null,
      province: form.value.province.trim() || null,
      high_school: form.value.high_school.trim() || null,
      selection_batch_id: selectionBatchId,
      enrollment_status: form.value.enrollment_status,
      intake_year: form.value.intake_year || null,
      photo: selectedPhoto.value,
    }

    if (isEditing.value && editingId.value) {
      await studentsApi.update(Number(editingId.value), payload)
      showSuccessToast('Student updated successfully.', toastUpdatedTitle.value)
    } else {
      await studentsApi.create(payload)
      showSuccessToast(toastCreated.value, toastCreatedTitle.value)
    }
    router.push(getTrackingRoute())
  } catch (error: any) {
    console.error('Error creating student:', error)
    const errorMessage = error?.response?.data?.message || error?.message || 'An error occurred while saving'
    showErrorToast(errorMessage, toastValidationTitle.value)
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push(getTrackingRoute())
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null

  if (!file) {
    selectedPhoto.value = null
    clearPhotoPreview()
    return
  }

  if (!allowedPhotoTypes.includes(file.type)) {
    showErrorToast('Student photo must be a JPG, PNG, or WEBP file.', toastValidationTitle.value)
    input.value = ''
    return
  }

  selectedPhoto.value = file
  clearPhotoPreview()
  photoPreviewUrl.value = URL.createObjectURL(file)
}

function clearSelectedPhoto() {
  selectedPhoto.value = null
  clearPhotoPreview()
  if (photoInput.value) {
    photoInput.value.value = ''
  }
}

function clearPhotoPreview() {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
    photoPreviewUrl.value = null
  }
}

function resolvePhotoUrl(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const apiOrigin = new URL(apiBase).origin

  if (path.startsWith('/storage/')) {
    return `${apiOrigin}${path}`
  }

  if (path.startsWith('storage/')) {
    return `${apiOrigin}/${path}`
  }

  return `${apiOrigin}/storage/${path.replace(/^\/+/, '')}`
}

function normalizeEnrollmentStatus(status: string): EnrollmentStatusOption {
  return (allowedStatuses as readonly string[]).includes(status) ? status as EnrollmentStatusOption : 'Pending'
}

function getTrackingRoute() {
  const query: Record<string, string> = {}

  ;['batch', 'status', 'search', 'page'].forEach((key) => {
    const value = route.query[key]
    if (typeof value === 'string' && value) {
      query[key] = value
    }
  })

  return { name: 'StudentTracking', query }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ST'
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
            Student ID <span class="text-red-400">{{ required }}</span>
          </label>
          <input
            v-model="form.student_id_no"
            type="text"
            placeholder="e.g. ST001"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelName }} <span class="text-red-400">{{ required }}</span>
          </label>
          <input
            v-model="form.full_name"
            type="text"
            placeholder="e.g. Jane Doe"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Gender <span class="text-red-400">{{ required }}</span>
          </label>
          <select
            v-model="form.gender"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Date of Birth
          </label>
          <input
            v-model="form.dob"
            type="date"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ labelEmail }}
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
            Province
          </label>
          <input
            v-model="form.province"
            type="text"
            placeholder="e.g. Phnom Penh"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            High School
          </label>
          <input
            v-model="form.high_school"
            type="text"
            placeholder="e.g. Lincoln High School"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Selection Batch <span class="text-red-400">{{ required }}</span>
          </label>
          <select
            v-model.number="form.selection_batch_id"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          >
            <option v-if="selectionBatches.length === 0" value="" disabled>
              No selection batches available
            </option>
            <option v-for="batch in selectionBatches" :key="batch.id" :value="batch.id">
              {{ batch.name }} ({{ batch.year }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Intake Year
          </label>
          <input
            v-model.number="form.intake_year"
            type="number"
            placeholder="e.g. 2025"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
            {{ labelStatus }}
          </label>
          <select
            v-model="form.enrollment_status"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="Pending">Pending</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Rejected">Rejected</option>
            <option value="Graduated">Graduated</option>
            <option value="Dropped">Dropped</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">
            Student Photo
          </label>
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-xl bg-blue-50 dark:bg-blue-500/10 overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                v-if="displayPhotoUrl"
                :src="displayPhotoUrl"
                alt="Student photo"
                class="w-full h-full object-cover"
              />
              <span v-else class="text-sm font-bold text-blue-600 dark:text-blue-300">
                {{ getInitials(form.full_name) }}
              </span>
            </div>
            <div class="flex-1 space-y-2">
              <input
                ref="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="handlePhotoChange"
                class="block w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-500/10 dark:file:text-blue-300"
              />
              <button
                v-if="selectedPhoto"
                type="button"
                @click="clearSelectedPhoto"
                class="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear selected photo
              </button>
            </div>
          </div>
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
          :disabled="isSaving || isLoading"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ isSaving ? saving : createLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
