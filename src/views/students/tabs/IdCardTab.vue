<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Student as AppStudent } from '@/types'
import type { CardStudent } from '@/services/api/cards'
import { resolvePhotoUrl, getInitials } from '@/utils/photoUrl'
import { Download, Printer, Share2, Check, CreditCard, RotateCcw } from 'lucide-vue-next'
import StudentCard from '@/components/cards/StudentCard.vue'

const { t } = useI18n()

const props = defineProps<{ student: AppStudent }>()
const downloadSuccess = ref(false)
const printSuccess = ref(false)
const shareSuccess = ref(false)
const cardContainerRef = ref<HTMLElement | null>(null)

// Card layout state (matching batch card generator)
const selectedLayout = ref<'classic' | 'modern' | 'premium' | 'corporate' | 'corporate-blue' | 'corporate-yellow' | 'official'>('classic')
const showCardBack = ref(false)

const layoutOptions = [
  { id: 'classic' as const, name: 'Classic' },
  { id: 'modern' as const, name: 'Modern' },
  { id: 'premium' as const, name: 'Premium' },
  { id: 'corporate' as const, name: 'Corp' },
  { id: 'corporate-blue' as const, name: 'Corp Blue' },
  { id: 'corporate-yellow' as const, name: 'Corp Yellow' },
  { id: 'official' as const, name: 'Official' },
]

// Map AppStudent to CardStudent (API format)
const cardStudent = computed<CardStudent>(() => {
  const s = props.student
  return {
    id: Number(s.id),
    student_id_no: s.studentIdNo,
    full_name: s.fullName,
    gender: s.gender,
    photo_path: s.photoPath || null,
    dob: s.dob || null,
    province: s.province || null,
    selection_batch_name: s.selectionBatchName || null,
    selection_batch_id: s.selectionBatchId || null,
    enrollment_status: s.status,
    intake_year: s.intakeYear ? Number(s.intakeYear) : null,
    phone: s.phone || null,
    email: s.email || null,
    high_school: s.highSchool || null,
    qr_token: null,
  }
})

function mapStatus(status: string): 'Active' | 'Pending' | 'Inactive' | 'Graduated' {
  const map: Record<string, 'Active' | 'Pending' | 'Inactive' | 'Graduated'> = {
    enrolled: 'Active',
    pending: 'Pending',
    rejected: 'Inactive',
    graduated: 'Graduated',
    dropped: 'Inactive',
    approved: 'Active',
    inactive: 'Inactive',
  }
  return map[status] || 'Pending'
}

