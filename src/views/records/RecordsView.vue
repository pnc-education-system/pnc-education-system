<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import { recordsApi, type CreateStudentRecordPayload, type UpdateStudentRecordPayload } from '@/services/api/records'
import { studentsApi } from '@/services/api/students'
import { useAuthStore } from '@/stores/auth'
import type { BackendStudent, StudentRecord, StudentAttachment } from '@/types'
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  Pencil,
  X,
  Paperclip,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  File,
  Image,
  FileType,
  Clock,
  User,
  Loader2,
} from 'lucide-vue-next'

defineOptions({ name: 'RecordsPage' })

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { showSuccessToast, showErrorToast } = useToast()
const authStore = useAuthStore()

const studentId = computed(() => {
  const raw = route.query.student_id
  if (Array.isArray(raw)) return raw[0] ? Number(raw[0]) : null
  if (typeof raw === 'string') return Number(raw)
  return null
})

const canManage = computed(() => authStore.hasPermission('records.manage') || authStore.hasPermission('students.edit'))

// ── Data ──
const students = ref<BackendStudent[]>([])
const selectedStudentId = ref<number | null>(studentId.value)
const records = ref<StudentRecord[]>([])
const attachments = ref<StudentAttachment[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)

// ── Computed ──
const selectedStudent = computed(() => students.value.find((s: BackendStudent) => s.id === selectedStudentId.value))

// ── UI State ──
const showRecordForm = ref(false)
const editingRecord = ref<StudentRecord | null>(null)
const showAttachmentUpload = ref(false)
const uploadingForRecordId = ref<number | null>(null)
const expandedRecords = ref<Set<number>>(new Set())

// ── Form ──
const recordForm = ref({
  title: '',
  description: '',
  record_type: 'general' as 'academic' | 'disciplinary' | 'medical' | 'general',
})
const attachmentFile = ref<File | null>(null)
const attachmentInput = ref<HTMLInputElement | null>(null)

const recordTypeOptions = [
  { value: 'academic' as const, label: t('records.type_academic') },
  { value: 'disciplinary' as const, label: t('records.type_disciplinary') },
  { value: 'medical' as const, label: t('records.type_medical') },
  { value: 'general' as const, label: t('records.type_general') },
]

const recordTypeColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  academic: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6', label: 'Academic' },
  disciplinary: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'Disciplinary' },
  medical: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6', label: 'Medical' },
  general: { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E', label: 'General' },
}

interface TimelineItem {
  id: string
  type: 'record' | 'attachment'
  date: string
  record?: StudentRecord
  attachment?: StudentAttachment
}

const timelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  // Add all records
  for (const record of records.value) {
    items.push({
      id: `record-${record.id}`,
      type: 'record',
      date: record.recorded_at || record.created_at,
      record,
    })
    // Add attachments nested under their record
    for (const attachment of record.attachments) {
      items.push({
        id: `attachment-${attachment.id}`,
        type: 'attachment',
        date: attachment.uploaded_at || attachment.created_at,
        attachment,
        record,
      })
    }
  }

  // Add orphan attachments (not linked to a specific record)
  for (const attachment of attachments.value) {
    const isAlreadyListed = items.some(i => i.id === `attachment-${attachment.id}`)
    if (!isAlreadyListed) {
      items.push({
        id: `attachment-${attachment.id}`,
        type: 'attachment',
        date: attachment.uploaded_at || attachment.created_at,
        attachment,
      })
    }
  }

  // Sort by date descending (newest first)
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const hasRecords = computed(() => records.value.length > 0 || attachments.value.length > 0)

// ── Helpers ──
function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.includes('pdf')) return FileType
  return File
}

