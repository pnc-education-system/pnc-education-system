<script setup lang="ts">
defineOptions({ name: 'TemplateManageView' })

import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { usePolling } from '@/composables/usePolling'
import { cardsApi, type CardTemplate } from '@/services/api/cards'
import { Plus, Pencil, Trash2, Check, X, CreditCard, Loader2, AlertCircle } from 'lucide-vue-next'

const { t } = useI18n()
const { showSuccessToast, showErrorToast } = useToast()

// ── State ──
const templates = ref<CardTemplate[]>([])
const loading = ref(false)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const deletingId = ref<number | null>(null)
const saving = ref(false)

// ── Form State ──
const formName = ref('')
const formLayoutKey = ref('')
const formLayoutJson = ref('')
const formIsDefault = ref(false)
const formError = ref('')

// ── Count of student cards per template (optimistic) ──
const cardsCountMap = ref<Record<number, number>>({})

// ── Color map for layout keys ──
const layoutColors: Record<string, string> = {
  classic: '#3B82F6',
  modern: '#6366F1',
  premium: '#F59E0B',
  corporate: '#22C55E',
  'corporate-blue': '#2563EB',
  'corporate-yellow': '#EAB308',
  official: '#1B3FA0',
}

function getLayoutColor(key: string | null): string {
  return layoutColors[key || ''] || '#6B7280'
}

// ── Fetch templates ──
async function loadTemplates() {
  loading.value = true
  try {
    const tpls = await cardsApi.getTemplates()
    templates.value = tpls

    // Fetch stats to get card counts per template
    try {
      const stats = await cardsApi.getStats()
      stats.by_template.forEach((t) => {
        cardsCountMap.value[t.id] = t.count
      })
    } catch { /* silent */ }
  } catch {
    showErrorToast(t('template_mgmt.toast_load_failed'), t('users.toast_error'))
  } finally {
    loading.value = false
  }
}

// ── Open form for create ──
function openCreateForm() {
  editingId.value = null
  formName.value = ''
  formLayoutKey.value = ''
  formLayoutJson.value = '[]'
  formIsDefault.value = false
  formError.value = ''
  showForm.value = true
}

// ── Open form for edit ──
function openEditForm(tpl: CardTemplate) {
  editingId.value = tpl.id
  formName.value = tpl.name
  formLayoutKey.value = tpl.layout_key || ''
  formLayoutJson.value = typeof tpl.layout_json === 'string' ? tpl.layout_json : JSON.stringify(tpl.layout_json, null, 2)
  formIsDefault.value = tpl.is_default
  formError.value = ''
  showForm.value = true
}

// ── Close form ──
function closeForm() {
  showForm.value = false
  editingId.value = null
  formError.value = ''
}

// ── Save (create or update) ──
async function handleSave() {
  formError.value = ''

  if (!formName.value.trim()) {
    formError.value = t('template_mgmt.name_required')
    return
  }

  // Validate layout_json is valid JSON
  try {
    JSON.parse(formLayoutJson.value)
  } catch {
    formError.value = t('template_mgmt.json_invalid')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      await cardsApi.updateTemplate(editingId.value, {
        name: formName.value.trim(),
        layout_key: formLayoutKey.value.trim() || undefined,
        layout_json: formLayoutJson.value,
        is_default: formIsDefault.value,
      })
      showSuccessToast(t('template_mgmt.toast_updated'), t('template_mgmt.toast_updated_title'))
    } else {
      await cardsApi.createTemplate({
        name: formName.value.trim(),
        layout_key: formLayoutKey.value.trim() || undefined,
        layout_json: formLayoutJson.value,
        is_default: formIsDefault.value,
      })
      showSuccessToast(t('template_mgmt.toast_created'), t('template_mgmt.toast_created_title'))
    }
    closeForm()
    await loadTemplates()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    formError.value = e?.response?.data?.message || t('template_mgmt.save_error')
  } finally {
    saving.value = false
  }
}

// ── Delete ──
async function handleDelete(id: number) {
  if (!confirm(t('template_mgmt.delete_confirm'))) return

  deletingId.value = id
  try {
    await cardsApi.deleteTemplate(id)
    showSuccessToast(t('template_mgmt.toast_deleted'), t('template_mgmt.toast_deleted_title'))
    await loadTemplates()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } } }
    showErrorToast(e?.response?.data?.message || 'Failed to delete template.', 'Error')
  } finally {
    deletingId.value = null
  }
}

// ── Pretty print JSON layout for display ──
function formatLayoutJson(json: any): string {
  if (typeof json === 'string') {
    try { return JSON.stringify(JSON.parse(json), null, 2).slice(0, 120) + '...' } catch { return json.slice(0, 120) }
  }
  return JSON.stringify(json, null, 2).slice(0, 120) + '...'
}

const { start: startPolling } = usePolling(loadTemplates, 10_000)

