<script setup lang="ts">
import { ref } from 'vue'
import type { Student } from '@/types'
import { Download, Printer, Share2, Shield, Check } from 'lucide-vue-next'

const props = defineProps<{ student: Student }>()
const downloadSuccess = ref(false)
const printSuccess = ref(false)
const shareSuccess = ref(false)

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function resolvePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'
  const apiOrigin = new URL(apiBase).origin
  if (path.startsWith('/storage/')) return `${apiOrigin}${path}`
  if (path.startsWith('storage/')) return `${apiOrigin}/${path}`
  return `${apiOrigin}/storage/${path.replace(/^\/+/, '')}`
}

async function generateCardCanvas(): Promise<HTMLCanvasElement> {
  const s = props.student
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const width = 600
  const height = 378 // 1.586:1 aspect ratio
  canvas.width = width
  canvas.height = height

  // ── Background gradient ──
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#64748b')
  gradient.addColorStop(0.5, '#475569')
  gradient.addColorStop(1, '#334155')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(0, 0, width, height, 20)
  ctx.fill()

  // ── Decorative circles ──
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.beginPath()
  ctx.arc(width - 60, -40, 120, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-30, height + 20, 80, 0, Math.PI * 2)
  ctx.fill()

  // ── Radial highlights ──
  const radialGrad = ctx.createRadialGradient(width - 80, 40, 0, width - 80, 40, 200)
  radialGrad.addColorStop(0, 'rgba(255,255,255,0.06)')
  radialGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = radialGrad
  ctx.fillRect(0, 0, width, height)

  const radialGrad2 = ctx.createRadialGradient(60, height - 60, 0, 60, height - 60, 150)
  radialGrad2.addColorStop(0, 'rgba(255,255,255,0.03)')
  radialGrad2.addColorStop(1, 'transparent')
  ctx.fillStyle = radialGrad2
  ctx.fillRect(0, 0, width, height)

  // ── Top section: Logo + Header ──
  ctx.fillStyle = '#94a3b8'
  ctx.font = 'bold 18px Inter, sans-serif'
  ctx.fillText('PNC', 28, 40)
  ctx.fillStyle = '#cbd5e1'
  ctx.font = '10px Inter, sans-serif'
  ctx.fillText('EDUCATION SYSTEM', 28, 56)

  // Shield icon
  ctx.fillStyle = '#94a3b8'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('🛡', width - 28, 40)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px Inter, sans-serif'
  ctx.fillText('STUDENT', width - 28, 56)
  ctx.textAlign = 'left'

  // ── Divider line ──
  const midY = height / 2
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(28, midY)
  ctx.lineTo(width - 28, midY)
  ctx.stroke()

  // ── Photo / Initials ──
  const photoSize = 70
  const photoX = 28
  const photoY = midY - 50

  // If photo exists, try to draw it
  const photoUrl = resolvePhotoUrl(s.photoPath)
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl)
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(photoX, photoY, photoSize, photoSize, 10)
      ctx.clip()
      ctx.drawImage(img, photoX, photoY, photoSize, photoSize)
      ctx.restore()
    } catch {
      // Fallback to initials
      drawInitials(ctx, photoX, photoY, photoSize, s.fullName)
    }
  } else {
    drawInitials(ctx, photoX, photoY, photoSize, s.fullName)
  }

  // ── Student info ──
  const infoX = photoX + photoSize + 20
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 18px Inter, sans-serif'
  ctx.fillText(truncateText(ctx, s.fullName, 280), infoX, photoY + 24)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '12px monospace'
  ctx.fillText(s.studentIdNo, infoX, photoY + 48)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '10px Inter, sans-serif'
  ctx.fillText(`${s.selectionBatchName || 'Batch B'} · Intake ${s.intakeYear || '2025'}`, infoX, photoY + 66)

  // ── Details grid ──
  const gridY = midY + 20
  const col1X = 28
  const col2X = width / 2 + 10
  const rowGap = 22

  function drawDetail(x: number, y: number, label: string, value: string) {
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px Inter, sans-serif'
    ctx.fillText(label.toUpperCase(), x, y)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 12px Inter, sans-serif'
    ctx.fillText(value, x, y + 16)
  }

  drawDetail(col1X, gridY, 'Gender', s.gender || '—')
  drawDetail(col2X, gridY, 'DOB', s.dob ? formatDate(s.dob) : '—')
  drawDetail(col1X, gridY + rowGap, 'Province', s.province || '—')
  drawDetail(col2X, gridY + rowGap, 'Batch', s.selectionBatchName || '—')

  // ── Bottom line ──
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.moveTo(28, height - 38)
  ctx.lineTo(width - 28, height - 38)
  ctx.stroke()

  ctx.fillStyle = '#94a3b8'
  ctx.font = '9px Inter, sans-serif'
  ctx.fillText(`Valid academic year ${s.intakeYear || '2025'}`, 28, height - 20)

  // Small squares
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.beginPath()
  ctx.roundRect(width - 60, height - 32, 22, 14, 4)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(width - 34, height - 32, 22, 14, 4)
  ctx.fill()

  return canvas
}