function getAttachmentUrl(attachment: StudentAttachment): string {
  if (attachment.file_path.startsWith('blob:')) return attachment.file_path
  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const origin = new URL(apiBase).origin
  if (attachment.file_path.startsWith('/storage/')) return `${origin}${attachment.file_path}`
  if (attachment.file_path.startsWith('storage/')) return `${origin}/${attachment.file_path}`
  return `${origin}/storage/${attachment.file_path.replace(/^\/+/, '')}`
}

function getRecordTypeStyle(type: string) {
  return recordTypeColors[type] || recordTypeColors.general
}

function toggleRecordExpand(recordId: number) {
  const set = new Set(expandedRecords.value)
  if (set.has(recordId)) {
    set.delete(recordId)
  } else {
    set.add(recordId)
  }
  expandedRecords.value = set
}

// ── Load Students ──
function loadStudents() {
  setDemoStudents()
}

function setDemoStudents() {
  if (students.value.length > 0) return
  const now = new Date().toISOString()
  students.value = [
    {
      id: 101, student_id_no: 'P-001', full_name: 'Sokha Chea', gender: 'Male', dob: '2000-05-15',
      phone: '012-345-678', email: 'sokha.chea@example.com', province: 'Phnom Penh',
      selection_batch_id: 2022, selection_batch_name: 'Generation 2022', enrollment_status: 'enrolled',
      status: 'enrolled', created_at: now, updated_at: now,
    },
    {
      id: 102, student_id_no: 'P-002', full_name: 'Srey Mom', gender: 'Female', dob: '2001-03-20',
      phone: '012-345-679', email: 'srey.mom@example.com', province: 'Siem Reap',
      selection_batch_id: 2023, selection_batch_name: 'Generation 2023', enrollment_status: 'enrolled',
      status: 'enrolled', created_at: now, updated_at: now,
    },
    {
      id: 103, student_id_no: 'P-003', full_name: 'Rithy Prak', gender: 'Male', dob: '2000-11-08',
      phone: '012-345-680', email: 'rithy.prak@example.com', province: 'Battambang',
      selection_batch_id: 2023, selection_batch_name: 'Generation 2023', enrollment_status: 'enrolled',
      status: 'enrolled', created_at: now, updated_at: now,
    },
    {
      id: 104, student_id_no: 'P-004', full_name: 'Dara Kim', gender: 'Male', dob: '2001-07-12',
      phone: '012-345-681', email: 'dara.kim@example.com', province: 'Kampong Cham',
      selection_batch_id: 2024, selection_batch_name: 'Generation 2024', enrollment_status: 'pending',
      status: 'pending', created_at: now, updated_at: now,
    },
    {
      id: 105, student_id_no: 'P-005', full_name: 'Maly Heng', gender: 'Female', dob: '2000-09-25',
      phone: '012-345-682', email: 'maly.heng@example.com', province: 'Takeo',
      selection_batch_id: 2025, selection_batch_name: 'Generation 2025', enrollment_status: 'enrolled',
      status: 'enrolled', created_at: now, updated_at: now,
    },
  ]
  if (!selectedStudentId.value && students.value.length > 0 && students.value[0]) {
    selectedStudentId.value = students.value[0].id
  }
}

// Set to true when backend records/attachments API endpoints are implemented
const RECORDS_API_ENABLED = false

// Local ID counter for locally-created records and attachments
let nextLocalId = 1000

// Keep track of blob URLs so we can revoke them
// Keep track of blob URLs so we can revoke them on unmount
const blobUrls = ref<Set<string>>(new Set())

onUnmounted(() => {
  for (const url of blobUrls.value) {
    URL.revokeObjectURL(url)
  }
  blobUrls.value.clear()
})

