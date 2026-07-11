<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useRolesStore } from '@/stores/roles'
import { useToast } from '@/composables/useToast'
import { ALL_PERMISSION_GROUPS } from '@/types'
import type { PermissionGroup } from '@/types'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()
const rolesStore = useRolesStore()
const { showSuccessToast, showErrorToast } = useToast()

const isEdit = computed(() => route.path.includes('/edit'))
const roleId = computed(() => route.params.id as string)

const form = ref({
  name: '',
  description: '',
  permissions: [] as string[],
})

const saving = ref(false)
const permissionGroups = ALL_PERMISSION_GROUPS

const headerTitle = computed(() => (isEdit.value ? t('admin.role_form.header.edit') : t('admin.role_form.header.new')))
const headerSubtitle = computed(() => (isEdit.value ? t('admin.role_form.subtitle.edit') : t('admin.role_form.subtitle.new')))

onMounted(() => {
  if (isEdit.value && roleId.value) {
    const existing = rolesStore.getById(roleId.value)
    if (existing) {
      form.value = {
        name: existing.name,
        description: existing.description,
        permissions: [...existing.permissions],
      }
    }
  }
})

function togglePermission(permKey: string) {
  const idx = form.value.permissions.indexOf(permKey)
  if (idx === -1) {
    form.value.permissions.push(permKey)
  } else {
    form.value.permissions.splice(idx, 1)
  }
}

function isPermissionSelected(key: string): boolean {
  return form.value.permissions.includes(key)
}

function selectAllInGroup(group: PermissionGroup) {
  const allKeys = group.permissions.map(p => p.key)
  const allSelected = allKeys.every(k => form.value.permissions.includes(k))
  if (allSelected) {
    form.value.permissions = form.value.permissions.filter(k => !allKeys.includes(k))
  } else {
    const missing = allKeys.filter(k => !form.value.permissions.includes(k))
    form.value.permissions.push(...missing)
  }
}

function isGroupAllSelected(group: PermissionGroup): boolean {
  return group.permissions.every(p => form.value.permissions.includes(p.key))
}

function isGroupPartiallySelected(group: PermissionGroup): boolean {
  const selected = group.permissions.filter(p => form.value.permissions.includes(p.key))
  return selected.length > 0 && selected.length < group.permissions.length
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    showErrorToast(t('admin.role_form.validation.name_required'), t('admin.role_form.toast.save_failed.title'))
    return
  }

  saving.value = true

  try {
    if (isEdit.value && roleId.value) {
      await rolesStore.update(roleId.value, {
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        permissions: [...form.value.permissions],
      })
      showSuccessToast(t('admin.role_form.toast.updated.message'), t('admin.role_form.toast.updated.title'))
    } else {
      await rolesStore.create({
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        permissions: [...form.value.permissions],
        userCount: 0,
      })
      showSuccessToast(t('admin.role_form.toast.created.message'), t('admin.role_form.toast.created.title'))
    }
    router.push('/admin/roles')
  } catch {
    showErrorToast(t('admin.role_form.toast.save_failed.message'), t('admin.role_form.toast.save_failed.title'))
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/admin/roles')
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ headerTitle }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ headerSubtitle }}</p>
      </div>
    </div>

    <div class="space-y-6">
      <div class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">{{ t('admin.role_form.section.details') }}</h2>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {{ t('admin.role_form.label.name') }} <span class="text-red-400">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              :placeholder="t('admin.role_form.placeholder.name')"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{{ t('admin.role_form.label.description') }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              :placeholder="t('admin.role_form.placeholder.description')"
              class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20 resize-none"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">{{ t('admin.role_form.section.permissions') }}</h2>
          <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
            {{ form.permissions.length }} {{ t('admin.role_form.permissions.selected') }}
          </span>
        </div>
        <div class="p-6 space-y-4">
          <div v-for="group in permissionGroups" :key="group.group" class="border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden">
            <button
              @click="selectAllInGroup(group)"
              class="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200 cursor-pointer text-left"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150"
                  :class="isGroupAllSelected(group)
                    ? 'bg-blue-500 border-blue-500'
                    : isGroupPartiallySelected(group)
                      ? 'bg-blue-200 border-blue-300 dark:bg-blue-500/30 dark:border-blue-500/50'
                      : 'border-gray-300 dark:border-gray-600'"
                >
                  <svg
                    v-if="isGroupAllSelected(group) || isGroupPartiallySelected(group)"
                    class="w-3 h-3 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ group.group }}</span>
              </div>
              <span class="text-xs text-gray-400 dark:text-gray-500 font-medium">
                {{ group.permissions.filter(p => form.permissions.includes(p.key)).length }}/{{ group.permissions.length }}
              </span>
            </button>

            <div class="px-3 py-2">
              <label
                v-for="perm in group.permissions"
                :key="perm.key"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer group"
              >
                <input
                  type="checkbox"
                  :checked="isPermissionSelected(perm.key)"
                  @change="togglePermission(perm.key)"
                  class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500/30 cursor-pointer"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ perm.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button
          @click="goBack"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
        >
          {{ t('admin.role_form.actions.cancel') }}
        </button>
        <button
          @click="handleSubmit"
          :disabled="saving"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ saving ? t('admin.role_form.actions.saving') : (isEdit ? t('admin.role_form.actions.update') : t('admin.role_form.actions.create')) }}
        </button>
      </div>
    </div>
  </div>
</template>