async function downloadCard() {
  try {
    const html2canvas = (await import('html2canvas')).default
    const element = cardContainerRef.value
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

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

async function printCard() {
  const s = props.student
  const photoUrl = s.photoPath ? resolvePhotoUrl(s.photoPath, s.id) : null
  const initials = getInitials(s.fullName)
  const batch = s.selectionBatchName || `Batch ${s.intakeYear || ''}`
  const intakeYear = s.intakeYear || new Date().getFullYear().toString()

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
          width: 320px;
          height: 500px;
          border-radius: 16px;
          overflow: hidden;
          background: #ffffff;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .card-header {
          background: linear-gradient(135deg, #1e3a5f, #2563eb);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .card-logo {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-logo svg { width: 24px; height: 24px; color: white; }
        .card-title { color: white; font-size: 14px; font-weight: bold; }
        .card-subtitle { color: rgba(255,255,255,0.7); font-size: 10px; }
        .card-body {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .avatar-wrapper {
          position: relative;
          margin-top: 32px;
          margin-bottom: 12px;
        }
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #1e3a5f;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1e3a5f, #2563eb);
        }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-initials { font-size: 32px; font-weight: bold; color: white; }
        .status-badge {
          position: absolute;
          bottom: -4px;
          right: -4px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #2563eb88;
          background: #2563eb22;
          color: #1e3a5f;
        }
        .student-name { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
        .student-id { font-size: 12px; font-weight: 600; color: #2563eb; margin-bottom: 12px; }
        .detail-pills { display: flex; gap: 8px; margin-bottom: 12px; }
        .pill { padding: 4px 12px; border-radius: 999px; font-size: 11px; background: #f1f5f9; color: #1e293b; }
        .qrcode {
          margin-top: auto;
          margin-bottom: 12px;
          width: 64px;
          height: 64px;
          background: white;
          border-radius: 8px;
          padding: 4px;
          border: 2px solid #2563eb;
        }
        .qrcode-inner {
          width: 100%;
          height: 100%;
          background: #f3f4f6;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qrcode-inner svg { width: 40px; height: 40px; color: #9ca3af; }
        .scan-text { font-size: 10px; color: #9ca3af; }
        .card-footer {
          background: linear-gradient(135deg, #1e3a5f, #2563eb);
          padding: 8px 16px;
          text-align: center;
        }
        .card-footer p { color: white; font-size: 10px; }
        .card-footer .sub { color: rgba(255,255,255,0.7); font-size: 9px; }
        @media print {
          body { background: white; }
          .card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-header">
          <div class="card-logo">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div class="card-title">Passerellesnumeriques Cambodia</div>
            <div class="card-subtitle">Student ID Card</div>
          </div>
        </div>
        <div class="card-body">
          <div class="avatar-wrapper">
            <div class="avatar">
              ${photoUrl ? `<img src="${photoUrl}" alt="${s.fullName}" />` : `<span class="avatar-initials">${initials}</span>`}
            </div>
            <div class="status-badge">${mapStatus(s.status)}</div>
          </div>
          <div class="student-name">${s.fullName}</div>
          <div class="student-id">${s.studentIdNo}</div>
          ${batch ? `<div class="detail-pills"><span class="pill">${batch}</span><span class="pill">${intakeYear}</span></div>` : ''}
          <div class="qrcode">
            <div class="qrcode-inner">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h1v1h-1v-1zm-3 0h1v1h-1v-1zm-1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1zm-3 0h1v1h-1v-1zm1 1h1v1h-1v-1zm2 0h1v1h-1v-1zm1 1h1v1h-1v-1z"/>
              </svg>
            </div>
          </div>
          <div class="scan-text">Scan to verify: ${s.studentIdNo}</div>
        </div>
        <div class="card-footer">
          <p>Passerellesnumeriques Cambodia</p>
          <p class="sub">${intakeYear}</p>
        </div>
      </div>
      <scr${'ipt'}>
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
    const html2canvas = (await import('html2canvas')).default
    const element = cardContainerRef.value
    if (!element) return

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return

    const file = new File(
      [blob],
      `${props.student.fullName.replace(/\s+/g, '_').toLowerCase()}_id_card.png`,
      { type: 'image/png' }
    )

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `ID Card - ${props.student.fullName}`,
        text: `Student ID Card for ${props.student.fullName} (${props.student.studentIdNo})`,
        files: [file],
      })
      shareSuccess.value = true
      setTimeout(() => { shareSuccess.value = false }, 2000)
    } else {
      await navigator.clipboard.writeText(
        `ID Card - ${props.student.fullName}\nStudent ID: ${props.student.studentIdNo}\nBatch: ${props.student.selectionBatchName || '—'}`
      )
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

function getLayoutColor(layout: string): string {
  const colors: Record<string, string> = {
    classic: 'bg-blue-500',
    modern: 'bg-indigo-500',
    premium: 'bg-amber-500',
    corporate: 'bg-green-500',
    'corporate-blue': 'bg-blue-500',
    'corporate-yellow': 'bg-yellow-500',
    official: 'bg-blue-700',
  }
  return colors[layout] || 'bg-blue-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Side-by-side layout: Card on left, controls on right -->
    <div class="flex flex-col lg:flex-row gap-6 items-start justify-center">
      <!-- Left: Card Preview -->
      <div ref="cardContainerRef" class="flex-shrink-0 mx-auto lg:mx-0">
        <StudentCard
          :student="cardStudent"
          :layout="selectedLayout"
          size="md"
          :showBack="showCardBack"
        />
      </div>

      <!-- Right: Controls Panel -->
      <div class="flex-1 w-full lg:max-w-sm space-y-4">
        <!-- Template Selector -->
        <div class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2 mb-3">
            <CreditCard :size="15" class="text-gray-400 dark:text-gray-500" />
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Template</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              v-for="layout in layoutOptions"
              :key="layout.id"
              @click="selectedLayout = layout.id"
              class="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer"
              :class="selectedLayout === layout.id
                ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 shadow-sm'
                : 'bg-transparent border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :class="getLayoutColor(layout.id)"></span>
              <span class="font-semibold truncate">{{ layout.name }}</span>
              <span v-if="selectedLayout === layout.id" class="text-blue-600 dark:text-blue-400 ml-auto">✓</span>
            </button>
          </div>
        </div>

        <!-- Front/Back Toggle + Actions -->
        <div class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
          <!-- Side toggle -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <RotateCcw :size="15" class="text-gray-400 dark:text-gray-500" />
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Card Side</span>
            </div>
            <div class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800/50 rounded-lg p-0.5 w-full">
              <button
                @click="showCardBack = false"
                class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer"
                :class="!showCardBack
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              >
                Front
              </button>
              <button
                @click="showCardBack = true"
                class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer"
                :class="showCardBack
                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
              >
                Back
              </button>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-100 dark:border-gray-700"></div>

          <!-- Action buttons -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <Download :size="15" class="text-gray-400 dark:text-gray-500" />
              <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button @click="downloadCard" class="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200 cursor-pointer" :class="{ 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700': downloadSuccess }">
                <Download v-if="!downloadSuccess" :size="16" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
                <Check v-else :size="16" class="text-green-500 dark:text-green-400 transition-transform duration-200" />
                <span class="text-[10px] font-semibold" :class="downloadSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">{{ downloadSuccess ? t('id_card_tab.downloaded') : t('id_card_tab.download') }}</span>
              </button>
              <button @click="printCard" class="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200 cursor-pointer" :class="{ 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700': printSuccess }">
                <Printer v-if="!printSuccess" :size="16" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
                <Check v-else :size="16" class="text-green-500 dark:text-green-400 transition-transform duration-200" />
                <span class="text-[10px] font-semibold" :class="printSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">{{ printSuccess ? t('id_card_tab.printing') : t('id_card_tab.print') }}</span>
              </button>
              <button @click="shareCard" class="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200 cursor-pointer" :class="{ 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700': shareSuccess }">
                <Share2 v-if="!shareSuccess" :size="16" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-200" />
                <Check v-else :size="16" class="text-green-500 dark:text-green-400 transition-transform duration-200" />
                <span class="text-[10px] font-semibold" :class="shareSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'">{{ shareSuccess ? t('id_card_tab.shared') : t('id_card_tab.share') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