// ── Demo Records ──
function getStudentDemoRecords(studentId: number): { records: StudentRecord[], attachments: StudentAttachment[] } {
  const now = new Date().toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  // Each student gets unique records based on their ID
  const studentDemoMap: Record<number, { title: string; desc: string; type: 'academic' | 'disciplinary' | 'medical' | 'general'; date: string }[]> = {
    101: [ // Sokha Chea
      { title: 'Midterm Examination Results', desc: 'Scored 85/100 on the midterm exam. Excellent performance in web development module.', type: 'academic', date: now },
      { title: 'Attendance Warning', desc: 'Late to class 3 times this month. Please improve punctuality.', type: 'disciplinary', date: weekAgo },
    ],
    102: [ // Srey Mom
      { title: 'Final Project Submission', desc: 'Submitted capstone project on E-commerce system. Received grade A.', type: 'academic', date: now },
      { title: 'Health Check Report', desc: 'Annual health checkup completed. All vitals normal.', type: 'medical', date: twoWeeksAgo },
    ],
    103: [ // Rithy Prak
      { title: 'Scholarship Application', desc: 'Applied for academic scholarship. GPA 3.8 - qualifies for full scholarship.', type: 'academic', date: now },
      { title: 'Library Fine Notice', desc: 'Overdue books returned. Fine of $5.50 paid on 2025-01-15.', type: 'general', date: monthAgo },
      { title: 'Sports Day Participation', desc: 'Represented the department in annual sports day. Won 2nd place in 100m sprint.', type: 'general', date: twoWeeksAgo },
    ],
    104: [ // Dara Kim
      { title: 'Enrollment Confirmation', desc: 'Successfully enrolled in Web Development track for academic year 2024-2025.', type: 'academic', date: now },
    ],
    105: [ // Maly Heng
      { title: 'Internship Placement', desc: 'Placed at ABC Tech Company for 3-month internship starting June 2025.', type: 'academic', date: now },
      { title: 'Medical Leave Request', desc: 'Approved for 2-week medical leave due to recovery from surgery.', type: 'medical', date: weekAgo },
      { title: 'Outstanding Student Award', desc: 'Awarded Outstanding Student of the Year 2024-2025.', type: 'general', date: twoWeeksAgo },
    ],
  }

  const recordsFromStudent = studentDemoMap[studentId]
  if (!recordsFromStudent) {
    return {
      records: [{
        id: nextLocalId++, student_id: studentId, title: 'General Record',
        description: 'Basic student record entry.', record_type: 'general',
        recorded_by: 1, recorded_at: now, created_at: now, updated_at: now, attachments: [],
      }],
      attachments: [],
    }
  }

  const records: StudentRecord[] = recordsFromStudent.map((r, i) => ({
    id: nextLocalId++,
    student_id: studentId,
    title: r.title,
    description: r.desc,
    record_type: r.type,
    recorded_by: 1,
    recorded_at: r.date,
    created_at: r.date,
    updated_at: r.date,
    attachments: [],
  }))

  return { records, attachments: [] }
}

// ── Load Records ──
async function loadRecords() {
  if (!selectedStudentId.value) {
    records.value = []
    attachments.value = []
    return
  }

  // Skip API calls entirely if backend endpoints aren't ready yet
  if (!RECORDS_API_ENABLED) {
    // If switching to a different student, reset to load their records
    if (records.value.length > 0 && records.value[0]?.student_id !== selectedStudentId.value) {
      records.value = []
      attachments.value = []
    }
    // Set demo data for the current student
    if (records.value.length === 0 && attachments.value.length === 0) {
      const studentRecs = getStudentDemoRecords(selectedStudentId.value)
      records.value = studentRecs.records
      attachments.value = studentRecs.attachments
    }
    return
  }

  isLoading.value = true
  try {
    const [recordsResult, attachmentsResult] = await Promise.allSettled([
      recordsApi.list(selectedStudentId.value),
      recordsApi.listAttachments(selectedStudentId.value),
    ])

    if (recordsResult.status === 'fulfilled') {
      records.value = recordsResult.value
    } else {
      const err = recordsResult.reason
      if (err?.response?.status !== 404) {
        console.error('Failed to load records:', err)
        showErrorToast(t('records.toast_load_failed'), t('records.toast_error'))
      }
    }

    if (attachmentsResult.status === 'fulfilled') {
      attachments.value = attachmentsResult.value
    } else {
      const err = attachmentsResult.reason
      if (err?.response?.status !== 404) {
        console.error('Failed to load attachments:', err)
      }
    }
  } finally {
    isLoading.value = false
  }
}

