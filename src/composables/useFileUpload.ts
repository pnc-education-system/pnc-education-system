import { ref, computed } from 'vue'
import { useToast } from '@/composables/useToast'

export const ACCEPTED_TYPES = ['xlsx'] as const
export const ACCEPTED_EXTENSIONS = ACCEPTED_TYPES.map((t) => `.${t}`).join(', ')
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB (matches backend config)
export const MAX_FILE_SIZE_MB = 10

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
    'student_id_no',
    'full_name',
    'gender',
    'dob',
    'intake_year',
    'province',
    'phone',
    'email',
    'high_school',
  ]

  const sampleRows: string[][] = [
    ['ST0001', 'John Doe', 'Male', '2005-01-15', '2024', 'Phnom Penh', '012-345-678', 'john.doe@example.com', 'High School A'],
    ['ST0002', 'Jane Smith', 'Female', '2006-03-22', '2024', 'Kandal', '098-765-432', 'jane.smith@example.com', 'High School B'],
    ['ST0003', 'Sok Chea', 'Male', '2005-07-10', '2025', 'Takeo', '011-223-344', 'sok.chea@example.com', 'High School C'],
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
    if (files && files.length > 0 && files[0]) {
      processFile(files[0])
    }
  }

  function onChooseFile(): void {
    clearUploadError()
    fileInputRef.value?.click()
  }

  function onFileInputChange(e: Event): void {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0 && input.files[0]) {
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
      return `${base} border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-[1.01]`
    }
    if (selectedFile.value) {
      return `${base} border-green-400 dark:border-green-600 bg-green-50/50 dark:bg-green-900/20`
    }
    return `${base} border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20`
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
