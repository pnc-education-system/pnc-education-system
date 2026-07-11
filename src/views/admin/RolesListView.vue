<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

import { ALL_PERMISSION_GROUPS } from '@/types'

const { t } = useI18n()


const router = useRouter()
const rolesStore = useRolesStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

onMounted(() => {
  rolesStore.fetchAll()
})

const searchQuery = ref('')
const deleteConfirmId = ref<string | null>(null)

const canCreate = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.create')
const canEdit = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.edit')
const canDelete = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.delete')

const filteredRoles = computed(() => {
  if (!searchQuery.value) return rolesStore.roles
  const q = searchQuery.value.toLowerCase()
  return rolesStore.roles.filter(r =>
    r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  )
})

function navigateToCreate() {
  router.push('/admin/roles/new')
}

function navigateToEdit(id: string) {
  router.push(`/admin/roles/${id}/edit`)
}

function confirmDelete(id: string) {
  deleteConfirmId.value = id
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function executeDelete(id: string) {
  try {
    await rolesStore.remove(id)
    showSuccessToast(t('admin.roles.modal.confirm_delete.delete'), t('admin.roles.action.delete'))
  } catch {
    showErrorToast(t('admin.roles.modal.confirm_delete.delete'), t('admin.roles.action.delete'))
  }
  deleteConfirmId.value = null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPermissionLabel(key: string): string {
  for (const group of ALL_PERMISSION_GROUPS) {
    const found = group.permissions.find(p => p.key === key)
    if (found) return found.label
  }
  return key
}

const rolesTitle = computed(() => t('admin.roles.list.title'))
const rolesSubtitle = computed(() => t('admin.roles.list.subtitle'))
const rolesSearchPlaceholder = computed(() => t('admin.roles.search.placeholder'))
const rolesNewRoleLabel = computed(() => t('admin.roles.header.new_role'))
const rolesPermissionsLabel = computed(() => t('admin.roles.permissions.preview.title'))
const rolesUsersSuffix = computed(() => t('admin.roles.users.suffix'))
const rolesPermissionsMore = computed(() => t('admin.roles.permissions.more'))
const rolesPermissionsNone = computed(() => t('admin.roles.permissions.none'))
const rolesFooterCreated = computed(() => t('admin.roles.footer.created'))
const rolesEmptyTitle = computed(() => t('admin.roles.empty.title'))
const rolesEmptySubtitle = computed(() => t('admin.roles.empty.subtitle'))
const confirmDeleteTitle = computed(() => t('admin.roles.modal.confirm_delete.title'))
const confirmDeleteMessage = computed(() => t('admin.roles.modal.confirm_delete.message'))
const confirmDeleteCancel = computed(() => t('admin.roles.modal.confirm_delete.cancel'))
const confirmDeleteDelete = computed(() => t('admin.roles.modal.confirm_delete.delete'))
const roleActionEditTooltip = computed(() => t('admin.roles.action.edit'))
const roleActionDeleteTooltip = computed(() => t('admin.roles.action.delete'))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ rolesTitle }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ rolesSubtitle }}</p>
      </div>
      <div v-if="canCreate">
        <button
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          {{ rolesNewRoleLabel }}
        </button>
      </div>
    </div>

    <div class="relative max-w-md">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="rolesSearchPlaceholder"
        class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="role in filteredRoles" :key="role.id" class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-sm">
        <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-700/50">
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-gray-900 dark:text-white truncate">{{ role.name }}</h3>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ role.description }}</p>
            </div>
            <div class="flex items-center gap-1 ml-4 flex-shrink-0">
              <button
                v-if="canEdit"
                @click="navigateToEdit(role.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10"
                :title="roleActionEditTooltip"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                v-if="canDelete"
                @click="confirmDelete(role.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10"
                :title="roleActionDeleteTooltip"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-3 mt-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {{ role.userCount }} {{ rolesUsersSuffix }}
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {{ role.permissions.length }} permissions
            </span>
          </div>
        </div>

        <div class="px-6 py-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{{ rolesPermissionsLabel }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="perm in role.permissions.slice(0, 10)"
              :key="perm"
              class="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700/50"
            >
              {{ getPermissionLabel(perm) }}
            </span>
            <span
              v-if="role.permissions.length > 10"
              class="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700/50"
            >
              +{{ role.permissions.length - 10 }} {{ rolesPermissionsMore }}
            </span>
            <span
              v-if="role.permissions.length === 0"
              class="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 text-xs text-gray-400 dark:text-gray-500"
            >
              {{ rolesPermissionsNone }}
            </span>
          </div>
        </div>

        <div class="px-6 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
          <p class="text-xs text-gray-400">{{ rolesFooterCreated }} {{ formatDate(role.createdAt) }}</p>
        </div>
      </div>
    </div>

    <div v-if="filteredRoles.length === 0" class="flex flex-col items-center justify-center py-16">
      <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <svg class="w-7 h-7 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">{{ rolesEmptyTitle }}</p>
      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ rolesEmptySubtitle }}</p>
    </div>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="deleteConfirmId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="cancelDelete"></div>
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ confirmDeleteTitle }}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ confirmDeleteMessage }}</p>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 mt-6">
              <button
                @click="cancelDelete"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 cursor-pointer dark:bg-gray-700 dark:text-gray-300"
              >
                {{ confirmDeleteCancel }}
              </button>
              <button
                @click="executeDelete(deleteConfirmId!)"
                class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-200 cursor-pointer shadow-sm"
              >
                {{ confirmDeleteDelete }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