watch(selectedStudentId, () => {
  loadRecords()
  router.replace({ query: { ...route.query, student_id: selectedStudentId.value ?? undefined } })
})

watch(() => route.query.student_id, (val) => {
  const id = val ? Number(val) : null
  if (id && id !== selectedStudentId.value) {
    selectedStudentId.value = id
  }
})

// ── CRUD ──
function openAddRecord() {
  editingRecord.value = null
  recordForm.value = {
    title: '',
    description: '',
    record_type: 'general',
  }
  showRecordForm.value = true
}

function openEditRecord(record: StudentRecord) {
  editingRecord.value = record
  recordForm.value = {
    title: record.title,
    description: record.description,
    record_type: record.record_type,
  }
  showRecordForm.value = true
}

function closeRecordForm() {
  showRecordForm.value = false
  editingRecord.value = null
  recordForm.value = { title: '', description: '', record_type: 'general' }
}

async function submitRecordForm() {
  if (!selectedStudentId.value) {
    showErrorToast('Please select a student first.', t('records.toast_validation_title'))
    return
  }
  if (!recordForm.value.title.trim()) {
    showErrorToast(t('records.toast_validation'), t('records.toast_validation_title'))
    return
  }

  isSaving.value = true
  try {
    const now = new Date().toISOString()

    if (!RECORDS_API_ENABLED) {
      // ── Local mode (no backend) ──
      if (editingRecord.value) {
        const idx = records.value.findIndex((r: StudentRecord) => r.id === editingRecord.value!.id)
        if (idx !== -1) {
          records.value[idx] = {
            ...records.value[idx],
            title: recordForm.value.title.trim(),
            description: recordForm.value.description.trim(),
            record_type: recordForm.value.record_type,
            updated_at: now,
          }
        }
        showSuccessToast(t('records.toast_updated'), t('records.toast_updated_title'))
      } else {
        const newRecord: StudentRecord = {
          id: nextLocalId++,
          student_id: selectedStudentId.value,
          title: recordForm.value.title.trim(),
          description: recordForm.value.description.trim(),
          record_type: recordForm.value.record_type,
          recorded_by: 1,
          recorded_at: now,
          created_at: now,
          updated_at: now,
          attachments: [],
        }
        records.value.unshift(newRecord)
        showSuccessToast(t('records.toast_created'), t('records.toast_created_title'))
      }
      closeRecordForm()
      return
    }

    // ── API mode ──
    if (editingRecord.value) {
      const currentRecord = editingRecord.value
      const payload: UpdateStudentRecordPayload = {
        title: recordForm.value.title.trim(),
        description: recordForm.value.description.trim(),
        record_type: recordForm.value.record_type,
      }
      const updated = await recordsApi.update(selectedStudentId.value, currentRecord.id, payload)
      const index = records.value.findIndex((r: StudentRecord) => r.id === currentRecord.id)
      if (index !== -1) {
        records.value[index] = updated
      }
      showSuccessToast(t('records.toast_updated'), t('records.toast_updated_title'))
    } else {
      const payload: CreateStudentRecordPayload = {
        student_id: selectedStudentId.value,
        title: recordForm.value.title.trim(),
        description: recordForm.value.description.trim(),
        record_type: recordForm.value.record_type,
      }
      const created = await recordsApi.create(selectedStudentId.value, payload)
      records.value.unshift(created)
      showSuccessToast(t('records.toast_created'), t('records.toast_created_title'))
    }
    closeRecordForm()
    loadRecords()
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || t('records.toast_save_error')
    showErrorToast(message, t('records.toast_error'))
  } finally {
    isSaving.value = false
  }
}

