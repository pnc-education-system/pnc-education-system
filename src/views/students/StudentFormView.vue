<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { studentsApi, type StudentFormPayload } from '@/services/api/students'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import WebcamCapture from '@/components/camera/WebcamCapture.vue'

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
const labelStatus = computed(() => t('student_form.label_status'))
const required = computed(() => t('student_form.required'))
const cancel = computed(() => t('student_form.cancel'))
const saving = computed(() => t('student_form.saving'))
const createLabel = computed(() =>
  isEditing.value ? t('student_form.update') : t('student_form.create'),
)
const toastCreated = computed(() => t('student_form.toast_created'))
const toastCreatedTitle = computed(() => t('student_form.toast_created_title'))
const toastUpdatedTitle = computed(() => t('student_form.toast_updated_title'))
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
  enrolled_at: '',
})

const selectionBatches = ref<SelectionBatch[]>([])
const isSaving = ref(false)
const isLoading = ref(false)
const selectedPhoto = ref<File | null>(null)
const existingPhotoPath = ref<string | null>(null)
const photoPreviewUrl = ref<string | null>(null)

const allowedStatuses = ['Pending', 'Enrolled', 'Rejected', 'Graduated', 'Dropped'] as const
type EnrollmentStatusOption = (typeof allowedStatuses)[number]

onMounted(async () => {
  isLoading.value = true

  const promises: Promise<void>[] = [
    selectionBatchesApi.list().then((batches) => {
      selectionBatches.value = batches
      if (batches.length > 0 && batches[0] && !isEditing.value) {
        form.value.selection_batch_id = batches[0].id
      }
    }).catch(() => {
      showErrorToast('Failed to load selection batches', 'Error')
    }),
  ]

  if (isEditing.value && editingId.value) {
    promises.push(
      studentsApi.get(Number(editingId.value)).then((student) => {
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
          enrolled_at: student.enrolled_at || '',
        }
        existingPhotoPath.value = student.photo_path || null
      }).catch(() => {
        showErrorToast('Failed to load student data', 'Error')
        router.push('/students')
      }),
    )
  }

  await Promise.all(promises)
  isLoading.value = false
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
      high_school: form.value.high_school.trim() || '',
      selection_batch_id: selectionBatchId,
      enrollment_status: form.value.enrollment_status,
      intake_year: form.value.intake_year || null,
      enrolled_at: form.value.enrolled_at || null,
    }

    if (isEditing.value && editingId.value) {
      const studentId = Number(editingId.value)
      await studentsApi.update(studentId, payload)
      if (selectedPhoto.value) {
        await studentsApi.uploadPhoto(studentId, selectedPhoto.value)
      }
      showSuccessToast('Student updated successfully.', toastUpdatedTitle.value)
    } else {
      const student = await studentsApi.create(payload)
      if (selectedPhoto.value) {
        await studentsApi.uploadPhoto(student.id, selectedPhoto.value)
      }
      showSuccessToast(toastCreated.value, toastCreatedTitle.value)
    }
    router.push(getTrackingRoute())
  } catch (error: unknown) {
    console.error('Error saving student:', error)
    const err = error as { response?: { data?: Record<string, unknown> }; message?: string } | null
    const data = err?.response?.data as Record<string, unknown> | undefined
    let errorMessage = 'An error occurred while saving'

    if (data) {
      const errBlock = data.error as Record<string, unknown> | undefined
      // Read field-level errors from wrapped format: { error: { message, errors: { field: [...] } } }
      if (errBlock?.errors && typeof errBlock.errors === 'object') {
        const all = Object.values(errBlock.errors as Record<string, string[]>).flat()
        if (all.length > 0) { errorMessage = all[0] }
      } else if (errBlock?.message) {
        errorMessage = errBlock.message as string
      } else if (data.message) {
        errorMessage = data.message as string
      }
    } else if (err?.message) {
      errorMessage = err.message
    }
    showErrorToast(errorMessage, toastValidationTitle.value)
  } finally {
    isSaving.value = false
  }
}

function goBack() {
  router.push(getTrackingRoute())
}

function clearSelectedPhoto() {
  selectedPhoto.value = null
  clearPhotoPreview()
}

function clearPhotoPreview() {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
    photoPreviewUrl.value = null
  }
}