function drawInitials(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, name: string) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 10)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(getInitials(name), x + size / 2, y + size / 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '...'
}

async function downloadCard() {
  try {
    const canvas = await generateCardCanvas()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.student.fullName.replace(/\s+/g, '_').toLowerCase()}_id_card.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadSuccess.value = true
    setTimeout(() => { downloadSuccess.value = false }, 2000)
  } catch (err) {
    console.error('Failed to download ID card:', err)
  }
}

function printCard() {
  const s = props.student
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const closeScript = '</' + 'script>'
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ID Card - ${s.fullName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f1f5f9;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .card {
          width: 340px;
          border-radius: 16px;
          overflow: hidden;
          background: linear-gradient(135deg, #64748b, #475569, #334155);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          color: white;
          padding: 24px;
          position: relative;
        }
        .card::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .card::after {
          content: '';
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .logo { font-size: 14px; font-weight: bold; letter-spacing: 2px; color: #cbd5e1; }
        .logo-sub { font-size: 10px; letter-spacing: 3px; color: #94a3b8; margin-top: 2px; }
        .badge { font-size: 10px; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
        .mid-section {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px;
        }
        .avatar {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          background: rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .info h3 { font-size: 15px; font-weight: bold; }
        .info .id { font-size: 11px; color: #e2e8f0; font-family: monospace; margin-top: 4px; }
        .info .meta { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 16px;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 16px;
        }
        .detail-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .detail-value { font-size: 11px; font-weight: 600; margin-top: 2px; }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.1);
          font-size: 9px;
          color: #94a3b8;
        }
        .boxes { display: flex; gap: 4px; }
        .box { width: 22px; height: 14px; border-radius: 4px; background: rgba(255,255,255,0.1); }
        @media print {
          body { background: white; }
          .card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div>
            <div class="logo">PNC</div>
            <div class="logo-sub">Education System</div>
          </div>
          <div class="badge">🛡 STUDENT</div>
        </div>
        <div class="mid-section">
          <div class="avatar">${s.photoPath ? '<img src="' + resolvePhotoUrl(s.photoPath) + '" alt="' + s.fullName + '" />' : getInitials(s.fullName)}</div>
          <div class="info">
            <h3>${s.fullName}</h3>
            <div class="id">${s.studentIdNo}</div>
            <div class="meta">${s.selectionBatchName || 'Batch B'} · Intake ${s.intakeYear || '2025'}</div>
          </div>
        </div>
        <div class="details">
          <div><div class="detail-label">Gender</div><div class="detail-value">${s.gender || '—'}</div></div>
          <div><div class="detail-label">DOB</div><div class="detail-value">${s.dob ? formatDate(s.dob) : '—'}</div></div>
          <div><div class="detail-label">Province</div><div class="detail-value">${s.province || '—'}</div></div>
          <div><div class="detail-label">Batch</div><div class="detail-value">${s.selectionBatchName || '—'}</div></div>
        </div>
        <div class="footer">
          <span>Valid academic year ${s.intakeYear || '2025'}</span>
          <div class="boxes"><div class="box"></div><div class="box"></div></div>
        </div>
      </div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      ${closeScript}
    </body>
    </html>
  `)
  printWindow.document.close()
  printSuccess.value = true
  setTimeout(() => { printSuccess.value = false }, 2000)
}

async function shareCard() {
  try {
    const canvas = await generateCardCanvas()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File([blob], `${props.student.fullName.replace(/\s+/g, '_').toLowerCase()}_id_card.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `ID Card - ${props.student.fullName}`,
        text: `Student ID Card for ${props.student.fullName} (${props.student.studentIdNo})`,
        files: [file],
      })
      shareSuccess.value = true
      setTimeout(() => { shareSuccess.value = false }, 2000)
    } else {
      // Fallback: share via clipboard
      await navigator.clipboard.writeText(
        `ID Card - ${props.student.fullName}\nStudent ID: ${props.student.studentIdNo}\nBatch: ${props.student.selectionBatchName || '—'}`
      )
      // Also try to copy the image
      try {
        const clipboardItem = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([clipboardItem])
      } catch { /* ignore */ }
      shareSuccess.value = true
      setTimeout(() => { shareSuccess.value = false }, 3000)
    }
  } catch (err) {
    if ((err as Error)?.name !== 'AbortError') {
      console.error('Failed to share ID card:', err)
    }
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- ID Card Preview -->
    <div class="relative max-w-[340px] mx-auto">
      <div class="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1" style="aspect-ratio: 1.586 / 1;">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.06)_0%,_transparent_60%)]"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.03)_0%,_transparent_50%)]"></div>
        <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5"></div>
        <div class="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5"></div>
        <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div class="relative p-5 sm:p-6 h-full flex flex-col">
          <div class="flex items-center justify-between mb-auto">
            <div>
              <p class="text-[11px] font-bold text-gray-200 uppercase tracking-[0.15em]">PNC</p>
              <p class="text-[7px] text-gray-300 uppercase tracking-[0.2em] font-medium">Education System</p>
            </div>
            <div class="flex items-center gap-1.5">
              <Shield :size="16" class="text-gray-300" />
              <span class="text-[7px] text-gray-300 uppercase tracking-wider font-medium">Student</span>
            </div>
          </div>

          <div class="flex items-center gap-4 mt-4 mb-auto">
            <div class="w-[60px] h-[60px] rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm ring-2 ring-white/10 shadow-lg overflow-hidden">
            <img v-if="student.photoPath" :src="resolvePhotoUrl(student.photoPath) ?? undefined" :alt="student.fullName" class="w-full h-full object-cover" />
            <span v-else class="text-xl font-bold text-white">{{ getInitials(student.fullName) }}</span>
          </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-white leading-tight truncate">{{ student.fullName }}</h3>
              <p class="text-[10px] text-gray-200 font-mono mt-1">{{ student.studentIdNo }}</p>
              <p class="text-[9px] text-gray-300 mt-0.5 truncate">{{ student.selectionBatchName || 'Batch B' }} · Intake {{ student.intakeYear || '2025' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-auto pt-3 border-t border-white/10">
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[44px]">Gender</span><span class="text-[10px] text-white font-semibold">{{ student.gender || '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[28px]">DOB</span><span class="text-[10px] text-white font-semibold truncate">{{ student.dob ? new Date(student.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[44px]">Province</span><span class="text-[10px] text-white font-semibold truncate">{{ student.province || '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[28px]">Batch</span><span class="text-[10px] text-white font-semibold truncate">{{ student.selectionBatchName || '—' }}</span></div>
          </div>

          <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
            <p class="text-[7px] text-gray-300">Valid academic year {{ student.intakeYear || '2025' }}</p>
            <div class="flex gap-1"><div class="w-5 h-3 rounded-sm bg-white/10"></div><div class="w-5 h-3 rounded-sm bg-white/10"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm mx-auto">
      <button @click="downloadCard" class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm" :class="{ 'bg-green-50 dark:bg-green-900/30': downloadSuccess }">
          <Download v-if="!downloadSuccess" :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          <Check v-else :size="18" class="text-green-500 dark:text-green-400 scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold" :class="downloadSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ downloadSuccess ? 'Downloaded!' : 'Download' }}</span>
      </button>
      <button @click="printCard" class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm" :class="{ 'bg-green-50 dark:bg-green-900/30': printSuccess }">
          <Printer v-if="!printSuccess" :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          <Check v-else :size="18" class="text-green-500 dark:text-green-400 scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold" :class="printSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ printSuccess ? 'Printing...' : 'Print' }}</span>
      </button>
      <button @click="shareCard" class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm" :class="{ 'bg-green-50 dark:bg-green-900/30': shareSuccess }">
          <Share2 v-if="!shareSuccess" :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          <Check v-else :size="18" class="text-green-500 dark:text-green-400 scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold" :class="shareSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ shareSuccess ? 'Shared!' : 'Share' }}</span>
      </button>
    </div>
  </div>
</template>
