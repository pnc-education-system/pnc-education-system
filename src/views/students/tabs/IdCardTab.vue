<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Student as AppStudent } from '@/types'
import type { Student as CardStudent, CardTheme } from '@/types/card'
import { themeColors } from '@/types/card'
import { resolvePhotoUrl, getInitials } from '@/utils/photoUrl'
import { Download, Printer, Share2, Check, Palette } from 'lucide-vue-next'
import IDCard from '@/components/card/IDCard.vue'

const { t } = useI18n()

const props = defineProps<{ student: AppStudent }>()
const downloadSuccess = ref(false)
const printSuccess = ref(false)
const shareSuccess = ref(false)
const cardContainerRef = ref<HTMLElement | null>(null)

// Card theme state
const selectedTheme = ref<CardTheme>('blue')

const themeOptions: { id: CardTheme; name: string; colors: { primary: string; secondary: string } }[] = [
  { id: 'blue', name: 'Blue', colors: { primary: '#1e3a8a', secondary: '#3b82f6' } },
  { id: 'green', name: 'Green', colors: { primary: '#166534', secondary: '#22c55e' } },
  { id: 'purple', name: 'Purple', colors: { primary: '#7c3aed', secondary: '#a855f7' } },
  { id: 'orange', name: 'Orange', colors: { primary: '#c2410c', secondary: '#f97316' } },
  { id: 'dark', name: 'Dark', colors: { primary: '#1f2937', secondary: '#374151' } },
]

// Map app Student to card Student
const cardStudent = computed<CardStudent>(() => {
  const s = props.student
  return {
    id: s.id,
    name: s.fullName,
    avatar: s.photoPath ? (resolvePhotoUrl(s.photoPath, s.id) ?? undefined) : undefined,
    studentId: s.studentIdNo,
    batch: s.selectionBatchName || `Batch ${s.intakeYear || ''}`,
    year: s.intakeYear || new Date().getFullYear().toString(),
    status: mapStatus(s.status),
    school: 'Passerellesnumeriques Cambodia',
    logo: '',
    emergencyContact: '',
    website: 'https://pnc.edu.kh',
    address: s.province || 'Phnom Penh, Cambodia',
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
  const colors = themeColors[selectedTheme.value]
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
          background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
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
          border: 4px solid ${colors.primary};
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
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
          border: 1px solid ${colors.secondary}88;
          background: ${colors.secondary}22;
          color: ${colors.primary};
        }
        .student-name { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
        .student-id { font-size: 12px; font-weight: 600; color: ${colors.secondary}; margin-bottom: 12px; }
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
          border: 2px solid ${colors.secondary};
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
          background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
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
</script>

<template>
  <div class="space-y-8">
    <!-- ID Card Preview using the shared IDCard component -->
    <div ref="cardContainerRef" class="flex justify-center">
      <IDCard
        :student="cardStudent"
        template="classic"
        :theme="selectedTheme"
        background="white"
        :showQRCode="true"
        :showAcademicYear="true"
        :showBatch="true"
        :showStatus="true"
        :showFooter="true"
      />
    </div>

    <!-- Theme Selector -->
    <div class="max-w-sm mx-auto">
      <div class="bg-white dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
        <div class="flex items-center gap-2 mb-3">
          <Palette :size="16" class="text-gray-400 dark:text-gray-500" />
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Card Theme</span>
        </div>
        <div class="flex gap-2">
          <button
            v-for="theme in themeOptions"
            :key="theme.id"
            @click="selectedTheme = theme.id"
            class="flex-1 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border-2 transition-all duration-200"
            :class="selectedTheme === theme.id
              ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800/40 bg-blue-50/50 dark:bg-blue-500/5'
              : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
          >
            <div class="flex gap-1">
              <div
                class="w-4 h-4 rounded-full ring-1 ring-white/30"
                :style="{ backgroundColor: theme.colors.primary }"
              ></div>
              <div
                class="w-4 h-4 rounded-full ring-1 ring-white/30"
                :style="{ backgroundColor: theme.colors.secondary }"
              ></div>
            </div>
            <span
              class="text-[10px] font-semibold"
              :class="selectedTheme === theme.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'"
            >
              {{ theme.name }}
            </span>
          </button>
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
        <span class="text-xs font-semibold" :class="downloadSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ downloadSuccess ? t('id_card_tab.downloaded') : t('id_card_tab.download') }}</span>
      </button>
      <button @click="printCard" class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm" :class="{ 'bg-green-50 dark:bg-green-900/30': printSuccess }">
          <Printer v-if="!printSuccess" :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          <Check v-else :size="18" class="text-green-500 dark:text-green-400 scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold" :class="printSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ printSuccess ? t('id_card_tab.printing') : t('id_card_tab.print') }}</span>
      </button>
      <button @click="shareCard" class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm" :class="{ 'bg-green-50 dark:bg-green-900/30': shareSuccess }">
          <Share2 v-if="!shareSuccess" :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
          <Check v-else :size="18" class="text-green-500 dark:text-green-400 scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold" :class="shareSuccess ? 'text-green-500 dark:text-green-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'">{{ shareSuccess ? t('id_card_tab.shared') : t('id_card_tab.share') }}</span>
      </button>
    </div>
  </div>
</template>