function removeLocalAttachment(attachment: StudentAttachment) {
  if (attachment.file_path.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.file_path)
    blobUrls.value.delete(attachment.file_path)
  }

  // Try removing from record attachments first
  if (attachment.record_id) {
    const record = records.value.find((r: StudentRecord) => r.id === attachment.record_id)
    if (record && record.attachments) {
      record.attachments = record.attachments.filter((a: StudentAttachment) => a.id !== attachment.id)
    }
  }

  // Also remove from orphan attachments if present
  attachments.value = attachments.value.filter((a: StudentAttachment) => a.id !== attachment.id)
}

async function deleteRecord(record: StudentRecord) {
  if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return

  if (!RECORDS_API_ENABLED) {
    // ── Local mode ──
    // Revoke blob URLs for any attachments
    if (record.attachments) {
      for (const att of record.attachments) {
        if (att.file_path.startsWith('blob:')) {
          URL.revokeObjectURL(att.file_path)
          blobUrls.value.delete(att.file_path)
        }
      }
    }
    records.value = records.value.filter((r: StudentRecord) => r.id !== record.id)
    showSuccessToast(t('records.toast_deleted'), t('records.toast_deleted_title'))
    return
  }

  // ── API mode ──
  try {
    await recordsApi.delete(selectedStudentId.value!, record.id)
    records.value = records.value.filter((r: StudentRecord) => r.id !== record.id)
    showSuccessToast(t('records.toast_deleted'), t('records.toast_deleted_title'))
    loadRecords()
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || 'Failed to delete record.'
    showErrorToast(message, t('records.toast_error'))
  }
}

// ── Attachments ──
function openAttachmentUpload(recordId?: number) {
  uploadingForRecordId.value = recordId ?? null
  attachmentFile.value = null
  showAttachmentUpload.value = true
  nextTick(() => {
    if (attachmentInput.value) attachmentInput.value.value = ''
  })
}

function closeAttachmentUpload() {
  showAttachmentUpload.value = false
  uploadingForRecordId.value = null
  attachmentFile.value = null
  nextTick(() => {
    if (attachmentInput.value) attachmentInput.value.value = ''
  })
}

function handleAttachmentChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  attachmentFile.value = file
}

async function submitAttachmentUpload() {
  if (!selectedStudentId.value) {
    showErrorToast('Please select a student first.', t('records.toast_validation_title'))
    return
  }
  if (!attachmentFile.value) {
    showErrorToast('Please select a file to upload.', t('records.toast_validation_title'))
    return
  }

  isUploading.value = true
  try {
    const now = new Date().toISOString()

    if (!RECORDS_API_ENABLED) {
      // ── Local mode (no backend) ──
      const blobUrl = URL.createObjectURL(attachmentFile.value)
      blobUrls.value.add(blobUrl)

      const newAttachment: StudentAttachment = {
        id: nextLocalId++,
        student_id: selectedStudentId.value,
        record_id: uploadingForRecordId.value,
        file_name: attachmentFile.value.name,
        file_path: blobUrl,
        file_size: attachmentFile.value.size,
        mime_type: attachmentFile.value.type || 'application/octet-stream',
        uploaded_by: 1,
        uploaded_at: now,
        created_at: now,
        updated_at: now,
      }

      if (uploadingForRecordId.value) {
        // Attach to a specific record
        const record = records.value.find((r: StudentRecord) => r.id === uploadingForRecordId.value)
        if (record) {
          if (!record.attachments) {
            record.attachments = []
          }
          record.attachments.push(newAttachment)
        }
      } else {
        // Orphan attachment (not linked to a record)
        attachments.value.push(newAttachment)
      }

      showSuccessToast(t('records.toast_attachment_uploaded'), t('records.toast_attachment_uploaded_title'))
      closeAttachmentUpload()
      return
    }

    // ── API mode ──
    await recordsApi.uploadAttachment(selectedStudentId.value, {
      student_id: selectedStudentId.value,
      record_id: uploadingForRecordId.value,
      file: attachmentFile.value,
    })
    showSuccessToast(t('records.toast_attachment_uploaded'), t('records.toast_attachment_uploaded_title'))
    closeAttachmentUpload()
    loadRecords()
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || 'Failed to upload attachment.'
    showErrorToast(message, t('records.toast_error'))
  } finally {
    isUploading.value = false
  }
}

