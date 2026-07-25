import { ref } from 'vue'

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export function useImageCrop() {
  const cropBox = ref<CropBox>({ x: 0, y: 0, width: 0, height: 0 })
  const imageNatural = ref({ width: 0, height: 0 })
  const imageLoaded = ref(false)
  const imageEl = ref<HTMLImageElement | null>(null)

  function initFromImage(img: HTMLImageElement) {
    imageEl.value = img
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    imageNatural.value = { width: nw, height: nh }
    const size = Math.min(nw, nh)
    cropBox.value = {
      x: Math.round((nw - size) / 2),
      y: Math.round((nh - size) / 2),
      width: size,
      height: size,
    }
    imageLoaded.value = true
  }

  /**
   * Convert viewport coordinates to natural image coordinates
   * using getBoundingClientRect() for pixel-perfect mapping.
   */
  function viewportToNatural(vpX: number, vpY: number): { x: number; y: number } {
    const img = imageEl.value
    if (!img) return { x: 0, y: 0 }
    const rect = img.getBoundingClientRect()
    const scaleX = img.naturalWidth / rect.width
    const scaleY = img.naturalHeight / rect.height
    return {
      x: (vpX - rect.left) * scaleX,
      y: (vpY - rect.top) * scaleY,
    }
  }

  /**
   * Apply a drag from viewport start coords to viewport current coords.
   * Returns updated { x, y } to set as next dragOrigin.
   */
  function applyDrag(startVpX: number, startVpY: number, currentVpX: number, currentVpY: number, handle: string): { x: number; y: number } {
    const start = viewportToNatural(startVpX, startVpY)
    const current = viewportToNatural(currentVpX, currentVpY)
    const dx = current.x - start.x
    const dy = current.y - start.y
    const nw = imageNatural.value.width
    const nh = imageNatural.value.height

    if (handle === 'move') {
      cropBox.value = {
        ...cropBox.value,
        x: clamp(cropBox.value.x + dx, 0, nw - cropBox.value.width),
        y: clamp(cropBox.value.y + dy, 0, nh - cropBox.value.height),
      }
      return { x: currentVpX, y: currentVpY }
    }

    let { x, y, width, height } = cropBox.value

    if (handle.includes('e')) {
      width = clamp(width + dx, 50, nw - x)
    }
    if (handle.includes('w')) {
      const newW = clamp(width - dx, 50, nw)
      x += width - newW
      width = newW
    }
    if (handle.includes('s')) {
      height = clamp(height + dy, 50, nh - y)
    }
    if (handle.includes('n')) {
      const newH = clamp(height - dy, 50, nh)
      y += height - newH
      height = newH
    }
    x = clamp(x, 0, nw)
    y = clamp(y, 0, nh)
    cropBox.value = { x, y, width, height }
    return { x: currentVpX, y: currentVpY }
  }

  function cropToBlob(source: HTMLImageElement | HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      const box = cropBox.value
      const w = Math.round(box.width)
      const h = Math.round(box.height)
      if (w < 1 || h < 1) return resolve(null)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, w, h)
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    })
  }

  function reset() {
    cropBox.value = { x: 0, y: 0, width: 0, height: 0 }
    imageNatural.value = { width: 0, height: 0 }
    imageLoaded.value = false
    imageEl.value = null
  }

  const displayCrop = () => {
    const img = imageEl.value
    if (!img || !imageLoaded.value) {
      return { left: '0%', top: '0%', width: '0%', height: '0%', clip: '' }
    }
    const rect = img.getBoundingClientRect()
    const container = img.parentElement
    if (!container) return { left: '0%', top: '0%', width: '0%', height: '0%', clip: '' }

    const cRect = container.getBoundingClientRect()
    const box = cropBox.value
    const nw = imageNatural.value.width
    const nh = imageNatural.value.height

    const imgLeftPct = ((rect.left - cRect.left) / cRect.width) * 100
    const imgTopPct = ((rect.top - cRect.top) / cRect.height) * 100
    const imgWidthPct = (rect.width / cRect.width) * 100
    const imgHeightPct = (rect.height / cRect.height) * 100

    const cropLeftPct = imgLeftPct + (box.x / nw) * imgWidthPct
    const cropTopPct = imgTopPct + (box.y / nh) * imgHeightPct
    const cropWidthPct = (box.width / nw) * imgWidthPct
    const cropHeightPct = (box.height / nh) * imgHeightPct

    const clip = [
      `0% 0%`,
      `100% 0%`,
      `100% 100%`,
      `0% 100%`,
      `0% 0%`,
      `${cropLeftPct}% ${cropTopPct}%`,
      `${cropLeftPct}% ${(cropTopPct + cropHeightPct)}%`,
      `${(cropLeftPct + cropWidthPct)}% ${(cropTopPct + cropHeightPct)}%`,
      `${(cropLeftPct + cropWidthPct)}% ${cropTopPct}%`,
      `${cropLeftPct}% ${cropTopPct}%`,
    ].join(', ')

    return {
      left: `${cropLeftPct}%`,
      top: `${cropTopPct}%`,
      width: `${cropWidthPct}%`,
      height: `${cropHeightPct}%`,
      clip: `polygon(${clip})`,
    }
  }

  return {
    cropBox, imageNatural, imageLoaded, imageEl,
    initFromImage, applyDrag, cropToBlob, reset, displayCrop,
  }
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}
