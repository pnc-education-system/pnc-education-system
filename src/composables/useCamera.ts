import { ref, onUnmounted } from 'vue'

export interface CameraError {
  message: string
  type: 'denied' | 'not-found' | 'busy' | 'unsupported' | 'unknown'
}

export function useCamera() {
  const stream = ref<MediaStream | null>(null)
  const error = ref<CameraError | null>(null)
  const isActive = ref(false)

  async function start(video: HTMLVideoElement, mode: 'user' | 'environment' = 'user') {
    stop()
    error.value = null

    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = { message: 'Camera not supported in this browser.', type: 'unsupported' }
      return
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      })
      video.srcObject = s
      await video.play()
      stream.value = s
      isActive.value = true
    } catch (e) {
      isActive.value = false
      error.value = classifyError(e)
    }
  }

  function stop() {
    if (stream.value) {
      stream.value.getTracks().forEach((t) => t.stop())
      stream.value = null
    }
    isActive.value = false
  }

  function capture(video: HTMLVideoElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!isActive.value || !video.videoWidth) return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(video, 0, 0)
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    })
  }

  onUnmounted(stop)

  return { stream, error, isActive, start, stop, capture }
}

function classifyError(err: unknown): CameraError {
  if (!(err instanceof Error)) {
    return { message: 'Camera could not be accessed.', type: 'unknown' }
  }
  const name = (err as DOMException).name || ''

  if (!navigator.mediaDevices?.getUserMedia) {
    return { message: 'Camera not supported in this browser.', type: 'unsupported' }
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return { message: 'Camera permission was denied.', type: 'denied' }
  }
  if (name === 'NotFoundError') {
    return { message: 'No camera found on this device.', type: 'not-found' }
  }
  if (name === 'NotReadableError') {
    return { message: 'Camera is busy or in use by another app.', type: 'busy' }
  }
  if (name === 'NotSupportedError') {
    return { message: 'Camera not supported in this browser.', type: 'unsupported' }
  }
  return { message: 'Camera access failed. Please check browser permissions.', type: 'unknown' }
}
