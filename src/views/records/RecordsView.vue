<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import { usePolling } from '@/composables/usePolling'
import { recordsApi, type CreateStudentRecordPayload, type UpdateStudentRecordPayload } from '@/services/api/records'
import { studentsApi } from '@/services/api/students'
import { useAuthStore } from '@/stores/auth'
import { resolvePhotoUrl } from '@/utils/photoUrl'
import type { BackendStudent, StudentRecord, StudentAttachment } from '@/types'
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  Pencil,
  X,
  Paperclip,
  ChevronDown,
  ChevronRight,
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
  Search,
  Calendar,
  ArrowUpDown,
  MoreHorizontal,
  ChevronLeft,
  BookOpen,
  Paperclip as PaperclipIcon,
  RefreshCw,
  Activity,
  GraduationCap,
  Phone,
  Hash,
  Layers,
  AlertTriangle,
  HeartPulse,
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

// ── Confirm Delete Modal ──
const showConfirmDelete = ref(false)
const confirmDeleteMessage = ref('')
const confirmDeleteIsRecord = ref(false)
const confirmDeleteTarget = ref<StudentRecord | StudentAttachment | null>(null)
const isConfirmDeleting = ref(false)

// ── File Preview State ──
const showFilePreview = ref(false)
const previewAttachment = ref<StudentAttachment | null>(null)
const showImageError = ref(false)
const imageLoaded = ref(false)

// ── Filters & Search ──
const searchQuery = ref('')
const categoryFilter = ref('all')
const dateFilter = ref('')
const createdByFilter = ref('')
const sortBy = ref('newest')

// ── Pagination ──
const currentPage = ref(1)
const perPage = ref(5)

// ── Inline New Record Form ──
const inlineForm = ref({
  title: '',
  description: '',
  record_type: 'general' as 'academic' | 'disciplinary' | 'medical' | 'general',
  recorded_at: new Date().toISOString().split('T')[0],
})
const inlineAttachmentFile = ref<File | null>(null)
const inlineAttachmentInput = ref<HTMLInputElement | null>(null)
const showInlineForm = ref(true)

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

const categoryFilterOptions = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'academic', label: 'Academic', icon: GraduationCap },
  { value: 'medical', label: 'Medical', icon: HeartPulse },
  { value: 'disciplinary', label: 'Behavior', icon: AlertTriangle },
  { value: 'general', label: 'General', icon: FileText },
]

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
]

const recordTypeColors: Record<string, { bg: string; text: string; dot: string; label: string; icon: any }> = {
  academic: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6', label: 'Academic', icon: GraduationCap },
  disciplinary: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444', label: 'Disciplinary', icon: AlertTriangle },
  medical: { bg: '#F5F3FF', text: '#7C3AED', dot: '#8B5CF6', label: 'Medical', icon: HeartPulse },
  general: { bg: '#F0FDF4', text: '#16A34A', dot: '#22C55E', label: 'General', icon: FileText },
}

interface TimelineItem {
  id: string
  type: 'record' | 'attachment'
  date: string
  record?: StudentRecord
  attachment?: StudentAttachment
}

const allTimelineItems = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []

  for (const record of records.value) {
    items.push({
      id: `record-${record.id}`,
      type: 'record',
      date: record.recorded_at || record.created_at,
      record,
    })
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

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// Filtered and sorted timeline items
const filteredTimelineItems = computed(() => {
  let items = [...allTimelineItems.value]

  // Category filter
  if (categoryFilter.value !== 'all') {
    items = items.filter(item => {
      if (item.type === 'record' && item.record) {
        return item.record.record_type === categoryFilter.value
      }
      return false
    })
  }

  // Search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(item => {
      if (item.type === 'record' && item.record) {
        return item.record.title.toLowerCase().includes(q) || item.record.description.toLowerCase().includes(q)
      }
      if (item.attachment) {
        return item.attachment.file_name.toLowerCase().includes(q)
      }
      return false
    })
  }

  // Sort
  switch (sortBy.value) {
    case 'oldest':
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      break
    case 'title_asc':
      items.sort((a, b) => {
        const titleA = a.record?.title || a.attachment?.file_name || ''
        const titleB = b.record?.title || b.attachment?.file_name || ''
        return titleA.localeCompare(titleB)
      })
      break
    case 'title_desc':
      items.sort((a, b) => {
        const titleA = a.record?.title || a.attachment?.file_name || ''
        const titleB = b.record?.title || b.attachment?.file_name || ''
        return titleB.localeCompare(titleA)
      })
      break
    default: // newest
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  return items
})

// Paginated items
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredTimelineItems.value.slice(start, start + perPage.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTimelineItems.value.length / perPage.value)))

const hasRecords = computed(() => records.value.length > 0 || attachments.value.length > 0)

// Student Stats
const totalRecords = computed(() => records.value.length)
const totalAttachments = computed(() => {
  let count = attachments.value.length
  for (const record of records.value) {
    count += record.attachments?.length || 0
  }
  return count
})
const lastUpdatedDate = computed(() => {
  if (allTimelineItems.value.length === 0) return 'N/A'
  return formatDate(allTimelineItems.value[0].date)
})
const recentActivity = computed(() => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).getTime()
  return allTimelineItems.value.filter(item => new Date(item.date).getTime() > sevenDaysAgo).length
})

// Watch pagination reset on filter change
watch([categoryFilter, searchQuery, sortBy], () => {
  currentPage.value = 1
})

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

function getDateGroupLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfDay.getTime() - 86400000)
  const startOfWeek = new Date(startOfDay.getTime() - startOfDay.getDay() * 86400000)
  const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  if (d.getTime() >= startOfDay.getTime()) return 'Today'
  if (d.getTime() >= startOfYesterday.getTime() && d.getTime() < startOfDay.getTime()) return 'Yesterday'
  if (d.getTime() >= startOfWeek.getTime()) return 'This Week'
  if (d.getTime() >= startOfLastWeek.getTime()) return 'Last Week'
  if (d.getTime() >= startOfMonth.getTime()) return 'This Month'

  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

const timelineGroups = computed(() => {
  const groups: { label: string; items: TimelineItem[] }[] = []
  const map = new Map<string, TimelineItem[]>()

  for (const item of paginatedItems.value) {
    const label = getDateGroupLabel(item.date)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(item)
  }

  const order = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month']
  for (const key of order) {
    if (map.has(key)) {
      groups.push({ label: key, items: map.get(key)! })
      map.delete(key)
    }
  }
  for (const [label, items] of map) {
    groups.push({ label, items })
  }

  return groups
})

