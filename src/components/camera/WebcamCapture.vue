<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useCamera } from '@/composables/useCamera'
import { useImageCrop } from '@/composables/useImageCrop'

const props = defineProps<{
  existingPhotoUrl?: string | null
}>()

const emit = defineEmits<{
  save: [blob: Blob | null]
}>()

const camera = useCamera()
const crop = useImageCrop()

const showCamera = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)
const capturedBlob = ref<Blob | null>(null)
const capturedDataUrl = ref<string | null>(null)
const previewUrl = ref<string | null>(null)
const cameraMode = ref<'user' | 'environment'>('user')
const fallbackInput = ref<HTMLInputElement | null>(null)
const isCroppingOpen = ref(false)
const cameraBusy = ref(false)

const hasPhoto = computed(() => !!(previewUrl.value || capturedDataUrl.value))

let applied = false
async function withCrop(src: string, done: (blob: Blob | null) => void) {
  if (applied) return
  applied = true
  const img = new Image()
  img.onload = async () => {
    const blob = await crop.cropToBlob(img)
    done(blob)
  }
  img.src = src
  if (img.complete && img.naturalWidth > 0) {
    img.onload = null
    const blob = await crop.cropToBlob(img)
    done(blob)
  }
}

async function startCamera() {
  cameraBusy.value = true
  camera.error.value = null
  showCamera.value = true
  for (let i = 0; i < 20; i++) {
    await nextTick()
    if (videoRef.value) break
    await new Promise((r) => setTimeout(r, 100))
  }
  if (!videoRef.value) {
    camera.error.value = { message: 'Camera element not found.', type: 'unknown' }
    cameraBusy.value = false
    return
  }
  await camera.start(videoRef.value, cameraMode.value)
  cameraBusy.value = false
}

function closeCamera() { camera.stop(); showCamera.value = false }

function flipCamera() {
  cameraMode.value = cameraMode.value === 'user' ? 'environment' : 'user'
  if (videoRef.value) { camera.error.value = null; camera.start(videoRef.value, cameraMode.value) }
}

async function capture() {
  if (!videoRef.value) return
  const blob = await camera.capture(videoRef.value)
  if (!blob) return
  capturedBlob.value = blob
  const url = URL.createObjectURL(blob)
  capturedDataUrl.value = url
  camera.stop()
  showCamera.value = false
  applied = false
  await nextTick()
  isCroppingOpen.value = true
}

function pickFile() { fallbackInput.value?.click() }

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  revokeUrls()
  const url = URL.createObjectURL(file)
  capturedDataUrl.value = url
  capturedBlob.value = file
  if (showCamera.value) closeCamera()
  applied = false
  nextTick(() => { isCroppingOpen.value = true })
}

function revokeUrls() {
  if (capturedDataUrl.value) URL.revokeObjectURL(capturedDataUrl.value)
  if (previewUrl.value && previewUrl.value !== capturedDataUrl.value) URL.revokeObjectURL(previewUrl.value)
}

function removePhoto() {
  revokeUrls()
  capturedBlob.value = null
  capturedDataUrl.value = null
  previewUrl.value = null
  crop.reset()
  isCroppingOpen.value = false
  emit('save', null)
}

function useExisting() {
  if (props.existingPhotoUrl) {
    previewUrl.value = props.existingPhotoUrl
  }
}

function applyCrop() {
  if (!capturedDataUrl.value) return
  withCrop(capturedDataUrl.value, (blob) => {
    if (blob) {
      revokeUrls()
      capturedBlob.value = blob
      const url = URL.createObjectURL(blob)
      capturedDataUrl.value = url
      previewUrl.value = url
    } else {
      previewUrl.value = capturedDataUrl.value
    }
    crop.reset()
    isCroppingOpen.value = false
    emit('save', capturedBlob.value)
  })
}

function retake() {
  revokeUrls()
  capturedBlob.value = null
  capturedDataUrl.value = null
  previewUrl.value = null
  crop.reset()
  isCroppingOpen.value = false
  startCamera()
}

let dragH = ''
let dragO = { x: 0, y: 0 }

function onDragStart(e: PointerEvent, handle: string) {
  e.preventDefault(); e.stopPropagation()
  ;(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId)
  dragH = handle; dragO = { x: e.clientX, y: e.clientY }
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', onDragEnd)
}

function onDragMove(e: PointerEvent) {
  if (!dragH) return
  const r = crop.applyDrag(dragO.x, dragO.y, e.clientX, e.clientY, dragH)
  dragO = r
}

