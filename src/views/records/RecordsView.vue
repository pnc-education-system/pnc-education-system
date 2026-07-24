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
  Download,
  Eye,
  FileDown,
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

// ── File Preview State ──
const showFilePreview = ref(false)
const previewAttachment = ref<StudentAttachment | null>(null)
const showImageError = ref(false)
const imageLoaded = ref(false)

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
    for (const attachment of record.attachments ?? []) {
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
  if (mimeType.includes('word')) return FileText
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return FileText
  return File
}

function isPreviewableImage(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'].includes(mimeType)
}

function isPreviewablePdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

function isOfficeDocument(mimeType: string): boolean {
  return [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ].includes(mimeType)
}

function getGoogleViewerUrl(fileUrl: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
}

function getFilePreviewUrl(attachment: StudentAttachment): string {
  const url = getAttachmentUrl(attachment)
  if (isOfficeDocument(attachment.mime_type)) {
    return getGoogleViewerUrl(url)
  }
  return url
}

function openFilePreview(attachment: StudentAttachment) {
  previewAttachment.value = attachment
  showFilePreview.value = true
  showImageError.value = false
  imageLoaded.value = false
}

function handleImageLoad() {
  imageLoaded.value = true
}

function handleImageError() {
  showImageError.value = true
  imageLoaded.value = true
}