function formatDateOnly(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', {
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
  const style = recordTypeColors[type]
  if (style) {
    return {
      bg: style.bg,
      text: style.text,
      dot: style.dot,
      label: style.label,
      icon: style.icon,
    }
  }
  return {
    bg: '#F0FDF4',
    text: '#16A34A',
    dot: '#22C55E',
    label: 'General',
    icon: FileText,
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
}

// ── Load Students ──
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
    { id: 101, student_id_no: 'P-001', full_name: 'Sokha Chea', gender: 'Male', dob: '2000-05-15', phone: '012-345-678', email: 'sokha.chea@example.com', province: 'Phnom Penh', selection_batch_id: 2022, selection_batch_name: 'Generation 2022', enrollment_status: 'enrolled', status: 'enrolled', created_at: now, updated_at: now },
    { id: 102, student_id_no: 'P-002', full_name: 'Srey Mom', gender: 'Female', dob: '2001-03-20', phone: '012-345-679', email: 'srey.mom@example.com', province: 'Siem Reap', selection_batch_id: 2023, selection_batch_name: 'Generation 2023', enrollment_status: 'enrolled', status: 'enrolled', created_at: now, updated_at: now },
    { id: 103, student_id_no: 'P-003', full_name: 'Rithy Prak', gender: 'Male', dob: '2000-11-08', phone: '012-345-680', email: 'rithy.prak@example.com', province: 'Battambang', selection_batch_id: 2023, selection_batch_name: 'Generation 2023', enrollment_status: 'enrolled', status: 'enrolled', created_at: now, updated_at: now },
    { id: 104, student_id_no: 'P-004', full_name: 'Dara Kim', gender: 'Male', dob: '2001-07-12', phone: '012-345-681', email: 'dara.kim@example.com', province: 'Kampong Cham', selection_batch_id: 2024, selection_batch_name: 'Generation 2024', enrollment_status: 'pending', status: 'pending', created_at: now, updated_at: now },
    { id: 105, student_id_no: 'P-005', full_name: 'Maly Heng', gender: 'Female', dob: '2000-09-25', phone: '012-345-682', email: 'maly.heng@example.com', province: 'Takeo', selection_batch_id: 2025, selection_batch_name: 'Generation 2025', enrollment_status: 'enrolled', status: 'enrolled', created_at: now, updated_at: now },
  ]
  if (!selectedStudentId.value && students.value.length > 0 && students.value[0]) {
    selectedStudentId.value = students.value[0].id
  }
}

const RECORDS_API_ENABLED = import.meta.env.VITE_RECORDS_API_ENABLED !== 'false'

let nextLocalId = 1000

const blobUrls = ref<Set<string>>(new Set())

onUnmounted(() => {
  for (const url of blobUrls.value) {
    URL.revokeObjectURL(url)
  }
  blobUrls.value.clear()
})