function onDragEnd() { dragH = ''; document.removeEventListener('pointermove', onDragMove); document.removeEventListener('pointerup', onDragEnd) }
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <!-- Final photo -->
    <div v-if="hasPhoto" class="relative w-24 h-24 rounded-xl overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700 shadow-sm">
      <img :src="previewUrl || capturedDataUrl" class="w-full h-full object-cover" alt="" />
      <button type="button" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[11px] font-bold shadow-sm cursor-pointer hover:bg-red-600" @click="removePhoto">&times;</button>
    </div>

    <!-- Existing photo -->
    <div v-else-if="props.existingPhotoUrl" class="relative w-24 h-24 rounded-xl overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700 cursor-pointer group" @click="useExisting">
      <img :src="props.existingPhotoUrl" class="w-full h-full object-cover" alt="" />
      <div class="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-white text-[10px] font-semibold">Use</span>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="w-24 h-24 rounded-xl bg-gray-50 dark:bg-gray-800/50 ring-2 ring-gray-100 dark:ring-gray-700 flex items-center justify-center text-gray-300 dark:text-gray-600">
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
      </svg>
    </div>

    <!-- Buttons -->
    <div class="flex gap-2">
      <button type="button" :disabled="cameraBusy" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 transition-colors cursor-pointer dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20" @click="startCamera">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
        </svg>
        Camera
      </button>
      <button type="button" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-700/50" @click="pickFile">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        Upload
      </button>
    </div>

    <input ref="fallbackInput" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFilePicked" />

    <!-- ═══ CAMERA MODAL ═══ -->
    <Teleport to="body">
      <div v-if="showCamera" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="closeCamera">
        <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full" @click.stop>
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Capture Photo</h3>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer" @click="closeCamera">
              <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 6 6 18" /><path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div class="relative bg-black min-h-[240px] flex items-center justify-center overflow-hidden">
            <video ref="videoRef" autoplay playsinline muted class="w-full aspect-[4/3] object-cover" />
            <div v-if="!camera.isActive && !camera.error" class="absolute inset-0 flex items-center justify-center bg-black/60 text-white/70 text-sm">
              <svg class="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32" /></svg>
              Starting camera...
            </div>
            <div v-if="camera.error" class="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-black/80 px-4 py-2.5">
              <span class="text-white/90 text-xs">{{ camera.error.message }}</span>
              <button type="button" class="shrink-0 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-semibold transition-colors cursor-pointer" @click="closeCamera(); pickFile()">Upload instead</button>
            </div>
          </div>
          <div class="px-4 py-3 flex items-center justify-between">
            <button type="button" class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" @click="flipCamera">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
              Flip
            </button>
            <button type="button" :disabled="!camera.isActive" class="w-14 h-14 rounded-full border-4 border-blue-500 bg-white hover:bg-gray-100 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2" @click="capture"></button>
            <button type="button" class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700" @click="pickFile">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
              Browse
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ═══ CROP MODAL ═══ -->
    <Teleport to="body">
      <div v-if="isCroppingOpen && capturedDataUrl" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="retake">
        <div class="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full" @click.stop>
          <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Crop Photo</h3>
            <button type="button" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer" @click="retake">
              <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>
          <div class="relative bg-gray-900 flex items-center justify-center overflow-hidden max-h-[60vh]">
            <img id="crop-preview" :src="capturedDataUrl" class="max-w-full max-h-[60vh] w-full h-auto object-contain select-none" alt="" draggable="false" @load="crop.initFromImage($event.target as HTMLImageElement)" />
            <template v-if="crop.imageLoaded">
              <div class="absolute inset-0 bg-black/40 pointer-events-none" :style="{ clipPath: crop.displayCrop().clip }"></div>
              <div class="absolute border-2 border-white pointer-events-none" :style="{ left: crop.displayCrop().left, top: crop.displayCrop().top, width: crop.displayCrop().width, height: crop.displayCrop().height }">
                <span class="absolute -top-1.5 -left-1.5 w-3 h-3 border-2 border-white bg-white/40 cursor-nw-resize pointer-events-auto rounded-sm" @pointerdown.stop="onDragStart($event, 'nw')"></span>
                <span class="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 border-white bg-white/40 cursor-ne-resize pointer-events-auto rounded-sm" @pointerdown.stop="onDragStart($event, 'ne')"></span>
                <span class="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-2 border-white bg-white/40 cursor-sw-resize pointer-events-auto rounded-sm" @pointerdown.stop="onDragStart($event, 'sw')"></span>
                <span class="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-2 border-white bg-white/40 cursor-se-resize pointer-events-auto rounded-sm" @pointerdown.stop="onDragStart($event, 'se')"></span>
              </div>
            </template>
          </div>
          <div class="px-4 py-3 flex items-center justify-end gap-2">
            <button type="button" class="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700" @click="retake">Retake</button>
            <button type="button" class="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer" @click="applyCrop">Apply</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
