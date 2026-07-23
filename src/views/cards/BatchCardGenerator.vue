<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { cardsApi, type CardStudent, type CardTemplate } from '@/services/api/cards'
import { selectionBatchesApi, type SelectionBatch } from '@/services/api/selectionBatches'
import { useToast } from '@/composables/useToast'
import StudentCard from '@/components/cards/StudentCard.vue'
import html2canvas from 'html2canvas-pro'
import jsPDF from 'jspdf'
import { Check, X, ChevronDown, Download, Upload, Image as ImageIcon } from 'lucide-vue-next'

const { t } = useI18n()
const { showSuccessToast, showErrorToast } = useToast()

// State
const selectedBatch = ref<number | null>(null)
const selectedFilter = ref<'all' | 'enrolled' | 'with_photo'>('enrolled')
const selectedStudents = ref<Set<number>>(new Set())
const selectAll = ref(false)
const isGenerating = ref(false)
const generationProgress = ref(0)
const generationTotal = ref(0)
const isUploadingPhotos = ref(false)
const uploadProgress = ref(0)
const photoFiles = ref<Array<{ student_id: number; file: File; preview?: string }>>([])
const showPhotoUpload = ref(false)

// ── Batch generation: render hidden cards for frontend capture ──
const batchGeneratingStudentIds = ref<Set<number>>(new Set())

// Data
const batches = ref<SelectionBatch[]>([])
const students = ref<CardStudent[]>([])
const cardTemplates = ref<CardTemplate[]>([])
const selectedTemplate = ref<number | null>(null)

// Computed
const filteredStudents = computed(() => {
  let list = students.value

  if (selectedBatch.value) {
    list = list.filter(s => s.selection_batch_id === selectedBatch.value)
  }

  if (selectedFilter.value === 'enrolled') {
    list = list.filter(s => s.enrollment_status === 'Enrolled')
  } else if (selectedFilter.value === 'with_photo') {
    list = list.filter(s => s.photo_path)
  }

  return list
})

const studentsWithPhotos = computed(() =>
  filteredStudents.value.filter(s => s.photo_path).length
)

const eligibleStudents = computed(() =>
  filteredStudents.value.filter(s => s.photo_path && s.enrollment_status === 'Enrolled')
)

const previewStudents = computed(() => eligibleStudents.value.slice(0, 3))

// Create 6 card slots (3 students × 2 sides: front then back)
const previewCardSlots = computed(() => {
  const slots: Array<{ student: CardStudent | null; showBack: boolean; label: string }> = []
  const students = previewStudents.value
  for (let i = 0; i < 3; i++) {
    const s = students[i] ?? null
    slots.push({ student: s, showBack: false, label: s ? `${s.full_name} (Front)` : 'Empty' })
    slots.push({ student: s, showBack: true, label: s ? `${s.full_name} (Back)` : 'Empty' })
  }
  return slots
})

const selectedTemplateName = computed(() => {
  const selected = cardTemplates.value.find((template) => template.id === selectedTemplate.value)
  return selected?.name ?? 'Modern'
})

const selectedLayout = computed(() => {
  const name = selectedTemplateName.value.toLowerCase()
  if (name.includes('premium')) return 'premium'
  if (name.includes('modern')) return 'modern'
  if (name.includes('corporate-blue') || name.includes('corporate blue')) return 'corporate-blue'
  if (name.includes('corporate-yellow') || name.includes('corporate yellow')) return 'corporate-yellow'
  if (name.includes('corporate')) return 'corporate'
  if (name.includes('official')) return 'official'
  if (name.includes('standard') || name.includes('pnc') || name.includes('passerelles')) return 'modern'
  return 'classic'
})

const totalPages = computed(() =>
  Math.ceil(eligibleStudents.value.length / 3)
)