function getStudentDemoRecords(studentId: number): { records: StudentRecord[], attachments: StudentAttachment[] } {
  const now = new Date().toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString()
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const studentDemoMap: Record<number, { title: string; desc: string; type: 'academic' | 'behavior' | 'medical' | 'general'; date: string }[]> = {
    101: [
      { title: 'Midterm Examination Results', desc: 'Scored 85/100 on the midterm exam. Excellent performance in web development module.', type: 'academic', date: now },
      { title: 'Attendance Warning', desc: 'Late to class 3 times this month. Please improve punctuality.', type: 'behavior', date: weekAgo },
    ],
    102: [
      { title: 'Final Project Submission', desc: 'Submitted capstone project on E-commerce system. Received grade A.', type: 'academic', date: now },
      { title: 'Health Check Report', desc: 'Annual health checkup completed. All vitals normal.', type: 'medical', date: twoWeeksAgo },
    ],
    103: [
      { title: 'Scholarship Application', desc: 'Applied for academic scholarship. GPA 3.8 - qualifies for full scholarship.', type: 'academic', date: now },
      { title: 'Library Fine Notice', desc: 'Overdue books returned. Fine of $5.50 paid.', type: 'general', date: monthAgo },
      { title: 'Sports Day Participation', desc: 'Represented the department in annual sports day. Won 2nd place in 100m sprint.', type: 'general', date: twoWeeksAgo },
    ],
    104: [
      { title: 'Enrollment Confirmation', desc: 'Successfully enrolled in Web Development track for academic year 2024-2025.', type: 'academic', date: now },
    ],
    105: [
      { title: 'Internship Placement', desc: 'Placed at ABC Tech Company for 3-month internship starting June 2025.', type: 'academic', date: now },
      { title: 'Medical Leave Request', desc: 'Approved for 2-week medical leave due to recovery from surgery.', type: 'medical', date: weekAgo },
      { title: 'Outstanding Student Award', desc: 'Awarded Outstanding Student of the Year 2024-2025.', type: 'general', date: twoWeeksAgo },
    ],
  }

  const recordsFromStudent = studentDemoMap[studentId]
  if (!recordsFromStudent) {
    return {
      records: [{ id: nextLocalId++, student_id: studentId, title: 'General Record', description: 'Basic student record entry.', record_type: 'general', recorded_by: 1, recorded_at: now, created_at: now, updated_at: now, attachments: [] }],
      attachments: [],
    }
  }

  const records: StudentRecord[] = recordsFromStudent.map((r) => ({
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

async function loadRecords() {
  if (!selectedStudentId.value) {
    records.value = []
    attachments.value = []
    return
  }

  if (!RECORDS_API_ENABLED) {
    if (records.value.length > 0 && records.value[0]?.student_id !== selectedStudentId.value) {
      records.value = []
      attachments.value = []
    }
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

// Auto-open edit modal when edit_id is present in query params (e.g. from Student Profile)
const autoOpenEditId = ref<number | null>(null)

watch([() => route.query.edit_id, records], () => {
  const editId = route.query.edit_id ? Number(route.query.edit_id) : null
  if (editId && records.value.length > 0 && autoOpenEditId.value !== editId) {
    const record = records.value.find((r: StudentRecord) => r.id === editId)
    if (record) {
      autoOpenEditId.value = editId
      nextTick(() => openEditRecord(record))
    }
  }
})

// ── Inline Form Submit ──
async function submitInlineForm() {
  if (!selectedStudentId.value) {
    showErrorToast('Please select a student first.', 'Validation')
    return
  }
  if (!inlineForm.value.title.trim()) {
    showErrorToast('Title is required.', 'Validation')
    return
  }

  isSaving.value = true
  try {
    const now = new Date().toISOString()

    if (!RECORDS_API_ENABLED) {
      const newRecord: StudentRecord = {
        id: nextLocalId++,
        student_id: selectedStudentId.value,
        title: inlineForm.value.title.trim(),
        description: inlineForm.value.description.trim(),
        record_type: inlineForm.value.record_type,
        recorded_by: 1,
        recorded_at: inlineForm.value.recorded_at || now,
        created_at: now,
        updated_at: now,
        attachments: [],
      }
      records.value.unshift(newRecord)
      showSuccessToast('Record created successfully', 'Success')
      resetInlineForm()
      return
    }

    const payload: CreateStudentRecordPayload = {
      student_id: Number(selectedStudentId.value),
      title: inlineForm.value.title.trim(),
      description: inlineForm.value.description.trim(),
      record_type: inlineForm.value.record_type,
      recorded_by: authStore.user?.id ?? 1,
      recorded_at: inlineForm.value.recorded_at || now,
    }
    const created = await recordsApi.create(selectedStudentId.value, payload)
    records.value.unshift({ ...created, attachments: created.attachments ?? [] })
    showSuccessToast('Record created successfully', 'Success')
    resetInlineForm()
  } catch (error: any) {
    const message = getApiErrorMessage(error, 'Failed to save record.')
    showErrorToast(message, 'Error')
  } finally {
    isSaving.value = false
  }
}

function resetInlineForm() {
  inlineForm.value = {
    title: '',
    description: '',
    record_type: 'general',
    recorded_at: new Date().toISOString().split('T')[0],
  }
  inlineAttachmentFile.value = null
}

function handleInlineAttachmentChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  inlineAttachmentFile.value = file
}

function removeInlineAttachment() {
  inlineAttachmentFile.value = null
  if (inlineAttachmentInput.value) inlineAttachmentInput.value.value = ''
}

// ── CRUD ──
function openAddRecord() {
  editingRecord.value = null
  recordForm.value = { title: '', description: '', record_type: 'general' }
  showRecordForm.value = true
}

function openEditRecord(record: StudentRecord) {
  editingRecord.value = record
  recordForm.value = { title: record.title, description: record.description, record_type: record.record_type }
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
      if (editingRecord.value) {
        const idx = records.value.findIndex((r: StudentRecord) => r.id === editingRecord.value!.id)
        const currentRecord = records.value[idx]
        if (currentRecord) {
          records.value[idx] = { ...currentRecord, title: recordForm.value.title.trim(), description: recordForm.value.description.trim(), record_type: recordForm.value.record_type, updated_at: now }
        }
        showSuccessToast(t('records.toast_updated'), t('records.toast_updated_title'))
      } else {
        const newRecord: StudentRecord = { id: nextLocalId++, student_id: selectedStudentId.value, title: recordForm.value.title.trim(), description: recordForm.value.description.trim(), record_type: recordForm.value.record_type, recorded_by: 1, recorded_at: now, created_at: now, updated_at: now, attachments: [] }
        records.value.unshift(newRecord)
        showSuccessToast(t('records.toast_created'), t('records.toast_created_title'))
      }
      closeRecordForm()
      return
    }

    if (editingRecord.value) {
      const currentRecord = editingRecord.value
      const payload: UpdateStudentRecordPayload = { title: recordForm.value.title.trim(), description: recordForm.value.description.trim(), record_type: recordForm.value.record_type, recorded_at: currentRecord.recorded_at || now }
      const updated = await recordsApi.update(selectedStudentId.value, currentRecord.id, payload)
      const index = records.value.findIndex((r: StudentRecord) => r.id === currentRecord.id)
      if (index !== -1) records.value[index] = { ...updated, attachments: updated.attachments ?? [] }
      showSuccessToast(t('records.toast_updated'), t('records.toast_updated_title'))
    } else {
      const payload: CreateStudentRecordPayload = { student_id: Number(selectedStudentId.value), title: recordForm.value.title.trim(), description: recordForm.value.description.trim(), record_type: recordForm.value.record_type, recorded_by: authStore.user?.id ?? 1, recorded_at: now }
      const created = await recordsApi.create(selectedStudentId.value, payload)
      records.value.unshift({ ...created, attachments: created.attachments ?? [] })
      showSuccessToast(t('records.toast_created'), t('records.toast_created_title'))
    }
    closeRecordForm()
    loadRecords()
    // Auto-navigate back to Student Profile after editing a record from profile
    if (route.query.edit_id) {
      const studentId = selectedStudentId.value
      if (studentId) {
        router.push({ name: 'StudentProfile', params: { id: String(studentId) } })
      }
    }
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
  if (attachment.record_id) {
    const record = records.value.find((r: StudentRecord) => r.id === attachment.record_id)
    if (record && record.attachments) record.attachments = record.attachments.filter((a: StudentAttachment) => a.id !== attachment.id)
  }
  attachments.value = attachments.value.filter((a: StudentAttachment) => a.id !== attachment.id)
}

function confirmDeleteRecord(record: StudentRecord) {
  confirmDeleteMessage.value = `Are you sure you want to delete "${record.title}"? This action cannot be undone.`
  confirmDeleteIsRecord.value = true
  confirmDeleteTarget.value = record
  showConfirmDelete.value = true
}

async function executeDeleteRecord(record: StudentRecord) {
  if (!RECORDS_API_ENABLED) {
    if (record.attachments) {
      for (const att of record.attachments) {
        if (att.file_path.startsWith('blob:')) { URL.revokeObjectURL(att.file_path); blobUrls.value.delete(att.file_path) }
      }
    }
    records.value = records.value.filter((r: StudentRecord) => r.id !== record.id)
    showSuccessToast(t('records.toast_deleted'), t('records.toast_deleted_title'))
    return
  }
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

function confirmDeleteAttachment(attachment: StudentAttachment) {
  confirmDeleteMessage.value = `Are you sure you want to delete "${attachment.file_name}"? This action cannot be undone.`
  confirmDeleteIsRecord.value = false
  confirmDeleteTarget.value = attachment
  showConfirmDelete.value = true
}

async function executeDeleteAttachment(attachment: StudentAttachment) {
  if (!RECORDS_API_ENABLED) { removeLocalAttachment(attachment); showSuccessToast(t('records.toast_attachment_deleted'), t('records.toast_attachment_deleted_title')); return }
  try {
    await recordsApi.deleteAttachment(selectedStudentId.value!, attachment.id)
    showSuccessToast(t('records.toast_attachment_deleted'), t('records.toast_attachment_deleted_title'))
    loadRecords()
  } catch (error: any) { const message = getApiErrorMessage(error, 'Failed to delete attachment.'); showErrorToast(message, t('records.toast_error')) }
}

// ── Attachments ──
function openAttachmentUpload(recordId?: number) {
  uploadingForRecordId.value = recordId ?? null
  attachmentFile.value = null
  showAttachmentUpload.value = true
  nextTick(() => { if (attachmentInput.value) attachmentInput.value.value = '' })
}

function closeAttachmentUpload() {
  showAttachmentUpload.value = false
  uploadingForRecordId.value = null
  attachmentFile.value = null
  nextTick(() => { if (attachmentInput.value) attachmentInput.value.value = '' })
}

function handleAttachmentChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  attachmentFile.value = file
}

async function submitAttachmentUpload() {
  if (!selectedStudentId.value) { showErrorToast('Please select a student first.', t('records.toast_validation_title')); return }
  if (!attachmentFile.value) { showErrorToast('Please select a file to upload.', t('records.toast_validation_title')); return }

  isUploading.value = true
  try {
    const now = new Date().toISOString()
    if (!RECORDS_API_ENABLED) {
      const blobUrl = URL.createObjectURL(attachmentFile.value)
      blobUrls.value.add(blobUrl)
      const newAttachment: StudentAttachment = { id: nextLocalId++, student_id: selectedStudentId.value, record_id: uploadingForRecordId.value, file_name: attachmentFile.value.name, file_path: blobUrl, file_size: attachmentFile.value.size, mime_type: attachmentFile.value.type || 'application/octet-stream', uploaded_by: 1, uploaded_at: now, created_at: now, updated_at: now }
      if (uploadingForRecordId.value) {
        const record = records.value.find((r: StudentRecord) => r.id === uploadingForRecordId.value)
        if (record) { if (!record.attachments) record.attachments = []; record.attachments.push(newAttachment) }
      } else attachments.value.push(newAttachment)
      showSuccessToast(t('records.toast_attachment_uploaded'), t('records.toast_attachment_uploaded_title'))
      closeAttachmentUpload()
      return
    }
    const uploaded = await recordsApi.uploadAttachment(selectedStudentId.value, { student_id: selectedStudentId.value, record_id: uploadingForRecordId.value, file: attachmentFile.value })
    if (uploaded.record_id) {
      const record = records.value.find((r: StudentRecord) => r.id === uploaded.record_id)
      if (record) record.attachments = [...(record.attachments ?? []), uploaded]
    } else attachments.value.unshift(uploaded)
    showSuccessToast(t('records.toast_attachment_uploaded'), t('records.toast_attachment_uploaded_title'))
    closeAttachmentUpload()
    await loadRecords()
  } catch (error: any) {
    const message = error instanceof Error ? error.message : getApiErrorMessage(error, 'Failed to upload attachment.')
    showErrorToast(message, t('records.toast_error'))
  } finally { isUploading.value = false }
}

function closeConfirmDelete() {
  showConfirmDelete.value = false
  confirmDeleteTarget.value = null
}

async function executeConfirmDelete() {
  if (!confirmDeleteTarget.value) return
  isConfirmDeleting.value = true
  try {
    if (confirmDeleteIsRecord.value) {
      await executeDeleteRecord(confirmDeleteTarget.value as StudentRecord)
    } else {
      await executeDeleteAttachment(confirmDeleteTarget.value as StudentAttachment)
    }
    closeConfirmDelete()
  } finally {
    isConfirmDeleting.value = false
  }
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const { start: startPolling } = usePolling(async () => {
  await loadStudents()
  if (selectedStudentId.value) loadRecords()
}, 10_000)

onMounted(async () => {
  await loadStudents()
  if (selectedStudentId.value) loadRecords()
  startPolling()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50/50 dark:bg-gray-950" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-4 lg:py-5 space-y-4 lg:space-y-5">

      <!-- ==================== 1. HEADER ==================== -->
      <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div class="space-y-1">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 mb-1.5">
            <button @click="router.push('/dashboard')" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">Dashboard</button>
            <ChevronRight :size="12" class="text-gray-300 dark:text-gray-600" />
            <button @click="router.push('/students/tracking')" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">Students</button>
            <ChevronRight :size="12" class="text-gray-300 dark:text-gray-600" />
            <span class="text-gray-600 dark:text-gray-400 font-medium">Student Records</span>
          </nav>
          <!-- Title & Subtitle -->
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm shadow-blue-500/20 flex-shrink-0">
              <BookOpen :size="16" class="text-white" />
            </div>
            <div>
              <h1 class="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Student Records</h1>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage records, notes, and attachments for students.</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <!-- Back to Student Profile button (shown when navigated from edit link) -->
          <button
            v-if="route.query.edit_id && selectedStudentId"
            @click="router.push({ name: 'StudentProfile', params: { id: String(selectedStudentId) } })"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:text-gray-700 dark:hover:text-gray-300 transition-all duration-200 cursor-pointer shadow-sm"
          >
            <ChevronLeft :size="14" />
            Back to Profile
          </button>
          <button
            v-if="canManage"
            @click="openAttachmentUpload()"
            class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
          >
            <Upload :size="14" />
            Upload
          </button>
          <button
            v-if="canManage && selectedStudentId"
            @click="openAddRecord"
            class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-sm shadow-blue-500/25 hover:shadow hover:shadow-blue-500/30 active:scale-[0.98] cursor-pointer"
          >
            <Plus :size="14" class="shrink-0" />
            Add Record
          </button>
        </div>
      </div>

      <!-- Student Selector (shown when no student selected yet) -->
      <div v-if="!selectedStudentId" class="relative max-w-lg">
        <div class="relative group">
          <div class="absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
            <User :size="16" class="text-gray-400 transition-colors duration-200 group-focus-within:text-blue-500" />
          </div>
          <select
            v-model="selectedStudentId"
            class="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none shadow-sm hover:shadow hover:border-gray-300 dark:hover:border-gray-600"
          >
            <option :value="null" disabled>{{ t('records.select_student') }}</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.full_name }} — {{ student.student_id_no }}
            </option>
          </select>
          <div class="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown :size="16" />
          </div>
        </div>
      </div>

      <!-- ==================== 2. STUDENT INFORMATION CARD ==================== -->
      <template v-if="selectedStudentId">
        <!-- Student Info Bar -->
        <div
          v-if="selectedStudent"
          class="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-xl border border-blue-100 dark:border-blue-500/20"
        >
          <div class="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img
              v-if="selectedStudent.photo_path"
              :src="resolvePhotoUrl(selectedStudent.photo_path, selectedStudent.id)"
              :alt="selectedStudent.full_name"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs font-bold text-white">{{ getInitials(selectedStudent.full_name) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ selectedStudent.full_name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ selectedStudent.student_id_no }} · {{ selectedStudent.selection_batch_name || '—' }}</p>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-12 gap-3">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Loader2 :size="28" class="text-white animate-spin" />
          </div>
          <div class="text-center">
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading records...</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Please wait while we fetch the student records.</p>
          </div>
        </div>

        <!-- ==================== 3. TWO COLUMN LAYOUT ==================== -->
        <div v-else class="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-5">

          <!-- ========== LEFT COLUMN: New Record Form ========== -->
          <div class="space-y-4" v-if="showInlineForm">
            <div class="bg-white dark:bg-[#0F1729] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <h3 class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Plus :size="14" class="text-blue-500" />
                  New Record
                </h3>
              </div>
              <div class="p-4 space-y-3">
                <!-- Category -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      v-for="opt in recordTypeOptions"
                      :key="opt.value"
                      @click="inlineForm.record_type = opt.value"
                      class="px-3 py-2 text-[11px] font-medium rounded-lg border transition-all duration-200 cursor-pointer text-center"
                      :class="inlineForm.record_type === opt.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/50'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50'"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>

                <!-- Title -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title</label>
                  <input
                    v-model="inlineForm.title"
                    type="text"
                    placeholder="e.g. Midterm Results"
                    class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <!-- Date -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                  <div class="relative">
                    <Calendar :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      v-model="inlineForm.recorded_at"
                      type="date"
                      class="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <!-- Description -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                  <textarea
                    v-model="inlineForm.description"
                    rows="3"
                    placeholder="Add any notes..."
                    class="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  ></textarea>
                </div>

                <!-- Attachment Upload (drag-drop) -->
                <div>
                  <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Attachment</label>
                  <div
                    class="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group"
                    @click="inlineAttachmentInput?.click()"
                    @dragover.prevent
                    @drop.prevent="handleInlineAttachmentChange"
                  >
                    <input
                      ref="inlineAttachmentInput"
                      type="file"
                      class="hidden"
                      @change="handleInlineAttachmentChange"
                    />
                    <div v-if="!inlineAttachmentFile" class="flex flex-col items-center gap-2">
                      <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                        <Upload :size="18" class="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Drop file or click to upload</p>
                    </div>
                    <div v-else class="flex items-center gap-3 justify-center">
                      <File :size="18" class="text-blue-500 shrink-0" />
                      <div class="text-left min-w-0">
                        <p class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ inlineAttachmentFile.name }}</p>
                        <p class="text-[10px] text-gray-400">{{ formatFileSize(inlineAttachmentFile.size) }}</p>
                      </div>
                      <button @click.stop="removeInlineAttachment" class="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer shrink-0">
                        <X :size="14" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Buttons -->
                <div class="flex items-center gap-2 pt-1">
                  <button
                    @click="resetInlineForm"
                    class="flex-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    @click="submitInlineForm"
                    :disabled="isSaving || !inlineForm.title.trim()"
                    class="flex-1 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <Loader2 v-if="isSaving" :size="10" class="animate-spin" />
                    {{ isSaving ? 'Saving...' : 'Save Record' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ========== RIGHT COLUMN: Timeline ========== -->
          <div class="space-y-5">

            <!-- No records state -->
            <div v-if="!hasRecords" class="flex flex-col items-center justify-center py-10 gap-3 bg-white dark:bg-[#0F1729] rounded-xl border border-gray-200 dark:border-gray-800">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center shadow-sm border border-gray-200 dark:border-gray-700">
                <FileText :size="22" class="text-gray-300 dark:text-gray-600" />
              </div>
              <div class="text-center max-w-xs">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">No records found</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
                  No records found for this student yet.<br>Add the first record using the form on the left.
                </p>
              </div>
            </div>

            <!-- Timeline with records -->
            <template v-else>
              <!-- Timeline Header: Title, Search, Filters -->
              <div class="bg-white dark:bg-[#0F1729] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div class="p-4 space-y-3">
                  <!-- Title & Stats -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                          <Clock :size="13" class="text-white" />
                        </div>
                        <div>
                          <h3 class="text-xs font-bold text-gray-900 dark:text-white">Timeline</h3>
                          <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ filteredTimelineItems.length }} {{ filteredTimelineItems.length === 1 ? 'entry' : 'entries' }}</p>
                        </div>
                      </div>
                      <div class="relative">
                        <Search :size="12" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          v-model="searchQuery"
                          type="text"
                          placeholder="Search records..."
                          class="w-32 sm:w-40 pl-7 pr-2.5 py-1.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <!-- Category Filter Chips -->
                    <div class="flex items-center gap-1 overflow-x-auto scrollbar-thin">
                      <button
                        v-for="cat in categoryFilterOptions"
                        :key="cat.value"
                        @click="categoryFilter = cat.value"
                        class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
                        :class="categoryFilter === cat.value
                          ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-white dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300'"
                      >
                        <component :is="cat.icon" :size="10" />
                        {{ cat.label }}
                      </button>
                    </div>

                    <!-- Secondary Filters Row -->
                    <div class="flex flex-wrap items-center gap-2">
                      <div class="relative flex-1 min-w-0 max-w-[140px]">
                        <Calendar :size="11" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          v-model="dateFilter"
                          type="date"
                          class="w-full pl-7 pr-2 py-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-600 dark:text-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div class="relative flex-1 min-w-0 max-w-[140px]">
                        <User :size="11" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          v-model="createdByFilter"
                          type="text"
                          placeholder="Created by..."
                          class="w-full pl-7 pr-2 py-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-600 dark:text-gray-400 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div class="relative flex-1 min-w-0 max-w-[140px]">
                        <ArrowUpDown :size="11" class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <select
                          v-model="sortBy"
                          class="w-full pl-7 pr-6 py-1 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] text-gray-600 dark:text-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer appearance-none"
                        >
                          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </div>
                    </div>
                </div>
              </div>

              <!-- Timeline Items (Grouped by Date) -->
              <div class="relative">
                <!-- Continuous Timeline Line (behind all groups) -->
                <div class="absolute left-[22px] top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-200 via-blue-100 to-gray-200 dark:from-blue-800 dark:via-blue-900/50 dark:to-gray-800 rounded-full pointer-events-none"></div>

                <div class="space-y-5">
                <template v-for="(group, gi) in timelineGroups" :key="gi">
                  <!-- Date Group Header (sticky) -->
                  <div class="sticky top-0 z-20 -mx-1 px-1" :style="{ marginTop: gi === 0 ? '0' : '' }">
                    <div class="flex items-center gap-2 py-1.5">
                      <div
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-[#0F1729]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm"
                      >
                        <Clock :size="12" class="text-blue-500" />
                        <span class="text-xs font-bold text-gray-800 dark:text-gray-200">{{ group.label }}</span>
                        <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500">({{ group.items.length }})</span>
                      </div>
                      <div class="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-100 to-transparent dark:from-gray-700 dark:via-gray-800 dark:to-transparent"></div>
                    </div>
                  </div>

                  <!-- Timeline Group Items -->
                  <div class="relative">
                    <div class="space-y-3">
                      <div
                        v-for="item in group.items"
                        :key="item.id"
                        class="relative pl-12"
                      >
                        <!-- Timeline dot -->
                        <div
                          class="absolute left-[14px] top-5 w-[19px] h-[19px] rounded-full border-[3px] border-white dark:border-gray-950 shadow-md z-10 transition-all duration-300 hover:scale-125 hover:shadow-lg"
                          :class="item.type === 'record'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/30'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'"
                        ></div>

                        <!-- Record Card -->
                        <div
                          v-if="item.type === 'record' && item.record"
                          class="group bg-white dark:bg-[#0F1729] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 hover:-translate-y-0.5"
                          :class="{ 'shadow-lg border-blue-200 dark:border-blue-800 ring-1 ring-blue-100 dark:ring-blue-900': expandedRecords.has(item.record!.id) }"
                        >
                          <!-- Card Header -->
                          <div class="p-3.5 lg:p-4">
                            <div class="flex items-start gap-3">
                              <!-- Left: Colored Icon with type badge -->
                              <div class="flex flex-col items-center gap-1 shrink-0">
                                <div
                                  class="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:shadow-md"
                                  :style="{
                                    backgroundColor: getRecordTypeStyle(item.record!.record_type).bg,
                                    color: getRecordTypeStyle(item.record!.record_type).text
                                  }"
                                >
                                  <component :is="getRecordTypeStyle(item.record!.record_type).icon || FileText" :size="15" />
                                </div>
                                <span
                                  class="text-[7px] font-semibold uppercase tracking-wider"
                                  :style="{ color: getRecordTypeStyle(item.record!.record_type).text }"
                                >
                                  {{ getRecordTypeStyle(item.record!.record_type).label.slice(0, 4) }}
                                </span>
                              </div>

                              <!-- Middle: Content -->
                              <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3">
                                  <div class="min-w-0 flex-1">
                                    <h4
                                      class="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer truncate"
                                      @click="toggleRecordExpand(item.record!.id)"
                                    >
                                      {{ item.record!.title }}
                                    </h4>
                                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span
                                        class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                                        :style="{ backgroundColor: getRecordTypeStyle(item.record!.record_type).bg, color: getRecordTypeStyle(item.record!.record_type).text }"
                                      >
                                        {{ getRecordTypeStyle(item.record!.record_type).label }}
                                      </span>
                                      <span v-if="item.record!.attachments && item.record!.attachments.length > 0" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                        <PaperclipIcon :size="9" />
                                        {{ item.record!.attachments.length }}
                                      </span>
                                    </div>
                                    <p v-if="item.record!.description" class="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                                      {{ item.record!.description }}
                                    </p>
                                  </div>

                                  <!-- Right: Date & Time Column with Edit Icon -->
                                  <div class="flex flex-col items-end gap-1.5 shrink-0">
                                    <div class="text-right">
                                      <p class="text-[11px] font-semibold text-gray-900 dark:text-white">{{ formatDateOnly(item.record!.recorded_at || item.record!.created_at) }}</p>
                                      <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatTimeOnly(item.record!.recorded_at || item.record!.created_at) }}</p>
                                    </div>
                                    <!-- Quick Edit Icon Button -->
                                    <button
                                      v-if="canManage"
                                      @click.stop="openEditRecord(item.record!)"
                                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/30 hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400 hover:shadow-sm hover:border-amber-200 dark:hover:border-amber-500/30 border border-transparent transition-all duration-200 cursor-pointer group/edit"
                                      title="Edit record"
                                    >
                                      <Pencil :size="12" class="transition-transform duration-200 group-hover/edit:scale-110" />
                                    </button>
                                  </div>
                                </div>

                                <!-- Action Bar (always visible, subtle) -->
                                <div class="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                                  <button
                                    @click.stop="toggleRecordExpand(item.record!.id)"
                                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
                                  >
                                    <Eye :size="11" />
                                    {{ expandedRecords.has(item.record!.id) ? 'Less' : 'Details' }}
                                  </button>
                                  <button
                                    v-if="canManage"
                                    @click.stop="openEditRecord(item.record!)"
                                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer"
                                  >
                                    <Pencil :size="11" />
                                    Edit
                                  </button>
                                  <button
                                    v-if="canManage"
                                    @click.stop="confirmDeleteRecord(item.record!)"
                                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
                                  >
                                    <Trash2 :size="11" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <!-- Expanded Details -->
                          <transition
                            enter-active-class="transition-all duration-300 ease-out"
                            enter-from-class="opacity-0 max-h-0"
                            enter-to-class="opacity-100 max-h-[2000px]"
                            leave-active-class="transition-all duration-200 ease-in"
                            leave-from-class="opacity-100 max-h-[2000px]"
                            leave-to-class="opacity-0 max-h-0"
                          >
                            <div v-if="expandedRecords.has(item.record!.id)" class="border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/20">
                              <div class="px-4 py-3.5 space-y-3">
                                <!-- Notes / Description Section -->
                                <div v-if="item.record!.description" class="relative pl-3.5 border-l-[3px] border-blue-400 dark:border-blue-500">
                                  <div class="flex items-center gap-1.5 mb-1.5">
                                    <FileText :size="10" class="text-blue-500" />
                                    <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Notes</span>
                                  </div>
                                  <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{{ item.record!.description }}</p>
                                </div>

                                <!-- Attachments Section -->
                                <div v-if="item.record!.attachments && item.record!.attachments.length > 0">
                                  <div class="flex items-center gap-1.5 mb-2">
                                    <Paperclip :size="10" class="text-amber-500" />
                                    <span class="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                                      Attachments ({{ item.record!.attachments.length }})
                                    </span>
                                    <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                  </div>
                                  <div class="grid grid-cols-1 gap-1.5">
                                    <div
                                      v-for="att in item.record!.attachments"
                                      :key="att.id"
                                      @click="openFilePreview(att)"
                                      class="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800 group/card cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-sm transition-all duration-200"
                                    >
                                      <div class="w-8 h-8 rounded-lg bg-white dark:bg-gray-700/50 flex items-center justify-center shadow-sm shrink-0">
                                        <component :is="getFileIcon(att.mime_type)" :size="14" class="text-blue-500" />
                                      </div>
                                      <div class="min-w-0 flex-1">
                                        <p class="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate flex items-center gap-1">
                                          {{ att.file_name }}
                                          <span class="text-[9px] font-normal text-gray-400">({{ formatFileSize(att.file_size) }})</span>
                                        </p>
                                        <p class="text-[9px] text-gray-400">
                                          {{ formatDate(att.uploaded_at || att.created_at) }}
                                        </p>
                                      </div>
                                      <div class="flex items-center gap-1 opacity-60 group-hover/card:opacity-100 transition-all duration-200 shrink-0" @click.stop>
                                        <button @click="openFilePreview(att)" class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-blue-400 transition-all cursor-pointer" title="Preview"><Eye :size="11" /></button>
                                        <a :href="getAttachmentUrl(att)" target="_blank" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:hover:text-gray-300 transition-all cursor-pointer" title="Open"><ExternalLink :size="11" /></a>
                                        <button v-if="canManage" @click="confirmDeleteAttachment(att)" class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all cursor-pointer" title="Delete"><Trash2 :size="11" /></button>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <!-- Upload attachment button -->
                                <button
                                  v-if="canManage"
                                  @click.stop="openAttachmentUpload(item.record!.id)"
                                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all cursor-pointer border border-blue-100 dark:border-blue-500/20"
                                >
                                  <Upload :size="11" />
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
                          class="group bg-white dark:bg-[#0F1729] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden px-4 py-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-500/5 hover:border-amber-200 dark:hover:border-amber-500/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                        >
                          <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110">
                              <component :is="getFileIcon(item.attachment.mime_type)" :size="16" class="text-amber-500" />
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="text-xs font-semibold text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{{ item.attachment.file_name }}</p>
                              <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Attachment</span>
                                <span class="text-[10px] text-gray-400">{{ formatFileSize(item.attachment.file_size) }}</span>
                                <span class="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                                <span class="text-[10px] text-gray-400">{{ formatDate(item.attachment.uploaded_at || item.attachment.created_at) }}</span>
                              </div>
                            </div>
                            <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-all duration-200 shrink-0" @click.stop>
                              <button @click="openFilePreview(item.attachment!)" class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-all cursor-pointer" title="Preview"><Eye :size="11" /></button>
                              <a :href="getAttachmentUrl(item.attachment)" target="_blank" class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:hover:text-gray-300 transition-all cursor-pointer" title="Open"><ExternalLink :size="11" /></a>
                              <button v-if="canManage" @click="confirmDeleteAttachment(item.attachment)" class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all cursor-pointer" title="Delete"><Trash2 :size="11" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>

              <!-- ==================== 6. PAGINATION ==================== -->
              <div v-if="totalPages > 1" class="flex flex-col sm:flex-row items-center justify-between gap-3">
                <p class="text-[10px] text-gray-500 dark:text-gray-400">
                  Showing <span class="font-medium text-gray-700 dark:text-gray-300">{{ (currentPage - 1) * perPage + 1 }}</span>
                  to <span class="font-medium text-gray-700 dark:text-gray-300">{{ Math.min(currentPage * perPage, filteredTimelineItems.length) }}</span>
                  of <span class="font-medium text-gray-700 dark:text-gray-300">{{ filteredTimelineItems.length }}</span> records
                </p>
                <div class="flex items-center gap-1">
                  <button
                    @click="currentPage = Math.max(1, currentPage - 1)"
                    :disabled="currentPage === 1"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft :size="12" />
                    Previous
                  </button>
                  <template v-for="page in totalPages" :key="page">
                    <button
                      v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
                      @click="currentPage = page"
                      class="w-7 h-7 text-[10px] font-medium rounded-lg border transition-all duration-200 cursor-pointer"
                      :class="currentPage === page
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'"
                    >
                      {{ page }}
                    </button>
                    <span v-else-if="page === currentPage - 2 || page === currentPage + 2" class="text-gray-300 dark:text-gray-600 text-[10px] px-1">...</span>
                  </template>
                  <button
                    @click="currentPage = Math.min(totalPages, currentPage + 1)"
                    :disabled="currentPage === totalPages"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                    <ChevronRight :size="12" />
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>

    <!-- ==================== MODALS ==================== -->

    <!-- Add/Edit Record Modal -->
    <Teleport to="body">
      <transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showRecordForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-md" @click="closeRecordForm"></div>
          <div class="relative bg-white dark:bg-[#0F1729] rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ editingRecord ? t('records.edit_record') : t('records.add_record') }}</h3>
                  <p v-if="selectedStudent" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">for <span class="font-medium text-gray-700 dark:text-gray-300">{{ selectedStudent.full_name }}</span></p>
                </div>
                <button @click="closeRecordForm" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"><X :size="18" /></button>
              </div>
              <div class="space-y-5">
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ t('records.title_label') }}</label>
                  <input v-model="recordForm.title" type="text" placeholder="e.g. Midterm Exam Results" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ t('records.record_type') }}</label>
                  <div class="grid grid-cols-2 gap-2.5">
                    <button v-for="opt in recordTypeOptions" :key="opt.value" @click="recordForm.record_type = opt.value"
                      class="relative px-4 py-3 text-sm font-medium rounded-xl border transition-all duration-200 cursor-pointer text-center overflow-hidden"
                      :class="recordForm.record_type === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/50 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
                    >
                      <span v-if="recordForm.record_type === opt.value" class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                      {{ opt.label }}
                    </button>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{{ t('records.description') }}</label>
                  <textarea v-model="recordForm.description" rows="4" placeholder="Add any notes or details about this record..." class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 resize-none"></textarea>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button @click="closeRecordForm" :disabled="isSaving" class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{{ t('records.cancel') }}</button>
                <button @click="submitRecordForm" :disabled="isSaving || !recordForm.title.trim()" class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2">
                  <Loader2 v-if="isSaving" :size="14" class="animate-spin" />
                  {{ isSaving ? t('records.saving') : (editingRecord ? t('records.update_record') : t('records.add_record_btn')) }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Upload Attachment Modal -->
    <Teleport to="body">
      <transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showAttachmentUpload" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-md" @click="closeAttachmentUpload"></div>
          <div class="relative bg-white dark:bg-[#0F1729] rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"></div>
            <div class="p-6">
              <div class="flex items-center justify-between mb-6">
                <div><h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ t('records.upload_attachment') }}</h3><p v-if="selectedStudent" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">for <span class="font-medium text-gray-700 dark:text-gray-300">{{ selectedStudent.full_name }}</span></p></div>
                <button @click="closeAttachmentUpload" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"><X :size="18" /></button>
              </div>
              <div class="space-y-4">
                <div class="relative border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer group" @click="attachmentInput?.click()">
                  <input ref="attachmentInput" type="file" class="hidden" @change="handleAttachmentChange" />
                  <div v-if="!attachmentFile" class="flex flex-col items-center gap-3">
                    <div class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors duration-200">
                      <Upload :size="28" class="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors duration-200" />
                    </div>
                    <div><p class="text-sm font-semibold text-gray-600 dark:text-gray-400">{{ t('records.select_file') }}</p><p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click to browse or drag &amp; drop</p></div>
                  </div>
                  <div v-else class="flex flex-col items-center gap-3">
                    <div class="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center"><File :size="28" class="text-blue-500" /></div>
                    <div><p class="text-sm font-semibold text-gray-900 dark:text-white">{{ attachmentFile.name }}</p><p class="text-xs text-gray-400 mt-1">{{ formatFileSize(attachmentFile.size) }}</p></div>
                    <button @click.stop="attachmentFile = null; if(attachmentInput) attachmentInput.value = ''" class="text-xs font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">Remove file</button>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button @click="closeAttachmentUpload" :disabled="isUploading" class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">{{ t('records.cancel') }}</button>
                <button @click="submitAttachmentUpload" :disabled="isUploading || !attachmentFile" class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-200 shadow-md shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2">
                  <Loader2 v-if="isUploading" :size="14" class="animate-spin" />
                  {{ isUploading ? t('records.uploading') : t('records.upload_attachment') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- File Preview Modal -->
    <Teleport to="body">
      <transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-all duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showFilePreview && previewAttachment" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/60 backdrop-blur-md" @click="closeFilePreview"></div>
          <div class="relative bg-white dark:bg-[#0F1729] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800" @click.stop>
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 bg-white dark:bg-[#0F1729]">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform duration-200 hover:scale-105"
                  :class="isPreviewableImage(previewAttachment.mime_type) ? 'bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10' : isPreviewablePdf(previewAttachment.mime_type) ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/10' : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10'"
                >
                  <component :is="getFileIcon(previewAttachment.mime_type)" :size="22"
                    :class="isPreviewableImage(previewAttachment.mime_type) ? 'text-pink-500' : isPreviewablePdf(previewAttachment.mime_type) ? 'text-red-500' : 'text-blue-500'"
                  />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ previewAttachment.file_name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    {{ formatFileSize(previewAttachment.file_size) }}<span class="text-gray-300 dark:text-gray-600">·</span>
                    {{ isPreviewableImage(previewAttachment.mime_type) ? 'Image' : isPreviewablePdf(previewAttachment.mime_type) ? 'PDF Document' : 'File' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a :href="getAttachmentUrl(previewAttachment)" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all hover:text-gray-900 dark:hover:text-white"><ExternalLink :size="13" /> Open</a>
                <button @click="closeFilePreview" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-all cursor-pointer"><X :size="18" /></button>
              </div>
            </div>
            <div class="flex-1 overflow-auto bg-gray-50/80 dark:bg-gray-900/30 flex items-start justify-center p-6">
              <div v-if="isPreviewableImage(previewAttachment.mime_type)" class="w-full flex justify-center">
                <div v-if="!imageLoaded" class="w-full max-h-[70vh] min-h-[400px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse flex items-center justify-center">
                  <div class="flex flex-col items-center gap-3"><Loader2 :size="28" class="text-gray-400 animate-spin" /><span class="text-xs text-gray-400">Loading image...</span></div>
                </div>
                <div v-if="showImageError" class="w-full max-h-[70vh] min-h-[400px] rounded-2xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-4">
                  <div class="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center"><FileDown :size="30" class="text-red-400" /></div>
                  <div class="text-center"><p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Image failed to load</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">The image may have been moved or deleted.</p></div>
                  <a :href="getAttachmentUrl(previewAttachment)" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-sm"><Download :size="14" /> Download File</a>
                </div>
                <img v-show="imageLoaded && !showImageError" :src="getAttachmentUrl(previewAttachment)" :alt="previewAttachment.file_name" class="max-w-full max-h-[70vh] rounded-2xl shadow-xl object-contain bg-white dark:bg-gray-800/50" @load="handleImageLoad" @error="handleImageError" />
              </div>
              <div v-else-if="isPreviewablePdf(previewAttachment.mime_type)" class="w-full flex justify-center">
                <iframe :src="getAttachmentUrl(previewAttachment)" class="w-full h-[70vh] rounded-2xl shadow-xl bg-white dark:bg-gray-800/50" title="PDF Preview"></iframe>
              </div>
              <div v-else-if="isOfficeDocument(previewAttachment.mime_type)" class="w-full flex justify-center relative">
                <template v-if="!getAttachmentUrl(previewAttachment).includes('127.0.0.1') && !getAttachmentUrl(previewAttachment).includes('localhost')">
                  <iframe :src="getFilePreviewUrl(previewAttachment)" class="w-full h-[70vh] rounded-2xl shadow-xl bg-white" title="Document Preview"></iframe>
                  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2"><ExternalLink :size="12" /> Powered by Google Docs Viewer</div>
                </template>
                <div v-else class="flex flex-col items-center justify-center py-16 gap-4">
                  <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center"><ExternalLink :size="32" class="text-amber-500" /></div>
                  <div class="text-center max-w-sm"><p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Open document to view</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Click below to open this document.</p></div>
                  <a :href="getAttachmentUrl(previewAttachment)" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"><ExternalLink :size="16" /> Open Document</a>
                </div>
              </div>
              <div v-else class="flex flex-col items-center justify-center py-16 gap-4">
                <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><component :is="getFileIcon(previewAttachment.mime_type)" :size="30" class="text-gray-400" /></div>
                <div class="text-center max-w-sm"><p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview not available</p><p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This file type cannot be previewed in the browser.</p></div>
                <a :href="getAttachmentUrl(previewAttachment)" target="_blank" class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-md"><ExternalLink :size="16" /> Open File</a>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- ==================== CONFIRM DELETE MODAL ==================== -->
    <Teleport to="body">
      <div v-if="showConfirmDelete" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="closeConfirmDelete"></div>
        <div class="relative bg-white dark:bg-[#131B2E] rounded-2xl shadow-xl max-w-sm w-full p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle :size="20" class="text-red-500" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Confirm Delete</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ confirmDeleteMessage }}</p>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              @click="closeConfirmDelete"
              :disabled="isConfirmDeleting"
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              @click="executeConfirmDelete"
              :disabled="isConfirmDeleting"
              class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-200 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Loader2 v-if="isConfirmDeleting" :size="14" class="animate-spin" />
              {{ isConfirmDeleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
