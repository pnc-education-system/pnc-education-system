<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { ALL_PERMISSION_GROUPS } from '@/types'
import type { PermissionGroup } from '@/types'

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
    showSuccessToast('Role has been deleted successfully.', 'Role Deleted')
  } catch {
    showErrorToast('Failed to delete role.', 'Error')
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
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Define roles and configure granular permissions for each role.
        </p>
      </div>
      <div v-if="canCreate">
        <button
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          + New Role
        </button>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div class="relative w-full sm:max-w-md">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search roles..."
          class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 3H2l8.1 9.6V19l5 1.6V12.6L22 3Z" />
          </svg>
          <select
            v-model="permissionFilter"
            class="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 appearance-none"
          >
            <option value="all">All Roles</option>
            <option value="0">0 permissions</option>
            <option value="5">5+ permissions</option>
            <option value="10">10+ permissions</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ROLE NAME</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">DESCRIPTION</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">USERS</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">PERMISSIONS</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CREATED</th>
              <th class="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="role in filteredRoles"
              :key="role.id"
              class="hover:bg-gray-50 transition-colors duration-150"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ role.name }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-gray-600">{{ role.description }}</p>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                  {{ role.userCount }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-xs font-medium text-blue-700 border border-blue-100">
                  {{ role.permissions.length }} permissions
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-600">{{ formatDate(role.createdAt) }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="canView"
                    @click="navigateToView(role.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    title="View role"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    v-if="canEdit"
                    @click="navigateToEdit(role.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
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
                    class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/50">
        <p class="text-xs text-gray-500">
          Showing {{ filteredRoles.length === 0 ? 0 : 1 }} to {{ filteredRoles.length }} of {{ filteredRoles.length }} roles
        </p>
        <div class="flex items-center gap-1">
          <button
            :disabled="true"
            class="p-1.5 rounded-md text-gray-400 cursor-not-allowed"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button class="px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-blue-600 cursor-default">1</button>
          <button
            :disabled="true"
            class="p-1.5 rounded-md text-gray-400 cursor-not-allowed"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredRoles.length === 0" class="flex flex-col items-center justify-center py-16">
      <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
        <svg class="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <p class="text-sm font-semibold text-gray-600">No roles found</p>
      <p class="text-xs text-gray-400 mt-1">Try adjusting your search criteria.</p>
    </div>

    <!-- Delete Confirmation Modal -->
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
          <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-100">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900">Confirm Delete</h3>
                <p class="text-sm text-gray-500 mt-0.5">
                  Users assigned this role may be affected. This action cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 mt-6">
              <button
                @click="cancelDelete"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                @click="executeDelete(deleteConfirmId)"
                class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