const batchLabel = computed(() => {
  const batch = batches.value.find(b => b.id === selectedBatch.value)
  if (!batch) return 'Select Batch'
  return `${batch.name} · ${String(batch.year).slice(-2)}`
})

// Methods
async function fetchBatches() {
  try {
    batches.value = await selectionBatchesApi.list()
  } catch (error) {
    showErrorToast('Failed to fetch batches', 'Error')
  }
}

async function fetchStudents() {
  if (!selectedBatch.value) {
    console.log('No batch selected, skipping fetch')
    return
  }

  try {
    console.log('Fetching students for batch:', selectedBatch.value, 'filter:', selectedFilter.value)
    const filter = selectedFilter.value === 'all' ? undefined : selectedFilter.value
    students.value = await cardsApi.getStudentsByBatch(selectedBatch.value, filter)
    console.log('Students loaded:', students.value.length)
  } catch (error) {
    console.error('Failed to fetch students:', error)
    showErrorToast('Failed to fetch students', 'Error')
  }
}

async function fetchCardTemplates() {
  try {
    cardTemplates.value = await cardsApi.getTemplates()
    if (cardTemplates.value.length > 0 && cardTemplates.value[0]) {
      selectedTemplate.value = cardTemplates.value[0].id
    }
  } catch (error) {
    showErrorToast('Failed to fetch card templates', 'Error')
  }
}

function toggleSelectAll() {
  selectAll.value = !selectAll.value
  if (selectAll.value) {
    selectedStudents.value = new Set(eligibleStudents.value.map(s => s.id))
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
  selectAll.value = next.size === eligibleStudents.value.length && eligibleStudents.value.length > 0
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

async function handleGenerate() {
  if (!selectedBatch.value || !selectedTemplate.value) {
    showErrorToast('Please select a batch and template', 'Missing Selection')
    return
  }

  const studentsToGenerate = selectedStudents.value.size > 0
    ? selectedStudents.value
    : new Set(eligibleStudents.value.map(s => s.id))

  if (studentsToGenerate.size === 0) {
    showErrorToast('No eligible students to generate cards for', 'No Students')
    return
  }

  isGenerating.value = true
  generationProgress.value = 0
  generationTotal.value = studentsToGenerate.size

  try {
    const studentIds = Array.from(studentsToGenerate)
    const layout = selectedLayout.value
    console.log('Generating batch PDF for', studentIds.length, 'students, layout:', layout)

    // Render hidden cards for all selected students
    batchGeneratingStudentIds.value = new Set(studentIds)
    await nextTick()
    // Wait for Vue to render cards and QR codes to generate
    await new Promise(r => setTimeout(r, 800))

    // Capture each card with html2canvas
    generationProgress.value = 1
    const canvasImages: HTMLCanvasElement[] = []

    // Get the offscreen container and its card-wrapper children
    const offscreenContainer = document.getElementById('batch-generation-cards')
    if (!offscreenContainer) {
      throw new Error('Offscreen card container not found')
    }
    const cardWrappers = offscreenContainer.children

    for (let i = 0; i < studentIds.length; i++) {
      // Each student has 2 card wrappers: front (i*2) and back (i*2+1)
      for (let side = 0; side < 2; side++) {
        const idx = i * 2 + side
        const cardWrapper = cardWrappers[idx] as HTMLElement | undefined
        if (!cardWrapper) {
          console.warn('Card wrapper not found for index', idx)
          continue
        }
        // Front cards use data-student-card, back cards use data-student-card-back
        const selector = side === 0 ? '[data-student-card]' : '[data-student-card-back]'
        const el = cardWrapper.querySelector(selector) as HTMLElement
        if (!el) {
          console.warn('Card element not found for student at index', idx, 'side:', side)
          continue
        }
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
        })
        canvasImages.push(canvas)
      }
      generationProgress.value = i + 1
    }

    // Create PDF with cards laid out on A4 pages
    // A4: 210mm x 297mm, with 10mm margins
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const margin = 12
    const pageW = 210 - margin * 2 // 186mm
    const pageH = 297 - margin * 2 // 273mm
    const cols = 2
    const rows = 3
    const gapX = 6 // horizontal gap in mm
    const gapY = 6 // vertical gap in mm

    // Calculate cell dimensions
    const cellW = (pageW - gapX * (cols - 1)) / cols
    const cellH = (pageH - gapY * (rows - 1)) / rows

    // 6 cards per page = 3 students × 2 sides (front + back)
    const cardsPerPage = cols * rows // 6

    for (let i = 0; i < canvasImages.length; i++) {
      const canvas = canvasImages[i]

      // Calculate card image dimensions to fit cell while maintaining aspect ratio
      const cardAspect = canvas.width / canvas.height
      let cardW, cardH
      if (cellW / cellH > cardAspect) {
        cardH = cellH
        cardW = cellH * cardAspect
      } else {
        cardW = cellW
        cardH = cellW / cardAspect
      }

      // Calculate position: center the card in its cell
      const col = i % cols
      const row = Math.floor(i / cols) % rows
      const cellX = margin + col * (cellW + gapX)
      const cellY = margin + row * (cellH + gapY)
      const x = cellX + (cellW - cardW) / 2
      const y = cellY + (cellH - cardH) / 2

      // Add new page if needed
      if (i > 0 && i % cardsPerPage === 0) {
        pdf.addPage()
      }

      pdf.addImage(canvas, 'PNG', x, y, cardW, cardH)
    }

    // Generate blob and download
    const pdfBlob = pdf.output('blob')
    const batchName = batchLabel.value.replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadBlob(pdfBlob, `ID_Cards_Batch_${batchName}_${Date.now()}.pdf`)

    showSuccessToast(
      `Successfully generated ${canvasImages.length} cards. PDF downloaded.`,
      'Generation Complete'
    )

  } catch (error) {
    console.error('Failed to generate batch cards:', error)
    showErrorToast('Failed to generate batch cards. Check console for details.', 'Generation Failed')
  } finally {
    isGenerating.value = false
    generationProgress.value = 0
    batchGeneratingStudentIds.value = new Set()
  }
}