function resolvePhotoUrl(path: string | null | undefined): string | null {
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

function onWebcamSave(blob: Blob | null): void {
  if (!blob) {
    clearSelectedPhoto()
    return
  }
  clearPhotoPreview()
  selectedPhoto.value = new File([blob], 'student-photo.jpg', { type: 'image/jpeg' })
  photoPreviewUrl.value = URL.createObjectURL(blob)
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

</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-[#0B1120] overflow-hidden">
    <!-- Top Bar -->
    <div class="flex items-center gap-3 px-6 h-14 shrink-0 bg-white dark:bg-[#131B2E] border-b border-gray-100 dark:border-gray-800">
      <button @click="goBack"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer shrink-0">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      </button>
      <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 min-w-0">
        <router-link to="/students" class="hover:text-gray-600 dark:hover:text-gray-300 transition-colors font-medium shrink-0">Students</router-link>
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        <span class="text-gray-700 dark:text-gray-200 font-semibold truncate">{{ isEditing ? 'Edit Student' : 'New Student' }}</span>
      </div>
      <div class="ml-auto flex items-center gap-3 shrink-0"></div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Form -->
      <div class="flex-1 overflow-y-auto">
        <div class="max-w-2xl mx-auto px-6 py-8">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{{ title }}</h1>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-6">{{ subtitle }}</p>

          <!-- Identity -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-1 h-5 bg-blue-500 rounded-full"></div>
              <div>
                <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Identity</span>
                <p class="text-[11px] text-gray-300 dark:text-gray-600">Primary identifiers</p>
              </div>
            </div>
            <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200/70 dark:border-gray-800 p-5 space-y-4">
              <div class="flex items-start gap-5">
                <div class="shrink-0">
                  <WebcamCapture :existing-photo-url="resolvePhotoUrl(existingPhotoPath)" @save="onWebcamSave" />
                </div>
                <div class="flex-1 space-y-4">
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Full Name <span class="text-red-400">*</span></label>
                    <input v-model="form.full_name" type="text" placeholder="e.g. Jane Doe" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Student ID <span class="text-red-400">*</span></label>
                      <input v-model="form.student_id_no" type="text" placeholder="e.g. ST001" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Gender <span class="text-red-400">*</span></label>
                      <select v-model="form.gender" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Contact -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-1 h-5 bg-emerald-500 rounded-full"></div>
              <div>
                <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Contact</span>
                <p class="text-[11px] text-gray-300 dark:text-gray-600">Personal contact information</p>
              </div>
            </div>
            <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200/70 dark:border-gray-800 p-5">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <input v-model="form.dob" type="date" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
                  <input v-model="form.phone" type="tel" placeholder="e.g. +855 12 345 678" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div class="col-span-2">
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input v-model="form.email" type="email" placeholder="e.g. jane@pnc.edu" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Province</label>
                  <input v-model="form.province" type="text" placeholder="e.g. Phnom Penh" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">High School</label>
                  <input v-model="form.high_school" type="text" placeholder="e.g. Lincoln High School" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
          </div>

          <!-- Enrollment -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-1 h-5 bg-amber-500 rounded-full"></div>
              <div>
                <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Enrollment</span>
                <p class="text-[11px] text-gray-300 dark:text-gray-600">Batch, status, and academic dates</p>
              </div>
            </div>
            <div class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200/70 dark:border-gray-800 p-5 space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Selection Batch <span class="text-red-400">*</span></label>
                <select v-model.number="form.selection_batch_id" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20">
                  <option v-if="selectionBatches.length === 0" value="" disabled>No selection batches available</option>
                  <option v-for="batch in selectionBatches" :key="batch.id" :value="batch.id">{{ batch.name }} ({{ batch.year }})</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Enrollment Status</label>
                  <select v-model="form.enrollment_status" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20">
                    <option v-for="s in allowedStatuses" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Intake Year</label>
                  <input v-model.number="form.intake_year" type="number" placeholder="e.g. 2025" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Enrolled Date</label>
                <input v-model="form.enrolled_at" type="date" class="w-full h-11 px-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Summary Panel -->
      <div class="hidden lg:flex w-80 xl:w-96 bg-white dark:bg-[#131B2E] border-l border-gray-100 dark:border-gray-800 flex-col shrink-0">
        <div class="h-14 flex items-center px-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Summary</span>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div class="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-700/50">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xl font-bold shrink-0">
                {{ form.full_name ? form.full_name.charAt(0).toUpperCase() : '?' }}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{{ form.full_name || 'Full Name' }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{{ form.student_id_no || 'ST—0000' }}</p>
              </div>
            </div>
            <div class="space-y-2.5 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-400 dark:text-gray-500">Gender</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ form.gender }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400 dark:text-gray-500">DOB</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ form.dob || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400 dark:text-gray-500">Batch</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ selectionBatches.find(b => b.id === form.selection_batch_id)?.name || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400 dark:text-gray-500">Status</span>
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ form.enrollment_status }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="p-6 border-t border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
          <button @click="handleSubmit" :disabled="isSaving || isLoading"
            class="w-full h-12 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2">
            <svg v-if="isSaving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            {{ isSaving ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student') }}
          </button>
          <button @click="goBack"
            class="w-full h-11 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer border border-gray-200/80 dark:border-gray-700/50">
            {{ cancel }}
          </button>
        </div>
      </div>

      <!-- Mobile Bottom Bar -->
      <div class="lg:hidden flex items-center gap-3 px-6 py-3 bg-white dark:bg-[#131B2E] border-t border-gray-100 dark:border-gray-800 shrink-0">
        <button @click="goBack"
          class="flex-1 h-11 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer border border-gray-200/80 dark:border-gray-700/50">
          {{ cancel }}
        </button>
        <button @click="handleSubmit" :disabled="isSaving || isLoading"
          class="flex-1 h-11 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-2">
          <svg v-if="isSaving" class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
          {{ isSaving ? 'Saving' : (isEditing ? 'Update' : 'Create') }}
        </button>
      </div>
    </div>
  </div>
</template>