async function deleteAttachment(attachment: StudentAttachment) {
  if (!confirm('Are you sure you want to delete this attachment?')) return

  if (!RECORDS_API_ENABLED) {
    // ── Local mode ──
    removeLocalAttachment(attachment)
    showSuccessToast(t('records.toast_attachment_deleted'), t('records.toast_attachment_deleted_title'))
    return
  }

  // ── API mode ──
  try {
    await recordsApi.deleteAttachment(selectedStudentId.value!, attachment.id)
    showSuccessToast(t('records.toast_attachment_deleted'), t('records.toast_attachment_deleted_title'))
    loadRecords()
  } catch (error: any) {
    const message = error?.response?.data?.message || error?.message || 'Failed to delete attachment.'
    showErrorToast(message, t('records.toast_error'))
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

onMounted(() => {
  loadStudents()
  if (selectedStudentId.value) {
    loadRecords()
  }
})
</script>

<template>
  <div class="min-h-screen" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <div class="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <button
            @click="router.push('/students/tracking')"
            class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ t('records.title') }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {{ t('records.subtitle') }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="canManage"
            @click="openAttachmentUpload()"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
          >
            <Upload :size="16" />
            Upload
          </button>
          <button
            v-if="canManage && selectedStudentId"
            @click="openAddRecord"
            class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus :size="16" />
            {{ t('records.add_record_btn') }}
          </button>
        </div>
      </div>

      <!-- Student Selector -->
      <div class="relative max-w-md">
        <User :size="16" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <select
          v-model="selectedStudentId"
          class="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
        >
          <option :value="null" disabled>{{ t('records.select_student') }}</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.full_name }} ({{ student.student_id_no }})
          </option>
        </select>
        <ChevronDown :size="16" class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      <!-- Records Section (shown when a student is selected) -->
      <template v-if="selectedStudentId">
        <!-- Student Info Bar -->
        <div
          v-if="selectedStudent"
          class="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20"
        >
          <div class="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-white">{{ getInitials(selectedStudent.full_name) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selectedStudent.full_name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ selectedStudent.student_id_no }} · {{ selectedStudent.selection_batch_name || '—' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="canManage"
              @click="openAttachmentUpload()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              <Upload :size="12" />
              Upload
            </button>
            <button
              v-if="canManage"
              @click="openAddRecord"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-all cursor-pointer"
            >
              <Plus :size="12" />
              Add Record
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 :size="28" class="text-blue-500 animate-spin" />
          <p class="text-sm text-gray-500 dark:text-gray-400">Loading records...</p>
        </div>

        <!-- Empty Records State -->
        <div v-else-if="!hasRecords" class="flex flex-col items-center justify-center py-12 gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FileText :size="24" class="text-gray-300 dark:text-gray-600" />
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-400">{{ t('records.no_records') }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Add the first record or upload an attachment.</p>
          </div>
          <button
            v-if="canManage"
            @click="openAddRecord"
            class="mt-1 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus :size="14" />
            {{ t('records.add_first') }}
          </button>
        </div>

        <!-- Timeline View -->
        <div v-else class="space-y-4">
          <div class="flex items-center gap-2">
            <Clock :size="16" class="text-gray-400" />
            <span class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Timeline · {{ timelineItems.length }} {{ timelineItems.length === 1 ? 'entry' : 'entries' }}
            </span>
          </div>

          <div class="relative">
            <div class="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

            <div class="space-y-4">
              <div
                v-for="item in timelineItems"
                :key="item.id"
                class="relative pl-12"
              >
                <div
                  class="absolute left-3 top-4 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 shadow-sm z-10"
                  :class="item.type === 'record' ? 'bg-blue-500' : 'bg-amber-500'"
                ></div>

                <!-- Record Card -->
                <div
                  v-if="item.type === 'record' && item.record"
                  class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700"
                  :class="{ 'shadow-md': expandedRecords.has(item.record.id) }"
                >
                  <div
                    @click="toggleRecordExpand(item.record.id)"
                    class="px-5 py-4 flex items-center justify-between cursor-pointer"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: getRecordTypeStyle(item.record.record_type).dot }"
                      ></div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ item.record.title }}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                            :style="{
                              backgroundColor: getRecordTypeStyle(item.record.record_type).bg,
                              color: getRecordTypeStyle(item.record.record_type).text
                            }"
                          >
                            {{ getRecordTypeStyle(item.record.record_type).label }}
                          </span>
                          <span class="text-[11px] text-gray-400 dark:text-gray-500">
                            {{ formatDate(item.record.recorded_at || item.record.created_at) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        v-if="canManage"
                        @click.stop="openEditRecord(item.record)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        title="Edit record"
                      >
                        <Pencil :size="14" />
                      </button>
                      <button
                        v-if="canManage"
                        @click.stop="deleteRecord(item.record)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Delete record"
                      >
                        <Trash2 :size="14" />
                      </button>
                      <button
                        @click.stop="toggleRecordExpand(item.record.id)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <ChevronDown
                          :size="16"
                          class="transition-transform duration-200"
                          :class="{ 'rotate-180': expandedRecords.has(item.record.id) }"
                        />
                      </button>
                    </div>
                  </div>

                  <transition
                    enter-active-class="transition-all duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[1000px]"
                    leave-active-class="transition-all duration-150 ease-in"
                    leave-from-class="opacity-100 max-h-[1000px]"
                    leave-to-class="opacity-0 max-h-0"
                  >
                    <div v-if="expandedRecords.has(item.record.id)" class="border-t border-gray-100 dark:border-gray-800">
                      <div class="px-5 py-4 space-y-4">
                        <div v-if="item.record.description" class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                          {{ item.record.description }}
                        </div>

                        <div v-if="item.record.attachments && item.record.attachments.length > 0">
                          <div class="flex items-center gap-2 mb-2">
                            <Paperclip :size="14" class="text-gray-400" />
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Attachments ({{ item.record.attachments.length }})
                            </span>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div
                              v-for="att in item.record.attachments"
                              :key="att.id"
                              class="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800 group"
                            >
                              <component :is="getFileIcon(att.mime_type)" :size="18" class="text-gray-400 flex-shrink-0" />
                              <div class="min-w-0 flex-1">
                                <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ att.file_name }}</p>
                                <p class="text-[10px] text-gray-400">{{ formatFileSize(att.file_size) }}</p>
                              </div>
                              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  :href="getAttachmentUrl(att)"
                                  target="_blank"
                                  class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                                  title="Open file"
                                >
                                  <ExternalLink :size="14" />
                                </a>
                                <button
                                  v-if="canManage"
                                  @click="deleteAttachment(att)"
                                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                  title="Delete attachment"
                                >
                                  <Trash2 :size="14" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          v-if="canManage"
                          @click.stop="openAttachmentUpload(item.record!.id)"
                          class="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Upload :size="12" />
                          Upload attachment
                        </button>
                      </div>
                    </div>
                  </transition>
                </div>

                <!-- Attachment Card (orphan) -->
                <div
                  v-if="item.type === 'attachment' && item.attachment && !item.record"
                  class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden px-5 py-4"
                >
                  <div class="flex items-center gap-3">
                    <component :is="getFileIcon(item.attachment.mime_type)" :size="20" class="text-amber-500 flex-shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ item.attachment.file_name }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[11px] text-gray-400">{{ formatFileSize(item.attachment.file_size) }}</span>
                        <span class="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                        <span class="text-[11px] text-gray-400">{{ formatDate(item.attachment.uploaded_at || item.attachment.created_at) }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <a
                        :href="getAttachmentUrl(item.attachment)"
                        target="_blank"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        title="Open file"
                      >
                        <ExternalLink :size="14" />
                      </a>
                      <button
                        v-if="canManage"
                        @click="deleteAttachment(item.attachment)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Delete attachment"
                      >
                        <Trash2 :size="14" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Add/Edit Record Modal -->
    <Teleport to="body">
      <div v-if="showRecordForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeRecordForm"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-lg w-full p-6">
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ editingRecord ? t('records.edit_record') : t('records.add_record') }}
              </h3>
              <p v-if="selectedStudent" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                for {{ selectedStudent.full_name }}
              </p>
            </div>
            <button
              @click="closeRecordForm"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
            >
              <X :size="20" />
            </button>
          </div>

          <!-- Form -->
          <div class="space-y-4">
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {{ t('records.title_label') }}
              </label>
              <input
                v-model="recordForm.title"
                type="text"
                placeholder="e.g. Midterm Exam Results"
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <!-- Record Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {{ t('records.record_type') }}
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="opt in recordTypeOptions"
                  :key="opt.value"
                  @click="recordForm.record_type = opt.value"
                  class="px-4 py-2.5 text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer text-center"
                  :class="recordForm.record_type === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {{ t('records.description') }}
              </label>
              <textarea
                v-model="recordForm.description"
                rows="4"
                placeholder="Add any notes or details about this record..."
                class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="closeRecordForm"
              :disabled="isSaving"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ t('records.cancel') }}
            </button>
            <button
              @click="submitRecordForm"
              :disabled="isSaving || !recordForm.title.trim()"
              class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
            >
              <Loader2 v-if="isSaving" :size="14" class="animate-spin" />
              {{ isSaving ? t('records.saving') : (editingRecord ? t('records.update_record') : t('records.add_record_btn')) }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Upload Attachment Modal -->
    <Teleport to="body">
      <div v-if="showAttachmentUpload" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeAttachmentUpload"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('records.upload_attachment') }}</h3>
              <p v-if="selectedStudent" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                for {{ selectedStudent.full_name }}
              </p>
            </div>
            <button
              @click="closeAttachmentUpload"
              class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
            >
              <X :size="20" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- File Selection -->
            <div
              class="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors duration-200 cursor-pointer"
              @click="attachmentInput?.click()"
            >
              <input
                ref="attachmentInput"
                type="file"
                class="hidden"
                @change="handleAttachmentChange"
              />
              <div v-if="!attachmentFile" class="flex flex-col items-center gap-2">
                <Upload :size="32" class="text-gray-300 dark:text-gray-600" />
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">{{ t('records.select_file') }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">Click to browse or drag & drop</p>
              </div>
              <div v-else class="flex flex-col items-center gap-2">
                <File :size="32" class="text-blue-500" />
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ attachmentFile.name }}</p>
                <p class="text-xs text-gray-400">{{ formatFileSize(attachmentFile.size) }}</p>
                <button
                  @click.stop="attachmentFile = null; if(attachmentInput) attachmentInput.value = ''"
                  class="text-xs text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                >
                  Remove file
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="closeAttachmentUpload"
              :disabled="isUploading"
              class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ t('records.cancel') }}
            </button>
            <button
              @click="submitAttachmentUpload"
              :disabled="isUploading || !attachmentFile"
              class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2"
            >
              <Loader2 v-if="isUploading" :size="14" class="animate-spin" />
              {{ isUploading ? t('records.uploading') : t('records.upload_attachment') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