function getPhotoStatus(student: CardStudent) {
  if (student.photo_path) return 'has'
  return 'none'
}

function getCardStatus(student: CardStudent) {
  if (!student.photo_path) return 'no photo - skipped'
  if (student.enrollment_status !== 'Enrolled') return 'not enrolled - skipped'
  return 'ready'
}

function handlePhotoUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])

  if (files.length === 0) return

  // For simplicity, assign photos to students without photos in order
  const studentsWithoutPhotos = filteredStudents.value.filter(s => !s.photo_path)

  files.forEach((file, index) => {
    if (index < studentsWithoutPhotos.length) {
      const student = studentsWithoutPhotos[index]
      if (student) {
        const reader = new FileReader()
        reader.onload = (e) => {
          photoFiles.value.push({
            student_id: student.id,
            file: file,
            preview: e.target?.result as string
          })
        }
        reader.readAsDataURL(file)
      }
    }
  })

  // Reset input
  target.value = ''
}

async function handleUploadPhotos() {
  if (photoFiles.value.length === 0) {
    showErrorToast('No photos selected', 'Error')
    return
  }

  isUploadingPhotos.value = true
  uploadProgress.value = 0

  try {
    const result = await cardsApi.batchUploadPhotos(photoFiles.value)

    showSuccessToast(
      `${result.success_count} photos uploaded successfully. ${result.failed_count} failed.`,
      'Upload Complete'
    )

    // Refresh student data
    await fetchStudents()

    // Clear uploaded photos
    photoFiles.value = []
    showPhotoUpload.value = false
  } catch (error) {
    showErrorToast('Failed to upload photos', 'Error')
  } finally {
    isUploadingPhotos.value = false
  }
}