onMounted(() => {
  loadTemplates()
  startPolling()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ t('template_mgmt.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t('template_mgmt.subtitle') }}
          <span
            v-if="templates.length > 0"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
          >
            {{ t('template_mgmt.templates_count', { count: templates.length }) }}
          </span>
        </p>
      </div>
      <button
        @click="openCreateForm"
        class="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-150 cursor-pointer"
      >
        <Plus :size="15" />
        {{ t('template_mgmt.new_template') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-2">
        <Loader2 :size="28" class="text-blue-500 animate-spin" />
        <p class="text-sm text-gray-400">{{ t('template_mgmt.loading') }}</p>
      </div>
    </div>

    <!-- Template List -->
    <div v-else-if="templates.length === 0" class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-12 text-center">
      <div class="flex flex-col items-center gap-2">
        <CreditCard :size="40" class="text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-500">{{ t('template_mgmt.no_templates') }}</p>
        <p class="text-xs text-gray-400">{{ t('template_mgmt.no_templates_hint') }}</p>
        <button @click="openCreateForm" class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
          <Plus :size="13" />
          {{ t('template_mgmt.create_template') }}
        </button>
      </div>
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="tpl in templates"
        :key="tpl.id"
        class="rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3 min-w-0">
            <!-- Color dot -->
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              :style="{ backgroundColor: getLayoutColor(tpl.layout_key) + '20', color: getLayoutColor(tpl.layout_key) }"
            >
              <CreditCard :size="18" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ tpl.name }}</h3>
                <span
                  v-if="tpl.is_default"
                  class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                >{{ t('template_mgmt.default_badge') }}</span>
              </div>
              <p class="text-[11px] font-mono text-gray-400 mt-0.5">
                layout_key: <span class="font-semibold text-gray-500">{{ tpl.layout_key || '—' }}</span>
              </p>
              <p class="text-[10px] text-gray-400 mt-1 leading-relaxed">
                {{ t('template_mgmt.cards_count') }}
                <span class="font-semibold text-gray-600 dark:text-gray-300">{{ cardsCountMap[tpl.id] ?? 0 }}</span>
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <button
              @click="openEditForm(tpl)"
              class="p-1.5 rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer dark:hover:bg-blue-500/10"
              :title="t('template_mgmt.edit_template')"
            >
              <Pencil :size="14" />
            </button>
            <button
              v-if="!tpl.is_default"
              @click="handleDelete(tpl.id)"
              :disabled="deletingId === tpl.id"
              class="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer dark:hover:bg-red-500/10 disabled:opacity-50"
              :title="t('template_mgmt.delete_template')"
            >
              <Loader2 v-if="deletingId === tpl.id" :size="14" class="animate-spin" />
              <Trash2 v-else :size="14" />
            </button>
          </div>
        </div>

        <!-- Layout JSON preview -->
        <div class="mt-2 ml-[52px]">
          <pre class="text-[9px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded p-2 overflow-hidden max-h-12 leading-relaxed font-mono">{{ formatLayoutJson(tpl.layout_json) }}</pre>
        </div>
      </div>
    </div>

    <!-- ✅ Inline Form Modal -->
    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/50" @click="closeForm"></div>
        <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10 rounded-t-xl">
            <h3 class="text-base font-bold text-gray-900 dark:text-white">
              {{ editingId ? t('template_mgmt.edit_title') : t('template_mgmt.new_title') }}
            </h3>
            <button @click="closeForm" class="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-700">
              <X :size="18" />
            </button>
          </div>

          <div class="p-5 space-y-4">
            <!-- Error -->
            <div v-if="formError" class="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
              <AlertCircle :size="14" />
              {{ formError }}
            </div>

            <!-- Name -->
            <div>
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{{ t('template_mgmt.form_name') }}</label>
              <input
                v-model="formName"
                type="text"
                placeholder="e.g. My Custom Template"
                class="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <!-- Layout Key -->
            <div>
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('template_mgmt.form_layout_key') }}
                <span class="font-normal normal-case text-gray-400">{{ t('template_mgmt.form_layout_key_hint') }}</span>
              </label>
              <input
                v-model="formLayoutKey"
                type="text"
                placeholder="e.g. classic, modern, premium, custom"
                class="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>

            <!-- Layout JSON -->
            <div>
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {{ t('template_mgmt.form_layout_json') }}
                <span class="font-normal normal-case text-gray-400">{{ t('template_mgmt.form_layout_json_hint') }}</span>
              </label>
              <textarea
                v-model="formLayoutJson"
                rows="8"
                class="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-xs font-mono text-gray-900 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/20 resize-y"
              ></textarea>
            </div>

            <!-- Is Default -->
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="formIsDefault"
                type="checkbox"
                class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('template_mgmt.form_is_default') }}</span>
            </label>
          </div>

          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 rounded-b-xl">
            <button
              @click="closeForm"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
> {{ t('template_mgmt.cancel') }}</button>
            <button
              @click="handleSave"
              :disabled="saving"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Loader2 v-if="saving" :size="14" class="animate-spin" />
              <Check v-else :size="14" />
              {{ editingId ? t('template_mgmt.update') : t('template_mgmt.create') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
