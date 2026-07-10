<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { ALL_PERMISSION_GROUPS } from '@/types'

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
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Define roles and configure granular permissions for each role.
        </p>
      </div>
      <div v-if="canCreate">
        <button
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New Role
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search roles..."
        class="w-full max-w-md pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
      />
    </div>

    <!-- Roles Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div v-for="role in filteredRoles" :key="role.id" class="bg-white border border-gray-100 rounded-2xl overflow-hidden dark:bg-gray-800/20 dark:border-gray-700/50">
        <!-- Header -->
        <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white">{{ role.name }}</h3>
              <p class="text-xs text-gray-500 mt-0.5 dark:text-gray-400">{{ role.description }}</p>
            </div>
            <div class="flex items-center gap-1">
              <button
                v-if="canEdit"
                @click="navigateToEdit(role.id)"
                class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer dark:hover:bg-blue-500/10"
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
                class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                title="Delete role"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center gap-3 mt-3">
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {{ role.userCount }} users
            </span>
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {{ role.permissions.length }} permissions
            </span>
          </div>
        </div>

        <!-- Permissions Preview -->
        <div class="px-5 py-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Permissions</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="perm in role.permissions.slice(0, 8)"
              :key="perm"
              class="inline-flex px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              {{ getPermissionLabel(perm) }}
            </span>
            <span v-if="role.permissions.length > 8" class="inline-flex px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-400 dark:bg-gray-800">
              +{{ role.permissions.length - 8 }} more
            </span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 border-t border-gray-100 dark:border-gray-700/50">
          <p class="text-xs text-gray-400">Created {{ formatDate(role.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredRoles.length === 0" class="text-center py-12">
      <div class="flex flex-col items-center gap-2">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p class="text-sm text-gray-500 dark:text-gray-400">No roles found</p>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" @click="cancelDelete"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 dark:bg-gray-800">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Confirm Delete</h3>
          <p class="text-sm text-gray-500 mt-2 dark:text-gray-400">
            Are you sure you want to delete this role? Users assigned this role may be affected.
          </p>
          <div class="flex items-center justify-end gap-3 mt-6">
            <button
              @click="cancelDelete"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              @click="executeDelete(deleteConfirmId)"
              class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