function closeFilePreview() {
  showFilePreview.value = false
  previewAttachment.value = null
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
  return recordTypeColors[type] ?? {
    bg: '#F0FDF4',
    text: '#16A34A',
    dot: '#22C55E',
    label: 'General',
  }
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

function getApiErrorMessage(error: any, fallback: string): string {
  const data = error?.response?.data
  if (data) {
    // Handle ApiErrorEnvelopeMiddleware format: { error: { code, message, errors } }
    if (data.error?.message && typeof data.error.message === 'string') return data.error.message
    // Handle direct format: { message: "..." }
    if (data.message && typeof data.message === 'string') return data.message
    // Handle field-level errors from envelope
    const fieldErrors = data.error?.errors || data.errors
    if (fieldErrors && typeof fieldErrors === 'object') {
      const firstKey = Object.keys(fieldErrors)[0]
      if (firstKey) {
        const msgs = fieldErrors[firstKey]
        const msg = Array.isArray(msgs) ? msgs[0] : msgs
        if (msg) return `${firstKey}: ${msg}`
      }
    }
  }
  return error?.message || fallback
}    // ── Load Students ──
    async function loadStudents() {
        try {
            const result = await studentsApi.list(1, { per_page: 100 })
            students.value = result.data
            console.log('[RecordsView] Students loaded:', students.value.length, 'students. Selected student ID:', selectedStudentId.value)
            if (!selectedStudentId.value && students.value.length > 0 && students.value[0]) {
                selectedStudentId.value = students.value[0].id
            }
        } catch (error) {
            console.error('[RecordsView] Failed to load students:', error)
            setDemoStudents()
        }
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

const RECORDS_API_ENABLED = import.meta.env.VITE_RECORDS_API_ENABLED !== 'false'

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
      records.value = recordsResult.value.map(record => ({
        ...record,
        attachments: record.attachments ?? [],
      }))
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
  } catch (error) {
    console.error('Failed to load student records:', error)
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
        const currentRecord = records.value[idx]
        if (currentRecord) {
          records.value[idx] = {
            ...currentRecord,
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
        recorded_at: currentRecord.recorded_at || now,
      }
      const updated = await recordsApi.update(selectedStudentId.value, currentRecord.id, payload)
      const index = records.value.findIndex((r: StudentRecord) => r.id === currentRecord.id)
      if (index !== -1) {
        records.value[index] = { ...updated, attachments: updated.attachments ?? [] }
      }
      showSuccessToast(t('records.toast_updated'), t('records.toast_updated_title'))
    } else {
      const payload: CreateStudentRecordPayload = {
        student_id: Number(selectedStudentId.value),
        title: recordForm.value.title.trim(),
        description: recordForm.value.description.trim(),
        record_type: recordForm.value.record_type,
        recorded_by: authStore.user?.id ?? 1,
        recorded_at: now,
      }
      const created = await recordsApi.create(selectedStudentId.value, payload)
      records.value.unshift({ ...created, attachments: created.attachments ?? [] })
      showSuccessToast(t('records.toast_created'), t('records.toast_created_title'))
    }
    closeRecordForm()
    loadRecords()
  } catch (error: any) {
    const message = getApiErrorMessage(error, t('records.toast_save_error'))
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
    const message = getApiErrorMessage(error, 'Failed to delete record.')
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
    }        // ── API mode ──
        const uploaded = await recordsApi.uploadAttachment(selectedStudentId.value, {
            student_id: selectedStudentId.value,
            record_id: uploadingForRecordId.value,
            file: attachmentFile.value,
        })

        console.log('[RecordsView] Upload response:', JSON.stringify(uploaded, null, 2))
        console.log('[RecordsView] uploaded.record_id:', uploaded.record_id)

        if (uploaded.record_id) {
            const record = records.value.find((r: StudentRecord) => r.id === uploaded.record_id)
            if (record) {
                record.attachments = [...(record.attachments ?? []), uploaded]
            }
        } else {
            attachments.value.unshift(uploaded)
            console.log('[RecordsView] After unshift, attachments length:', attachments.value.length)
        }
        showSuccessToast(t('records.toast_attachment_uploaded'), t('records.toast_attachment_uploaded_title'))
        closeAttachmentUpload()
        await loadRecords()

        // Log state after loadRecords
        console.log('[RecordsView] After loadRecords — attachments count:', attachments.value.length)
        console.log('[RecordsView] After loadRecords — timeline items:', timelineItems.value.length)
        console.log('[RecordsView] After loadRecords — hasRecords:', hasRecords.value)
  } catch (error: any) {
    // Always extract the actual error message from the backend response
    // Axios errors are `Error` instances but their `.message` is just "Request failed with status code 500".
    // The real error is in the response body wrapped by ApiErrorEnvelopeMiddleware.
    const message = getApiErrorMessage(error, 'Failed to upload attachment.')
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
    const message = getApiErrorMessage(error, 'Failed to delete attachment.')
    showErrorToast(message, t('records.toast_error'))
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

onMounted(async () => {
  await loadStudents()
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
                  :class="{ 'shadow-md': expandedRecords.has(item.record!.id) }"
                >
                  <div
                    @click="toggleRecordExpand(item.record!.id)"
                    class="px-5 py-4 flex items-center justify-between cursor-pointer"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div
                        class="w-2 h-2 rounded-full flex-shrink-0"
                        :style="{ backgroundColor: getRecordTypeStyle(item.record!.record_type).dot }"
                      ></div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ item.record!.title }}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                            :style="{
                              backgroundColor: getRecordTypeStyle(item.record!.record_type).bg,
                              color: getRecordTypeStyle(item.record!.record_type).text
                            }"
                          >
                            {{ getRecordTypeStyle(item.record!.record_type).label }}
                          </span>
                          <span class="text-[11px] text-gray-400 dark:text-gray-500">
                            {{ formatDate(item.record!.recorded_at || item.record!.created_at) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        v-if="canManage"
                        @click.stop="openEditRecord(item.record!)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                        title="Edit record"
                      >
                        <Pencil :size="14" />
                      </button>
                      <button
                        v-if="canManage"
                        @click.stop="deleteRecord(item.record!)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Delete record"
                      >
                        <Trash2 :size="14" />
                      </button>
                      <button
                        @click.stop="toggleRecordExpand(item.record!.id)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <ChevronDown
                          :size="16"
                          class="transition-transform duration-200"
                          :class="{ 'rotate-180': expandedRecords.has(item.record!.id) }"
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
                    <div v-if="expandedRecords.has(item.record!.id)" class="border-t border-gray-100 dark:border-gray-800">
                      <div class="px-5 py-4 space-y-4">
                        <div v-if="item.record!.description" class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                          {{ item.record!.description }}
                        </div>

                        <div v-if="item.record!.attachments && item.record!.attachments.length > 0">
                          <div class="flex items-center gap-2 mb-2">
                            <Paperclip :size="14" class="text-gray-400" />
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Attachments ({{ item.record!.attachments.length }})
                            </span>
                          </div>
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div
                              v-for="att in item.record!.attachments"
                              :key="att.id"
                              @click="openFilePreview(att)"
                              class="flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800 group cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200"
                            >
                              <div class="w-9 h-9 rounded-lg bg-white dark:bg-gray-700/50 flex items-center justify-center shadow-sm flex-shrink-0">
                                <component :is="getFileIcon(att.mime_type)" :size="16" class="text-blue-500" />
                              </div>
                              <div class="min-w-0 flex-1">
                                <p class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{{ att.file_name }}</p>
                                <p class="text-[10px] text-gray-400 mt-0.5">{{ formatFileSize(att.file_size) }}</p>
                              </div>
                              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                                <button
                                  @click="openFilePreview(att)"
                                  class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 transition-all"
                                  title="Preview file"
                                >
                                  <Eye :size="14" />
                                </button>
                                <a
                                  :href="getAttachmentUrl(att)"
                                  target="_blank"
                                  class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:hover:text-gray-300 transition-all"
                                  title="Open in new tab"
                                >
                                  <ExternalLink :size="14" />
                                </a>
                                <button
                                  v-if="canManage"
                                  @click="deleteAttachment(att)"
                                  class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all"
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
                  @click="openFilePreview(item.attachment)"
                  class="bg-white dark:bg-[#131B2E] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all duration-200 group"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shadow-sm flex-shrink-0">
                      <component :is="getFileIcon(item.attachment.mime_type)" :size="18" class="text-amber-500" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{{ item.attachment.file_name }}</p>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[11px] text-gray-400">{{ formatFileSize(item.attachment.file_size) }}</span>
                        <span class="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                        <span class="text-[11px] text-gray-400">{{ formatDate(item.attachment.uploaded_at || item.attachment.created_at) }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
                      <button
                        @click="openFilePreview(item.attachment!)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all"
                        title="Preview file"
                      >
                        <Eye :size="15" />
                      </button>
                      <a
                        :href="getAttachmentUrl(item.attachment)"
                        target="_blank"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:hover:text-gray-300 transition-all"
                        title="Open in new tab"
                      >
                        <ExternalLink :size="14" />
                      </a>
                      <button
                        v-if="canManage"
                        @click="deleteAttachment(item.attachment)"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all"
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

    <!-- File Preview Modal -->
    <Teleport to="body">
      <div v-if="showFilePreview && previewAttachment" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="closeFilePreview"></div>
        <div
          class="relative bg-white dark:bg-[#0F1729] rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          @click.stop
        >
          <!-- Preview Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
                :class="isPreviewableImage(previewAttachment.mime_type)
                  ? 'bg-pink-50 dark:bg-pink-500/10'
                  : isPreviewablePdf(previewAttachment.mime_type)
                    ? 'bg-red-50 dark:bg-red-500/10'
                    : 'bg-blue-50 dark:bg-blue-500/10'"
              >
                <component
                  :is="getFileIcon(previewAttachment.mime_type)"
                  :size="20"
                  :class="isPreviewableImage(previewAttachment.mime_type)
                    ? 'text-pink-500'
                    : isPreviewablePdf(previewAttachment.mime_type)
                      ? 'text-red-500'
                      : 'text-blue-500'"
                />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ previewAttachment.file_name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ formatFileSize(previewAttachment.file_size) }}
                  ·
                  {{ isPreviewableImage(previewAttachment.mime_type) ? 'Image' : isPreviewablePdf(previewAttachment.mime_type) ? 'PDF Document' : 'File' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a
                :href="getAttachmentUrl(previewAttachment)"
                target="_blank"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <ExternalLink :size="13" />
                Open
              </a>
              <button
                @click="closeFilePreview"
                class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                <X :size="20" />
              </button>
            </div>
          </div>

          <!-- Preview Body (scrollable) -->
          <div class="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900/50 flex items-start justify-center p-4">
            <!-- Image Preview -->
            <div v-if="isPreviewableImage(previewAttachment.mime_type)" class="w-full flex justify-center">
              <!-- Loading skeleton -->
              <div
                v-if="!imageLoaded"
                class="w-full max-h-[70vh] min-h-[300px] rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center"
              >
                <Loader2 :size="32" class="text-gray-400 animate-spin" />
              </div>

              <!-- Error fallback -->
              <div
                v-if="showImageError"
                class="w-full max-h-[70vh] min-h-[300px] rounded-xl bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-3"
              >
                <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <FileDown :size="28" class="text-red-400" />
                </div>
                <div class="text-center">
                  <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Image failed to load</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">The image may have been moved or deleted.</p>
                </div>
                <a
                  :href="getAttachmentUrl(previewAttachment)"
                  target="_blank"
                  class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-all"
                >
                  <Download :size="14" />
                  Download File
                </a>
              </div>

              <!-- Actual image (hidden while loading or errored) -->
              <img
                v-show="imageLoaded && !showImageError"
                :src="getAttachmentUrl(previewAttachment)"
                :alt="previewAttachment.file_name"
                class="max-w-full max-h-[70vh] rounded-xl shadow-lg object-contain bg-white dark:bg-gray-800"
                @load="handleImageLoad"
                @error="handleImageError"
              />
            </div>

            <!-- PDF Preview -->
            <div v-else-if="isPreviewablePdf(previewAttachment.mime_type)" class="w-full flex justify-center">
              <iframe
                :src="getAttachmentUrl(previewAttachment)"
                class="w-full h-[70vh] rounded-xl shadow-lg bg-white"
                title="PDF Preview"
              ></iframe>
            </div>

            <!-- Office Document Preview (via Google Docs Viewer, when not localhost) -->
            <div v-else-if="isOfficeDocument(previewAttachment.mime_type)" class="w-full flex justify-center relative">
              <template v-if="!getAttachmentUrl(previewAttachment).includes('127.0.0.1') && !getAttachmentUrl(previewAttachment).includes('localhost')">
                <iframe
                  :src="getFilePreviewUrl(previewAttachment)"
                  class="w-full h-[70vh] rounded-xl shadow-lg bg-white"
                  title="Document Preview"
                ></iframe>
                <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <ExternalLink :size="12" />
                  Powered by Google Docs Viewer
                </div>
              </template>
              <!-- Localhost: open directly in new tab for native viewing -->
              <div v-else class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                  <ExternalLink :size="32" class="text-amber-500" />
                </div>
                <div class="text-center max-w-sm">
                  <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Open document to view</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Click below to open this document. Your browser or system will handle the file.
                  </p>
                </div>
                <a
                  :href="getAttachmentUrl(previewAttachment)"
                  target="_blank"
                  class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
                >
                  <ExternalLink :size="16" />
                  Open Document
                </a>
              </div>
            </div>

            <!-- Fallback for non-previewable files -->
            <div v-else class="flex flex-col items-center justify-center py-16 gap-4">
              <div class="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <FileDown :size="32" class="text-blue-500" />
              </div>
              <div class="text-center max-w-sm">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview not available</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This file type cannot be previewed in the browser. Download or open it to view the content.
                </p>
              </div>
              <a
                :href="getAttachmentUrl(previewAttachment)"
                target="_blank"
                class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20"
              >
                <Download :size="16" />
                Download File
              </a>
            </div>
          </div>

          <!-- Preview Footer -->
          <div class="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 flex-shrink-0">
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <File :size="12" />
                {{ previewAttachment.mime_type }}
              </span>
              <span class="flex items-center gap-1.5">
                <Calendar :size="12" />
                Uploaded {{ formatDate(previewAttachment.uploaded_at || previewAttachment.created_at) }}
              </span>
            </div>
            <a
              :href="getAttachmentUrl(previewAttachment)"
              :download="previewAttachment.file_name"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
            >
              <Download :size="13" />
              Download
            </a>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
