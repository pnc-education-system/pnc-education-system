import { ref, computed } from 'vue'
import { useToast } from '@/composables/useToast'

export const ACCEPTED_TYPES = ['csv', 'xlsx'] as const
export const ACCEPTED_EXTENSIONS = ACCEPTED_TYPES.map((t) => `.${t}`).join(', ')
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
export const MAX_FILE_SIZE_MB = 25

export type AcceptedType = (typeof ACCEPTED_TYPES)[number]

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function getFileExtension(file: File): string | null {
  const parts = file.name.split('.')
  if (parts.length < 2) return null
  return parts.pop()?.toLowerCase() ?? null
}

export function isAcceptedType(ext: string | null): ext is AcceptedType {
  return ext !== null && (ACCEPTED_TYPES as readonly string[]).includes(ext)
}

export function downloadSampleCsv(): void {
  const headers = [
    'Student ID',
    'Full Name',
    'Date of Birth',
    'Gender',
    'Phone Number',
    'Email',
    'Program',
    'Batch',
    'Enrollment Date',
  ]

  const sampleRows: string[][] = [
    ['STU-001', 'John Doe', '01/15/2005', 'Male', '012-345-678', 'john.doe@example.com', 'BS Computer Science', '2024-A', '09/01/2024'],
    ['STU-002', 'Jane Smith', '03/22/2006', 'Female', '098-765-432', 'jane.smith@example.com', 'BS Information Technology', '2024-A', '09/01/2024'],
    ['STU-003', 'Sok Chea', '07/10/2005', 'Male', '011-223-344', 'sok.chea@example.com', 'BS Business Administration', '2024-B', '01/15/2025'],
  ]

  const bom = '\uFEFF'
  const headerRow = headers.join(',')
  const dataRows = sampleRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
  const csvContent = bom + headerRow + '\n' + dataRows + '\n'

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'enrollment_template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function useFileUpload() {
  const { showErrorToast } = useToast()

  const isDragOver = ref(false)
  const selectedFile = ref<File | null>(null)
  const uploadError = ref<string | null>(null)
  const fileInputRef = ref<HTMLInputElement | null>(null)

  const canContinue = computed(() => selectedFile.value !== null)

  function clearUploadError(): void {
    uploadError.value = null
  }

  function onDragEnter(e: DragEvent): void {
    e.stopPropagation()
    isDragOver.value = true
    clearUploadError()
  }

  function onDragOver(e: DragEvent): void {
    e.stopPropagation()
    isDragOver.value = true
  }

  function onDragLeave(e: DragEvent): void {
    e.stopPropagation()
    isDragOver.value = false
  }

  function onDrop(e: DragEvent): void {
    e.stopPropagation()
    isDragOver.value = false

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  function onChooseFile(): void {
    clearUploadError()
    fileInputRef.value?.click()
  }

  function onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
      processFile(input.files[0])
    }
    input.value = ''
  }

  function processFile(file: File): void {
    clearUploadError()

    const ext = getFileExtension(file)
    if (!isAcceptedType(ext)) {
      const msg = `Invalid file type ".${ext ?? '(none)'}". Accepted file types: ${ACCEPTED_EXTENSIONS}`
      uploadError.value = msg
      showErrorToast(msg, 'Invalid File Type')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const actualSize = formatFileSize(file.size)
      const msg = `File is too large (${actualSize}). Maximum file size: ${MAX_FILE_SIZE_MB} MB`
      uploadError.value = msg
      showErrorToast(msg, 'File Too Large')
      return
    }

    selectedFile.value = file
  }

  function removeFile(): void {
    selectedFile.value = null
    clearUploadError()
  }

  const dropZoneClasses = computed(() => {
    const base =
      'relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer outline-none'
    if (uploadError.value && !selectedFile.value) {
      return `${base} border-red-300 dark:border-red-500 bg-red-50/50 dark:bg-red-900/10`
    }
    if (isDragOver.value) {
      return `${base} border-[#355C8C] dark:border-blue-400 bg-[#355C8C]/5 dark:bg-blue-900/20 scale-[1.01]`
    }
    if (selectedFile.value) {
      return `${base} border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20`
    }
    return `${base} border-gray-300 dark:border-gray-600 hover:border-[#355C8C] dark:hover:border-blue-400 hover:bg-[#355C8C]/5 dark:hover:bg-blue-900/20`
  })

  return {
    isDragOver,
    selectedFile,
    uploadError,
    fileInputRef,
    canContinue,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
    onChooseFile,
    onFileInputChange,
    removeFile,
    clearUploadError,
    dropZoneClasses,
  }
}
