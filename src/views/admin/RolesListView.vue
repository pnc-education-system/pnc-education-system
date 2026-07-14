<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

import { ALL_PERMISSION_GROUPS } from '@/types'
import type { PermissionGroup } from '@/types'

const { t } = useI18n()


const router = useRouter()
const rolesStore = useRolesStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

onMounted(() => {
  rolesStore.fetchAll()
})

const searchQuery = ref('')
const permissionFilter = ref<'all' | number>('all')
const deleteConfirmId = ref<string | null>(null)

const canCreate = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.create')
const canEdit = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.edit')
const canDelete = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.delete')
const canView = authStore.hasPermission('roles.manage') || authStore.hasPermission('roles.view')

const filteredRoles = computed(() => {
  let list = rolesStore.roles

  if (permissionFilter.value !== 'all') {
    const min = permissionFilter.value as number
    list = list.filter(r => r.permissions.length >= min)
  }

  if (!searchQuery.value) return list
  const q = searchQuery.value.toLowerCase()
  return list.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q)
  )
})

// Pagination
const currentPage = ref(1)
const pageSize = ref(10)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRoles.value.length / pageSize.value)))

const paginatedRoles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredRoles.value.slice(start, end)
})

watch(filteredRoles, () => {
  currentPage.value = 1
})

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push(-1)

    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)

    if (current < total - 2) pages.push(-2)
    pages.push(total)
  }
  return pages
})

function navigateToCreate() {
  router.push('/admin/roles/new')
}

function navigateToEdit(id: string) {
  router.push(`/admin/roles/${id}/edit`)
}

function navigateToView(id: string) {
  router.push(`/admin/roles/${id}`)
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
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div class="relative w-full sm:max-w-md">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search roles..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 3H2l8.1 9.6V19l5 1.6V12.6L22 3Z" />
          </svg>
          <select
            v-model="permissionFilter"
            class="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 appearance-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
          >
            <option value="all">All Roles</option>
            <option value="0">0 permissions</option>
            <option value="5">5+ permissions</option>
            <option value="10">10+ permissions</option>
          </select>
        </div>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">ROLE NAME</th>
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">DESCRIPTION</th>
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">USERS</th>
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">PERMISSIONS</th>
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">CREATED</th>
              <th class="px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800/30">
            <tr
              v-for="role in paginatedRoles"
              :key="role.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors duration-150"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">{{ role.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-gray-600 dark:text-gray-400">{{ role.description }}</p>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                  {{ role.userCount }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-xs font-medium text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  {{ role.permissions.length }} permissions
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-600 dark:text-gray-400">{{ formatDate(role.createdAt) }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="canView"
                    @click="navigateToView(role.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10"
                    title="View role"
                  >
                  </button>
                  <button
                    v-if="canEdit"
                    @click="navigateToEdit(role.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10"
                    title="Edit role"
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
                    title="Delete role"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="filteredRoles.length > 0" class="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ Math.min(currentPage * pageSize, filteredRoles.length) }} of {{ filteredRoles.length }} roles
        </p>
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage === 1"
            @click="prevPage"
            class="p-1.5 rounded-md transition-all duration-200 cursor-pointer"
            :class="currentPage === 1 ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <template v-for="page in visiblePages" :key="page">
            <span v-if="page < 0" class="px-1 text-gray-400 dark:text-gray-500 text-xs select-none">…</span>
            <button
              v-else
              @click="goToPage(page)"
              class="min-w-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer"
              :class="page === currentPage
                ? 'text-white bg-blue-600 dark:bg-blue-500 cursor-default'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'"
            >
              {{ page }}
            </button>
          </template>

          <button
            :disabled="currentPage === totalPages"
            @click="nextPage"
            class="p-1.5 rounded-md transition-all duration-200 cursor-pointer"
            :class="currentPage === totalPages ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/50'"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
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
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
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