function removePhoto(index: number) {
  photoFiles.value.splice(index, 1)
}

onMounted(async () => {
  await fetchBatches()
  await fetchCardTemplates()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Batch Card Generator</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate ID cards for students in batches</p>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Batch Dropdown -->
      <div class="relative flex-1">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Batch</label>
        <div class="relative">
          <select
            v-model="selectedBatch"
            @change="fetchStudents"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option :value="null">Select Batch</option>
            <option v-for="batch in batches" :key="batch.id" :value="batch.id">
              {{ batch.name }} · {{ String(batch.year).slice(-2) }}
            </option>
          </select>
          <ChevronDown :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <!-- Filter Dropdown -->
      <div class="relative w-full sm:w-48">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Filter</label>
        <div class="relative">
          <select
            v-model="selectedFilter"
            @change="fetchStudents"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option value="all">All Students</option>
            <option value="enrolled">Enrolled only</option>
            <option value="with_photo">With photos only</option>
          </select>
          <ChevronDown :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <!-- Template Dropdown -->
      <div class="relative w-full sm:w-48">
        <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Template</label>
        <div class="relative">
          <select
            v-model="selectedTemplate"
            class="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option :value="null">Select Template</option>
            <option v-for="template in cardTemplates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
          <ChevronDown :size="16" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="flex gap-6">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ filteredStudents.length }} students</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ studentsWithPhotos }} have photos</span>
      </div>
      <button
        @click="showPhotoUpload = !showPhotoUpload"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
      >
        <Upload :size="14" />
        Upload Photos
      </button>
    </div>

    <!-- Photo Upload Section -->
    <div v-if="showPhotoUpload" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Upload Student Photos</h3>

      <div class="space-y-4">
        <!-- Upload Area -->
        <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png"
            @change="handlePhotoUpload"
            class="hidden"
            id="photo-upload-input"
          />
          <label
            for="photo-upload-input"
            class="cursor-pointer flex flex-col items-center gap-2"
          >
            <ImageIcon :size="32" class="text-gray-400" />
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Click to select photos or drag and drop
            </span>
            <span class="text-xs text-gray-400">
              JPEG, JPG, PNG up to 5MB each
            </span>
          </label>
        </div>

        <!-- Photo Previews -->
        <div v-if="photoFiles.length > 0" class="space-y-3">
          <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {{ photoFiles.length }} photo(s) selected
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div
              v-for="(photo, index) in photoFiles"
              :key="index"
              class="relative group"
            >
              <img
                :src="photo.preview"
                alt="Preview"
                class="w-full aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700"
              />
              <button
                @click="removePhoto(index)"
                class="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X :size="12" />
              </button>
              <div class="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded truncate">
                Student ID: {{ photo.student_id }}
              </div>
            </div>
          </div>

          <!-- Upload Button -->
          <button
            @click="handleUploadPhotos"
            :disabled="isUploadingPhotos"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            <Upload :size="16" />
            {{ isUploadingPhotos ? 'Uploading...' : 'Upload Photos' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Selection Table -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            Selection
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Cards with no photo are skipped & listed
          </p>
        </div>
      </div>

      <!-- Table Header -->
      <div class="grid grid-cols-[40px_1fr_1fr_1fr] gap-4 px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            :checked="selectAll"
            :indeterminate="selectedStudents.size > 0 && selectedStudents.size < eligibleStudents.length"
            @change="toggleSelectAll"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
          />
        </div>
        <span>Student ID</span>
        <span>Name</span>
        <span>Card Status</span>
      </div>

      <!-- Table Body -->
      <div v-if="filteredStudents.length === 0" class="px-4 py-12 text-center">
        <p class="text-sm font-medium text-gray-400">No students found</p>
        <p class="text-xs text-gray-400 mt-1">Select a batch to view students</p>
      </div>

      <div
        v-for="student in filteredStudents"
        :key="student.id"
        class="grid grid-cols-[40px_1fr_1fr_1fr] gap-4 px-4 py-3 items-center border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors"
        :class="{ 'opacity-50': !student.photo_path || student.enrollment_status !== 'Enrolled' }"
      >
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            :checked="selectedStudents.has(student.id)"
            :disabled="!student.photo_path || student.enrollment_status !== 'Enrolled'"
            @change="toggleStudent(student.id)"
            class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <span class="text-sm font-mono text-gray-900 dark:text-white">{{ student.student_id_no || '—' }}</span>
        <span class="text-sm font-medium text-gray-900 dark:text-white">{{ student.full_name }}</span>
        <div class="flex items-center gap-2">
          <!-- Photo Status -->
          <div v-if="getPhotoStatus(student) === 'has'" class="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <Check :size="12" class="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div v-else class="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20">
            <X :size="12" class="text-red-600 dark:text-red-400" />
          </div>
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ getCardStatus(student) }}</span>
        </div>
      </div>
    </div>

    <!-- A4 Sheet Preview -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">A4 sheet preview</h3>
        <span class="text-xs text-gray-500 dark:text-gray-400">3 students / page (front + back)</span>
      </div>

      <div class="flex justify-center">
        <div class="relative bg-white border-2 border-gray-300 rounded overflow-hidden" style="width: 210mm; height: 297mm; max-width: 100%; aspect-ratio: 210/297;">
          <!-- Grid of 6 card sides (3 students × front + back) -->
          <div class="grid grid-cols-2 grid-rows-3 gap-3 p-4 w-full h-full">
            <template v-for="(slot, index) in previewCardSlots" :key="index">
              <div v-if="slot.student" class="border border-gray-200 rounded bg-white shadow-sm overflow-hidden flex items-center justify-center">
                <div class="shrink-0" style="transform: scale(1.0); transform-origin: center center;">
                  <StudentCard
                    :student="slot.student"
                    :layout="selectedLayout"
                    size="sm"
                    :showActions="false"
                    :generated="false"
                    :showBack="slot.showBack"
                  />
                </div>
              </div>
              <div v-else class="border border-dashed border-gray-200 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                Empty
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden offscreen cards for batch PDF generation -->
  <!-- NOTE: must NOT use display:none / class=hidden — cards need to be rendered in DOM for html2canvas to capture them -->
  <div
    v-if="batchGeneratingStudentIds.size > 0"
    id="batch-generation-cards"
    style="position: fixed; left: -9999px; top: 0; z-index: -1; pointer-events: none;"
  >
    <template v-for="id in batchGeneratingStudentIds" :key="'batch-'+id">
      <!-- Front side wrapper -->
      <div>
        <StudentCard
          :student="students.find(s => s.id === id) || null"
          :layout="selectedLayout"
          size="sm"
          :showActions="false"
          :generated="false"
          :showBack="false"
        />
      </div>
      <!-- Back side wrapper -->
      <div>
        <StudentCard
          :student="students.find(s => s.id === id) || null"
          :layout="selectedLayout"
          size="sm"
          :showActions="false"
          :generated="false"
          :showBack="true"
        />
      </div>
    </template>
  </div>

  <!-- Generate Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Generate</h3>

      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ eligibleStudents.length }} cards → {{ totalPages }} A4 pages. Runs as a background job; you'll get a download when ready.
        </p>

        <!-- Progress Bar -->
        <div v-if="isGenerating" class="space-y-2">
          <div class="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Generating...</span>
            <span>{{ generationProgress }} / {{ generationTotal }}</span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${(generationProgress / generationTotal) * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- Generate Button -->
        <button
          @click="handleGenerate"
          :disabled="isGenerating || !selectedBatch"
          class="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          <Download :size="16" />
          {{ isGenerating ? 'Generating...' : 'Generate batch PDF' }}
        </button>
      </div>
    </div>
  </div>
</template>
