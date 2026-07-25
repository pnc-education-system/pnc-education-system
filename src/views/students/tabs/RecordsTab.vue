<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { recordsApi } from '@/services/api/records'
import type { Student, StudentRecord } from '@/types'
import { FileText, AlertTriangle, Award, MessageSquare, Calendar, Loader2, Plus, ExternalLink } from 'lucide-vue-next'

const router = useRouter()
const props = defineProps<{ student: Student }>()
const { t } = useI18n()
const { showErrorToast } = useToast()
const authStore = useAuthStore()

const records = ref<StudentRecord[]>([])
const isLoading = ref(false)
const canManage = authStore.hasPermission('records.manage') || authStore.hasPermission('students.edit')

const typeIconMap: Record<string, { icon: any; gradient: string; borderHover: string }> = {
  academic: { icon: FileText, gradient: 'from-blue-500 to-blue-600', borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/30' },
  disciplinary: { icon: AlertTriangle, gradient: 'from-amber-500 to-amber-600', borderHover: 'hover:border-amber-200 dark:hover:border-amber-500/30' },
  medical: { icon: MessageSquare, gradient: 'from-emerald-500 to-emerald-600', borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-500/30' },
  general: { icon: Award, gradient: 'from-purple-500 to-purple-600', borderHover: 'hover:border-purple-200 dark:hover:border-purple-500/30' },
}

function getRecordStyle(type: string) {
  return typeIconMap[type] ?? typeIconMap.general
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function navigateToRecordsPage() {
  router.push({
    name: 'Records',
    query: { student_id: props.student.id },
  })
}

async function loadRecords() {
  const studentId = Number(props.student.id)
  if (!studentId) return

  isLoading.value = true
  try {
    const result = await recordsApi.list(studentId)
    records.value = result.map(r => ({
      ...r,
      attachments: r.attachments ?? [],
    }))
  } catch (error: any) {
    // If 404, the endpoint might not be available yet — just show empty
    if (error?.response?.status !== 404) {
      console.error('Failed to load student records:', error)
      showErrorToast(t('records.toast_load_failed'), t('records.toast_error'))
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(loadRecords)
watch(() => props.student.id, loadRecords)
</script>

<template>
  <div class="space-y-3.5">
    <!-- Header with Add Record button -->
    <div class="flex items-center justify-between mb-2">
      <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {{ t('records.title') || 'Records' }}
      </h4>
      <button
        v-if="canManage"
        @click="navigateToRecordsPage"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
      >
        <Plus :size="13" />
        {{ t('records.add_record_btn') || 'Add Record' }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-16">
      <Loader2 :size="24" class="text-blue-500 animate-spin" />
    </div>

    <!-- Records List -->
    <template v-else>
      <div v-for="record in records" :key="record.id"
        class="group p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700 shadow-sm transition-all duration-300 cursor-default hover:shadow-md hover:-translate-y-0.5"
        :class="getRecordStyle(record.record_type).borderHover">
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white shadow-sm transition-transform duration-300 group-hover:scale-110"
            :class="getRecordStyle(record.record_type).gradient">
            <component :is="getRecordStyle(record.record_type).icon" :size="17" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">{{ record.title }}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{{ record.description }}</p>
              </div>
              <span class="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30 px-2.5 py-1 rounded-full whitespace-nowrap mt-0.5">
                <Calendar :size="11" />
                {{ formatDate(record.recorded_at || record.created_at) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="records.length === 0" class="py-16 text-center">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mb-4">
          <FileText :size="32" class="text-gray-300 dark:text-gray-600" />
        </div>
        <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">{{ t('records.no_records') }}</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ t('records.no_records_hint') }}</p>
        <button
          v-if="canManage"
          @click="navigateToRecordsPage"
          class="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <ExternalLink :size="13" />
          Manage Records
        </button>
      </div>
    </template>
  </div>
</template>
