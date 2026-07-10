<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const authStore = useAuthStore()
const { showSuccessToast, showErrorToast } = useToast()

onMounted(() => {
  usersStore.fetchAll()
  rolesStore.fetchAll()
})

const searchQuery = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const roleFilter = ref<string>('all')
const selectedUsers = ref<string[]>([])
const deleteConfirmId = ref<string | null>(null)

const isAllSelected = computed(() =>
  filteredUsers.value.length > 0 && selectedUsers.value.length === filteredUsers.value.length
)

const isIndeterminate = computed(() =>
  selectedUsers.value.length > 0 && selectedUsers.value.length < filteredUsers.value.length
)

const canCreate = authStore.hasPermission('users.manage') || authStore.hasPermission('users.create')
const canEdit = authStore.hasPermission('users.manage') || authStore.hasPermission('users.edit')
const canDelete = authStore.hasPermission('users.manage') || authStore.hasPermission('users.delete')

const roles = computed(() => rolesStore.roles)

const filteredUsers = computed(() => {
  return usersStore.users.filter(user => {
    const matchesSearch = !searchQuery.value ||
      user.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.value.toLowerCase())

    const matchesStatus = statusFilter.value === 'all' || user.status === statusFilter.value
    const matchesRole = roleFilter.value === 'all' || user.roleId === roleFilter.value

    return matchesSearch && matchesStatus && matchesRole
  })
})

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedUsers.value = []
  } else {
    selectedUsers.value = filteredUsers.value.map(u => u.id)
  }
}

function toggleSelect(id: string) {
  const idx = selectedUsers.value.indexOf(id)
  if (idx === -1) {
    selectedUsers.value.push(id)
  } else {
    selectedUsers.value.splice(idx, 1)
  }
}

function navigateToCreate() {
  router.push('/admin/users/new')
}

function navigateToEdit(id: string) {
  router.push(`/admin/users/${id}/edit`)
}

function confirmDelete(id: string) {
  deleteConfirmId.value = id
}

function cancelDelete() {
  deleteConfirmId.value = null
}

async function executeDelete(id: string) {
  try {
    await usersStore.remove(id)
    showSuccessToast('User has been deleted successfully.', 'User Deleted')
  } catch {
    showErrorToast('Failed to delete user.', 'Error')
  }
  deleteConfirmId.value = null
}

async function confirmBulkDelete() {
  try {
    await Promise.all(selectedUsers.value.map(id => usersStore.remove(id)))
    showSuccessToast(`${selectedUsers.value.length} user(s) deleted.`, 'Bulk Delete')
  } catch {
    showErrorToast('Failed to delete some users.', 'Error')
  }
  selectedUsers.value = []
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatLastLogin(dateStr?: string): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const roleMap = computed(() => {
  const map: Record<string, string> = {}
  roles.value.forEach(r => { map[r.id] = r.name })
  return map
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage all system users, their roles, and account status.
        </p>
      </div>
      <div v-if="canCreate" class="flex items-center gap-3">
        <button
          v-if="selectedUsers.length > 0"
          @click="confirmBulkDelete"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all duration-200 cursor-pointer dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          Delete ({{ selectedUsers.length }})
        </button>
        <button
          @click="navigateToCreate"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          New User
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or email..."
          class="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
        />
      </div>
      <select
        v-model="statusFilter"
        class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[140px] dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <select
        v-model="roleFilter"
        class="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[140px] dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
      >
        <option value="all">All Roles</option>
        <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
      </select>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-700/50 p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{{ usersStore.totalUsers }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-700/50 p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active</p>
            <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{{ usersStore.activeUsers }}</p>
          </div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800/20 rounded-xl border border-gray-100 dark:border-gray-700/50 p-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-rose-600 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" />
            </svg>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive</p>
            <p class="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{{ usersStore.inactiveUsers }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
              <th class="w-12 px-6 py-4 text-left">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/30 cursor-pointer"
                />
              </th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              <th class="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Login</th>
              <th class="w-24 px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800/30">
            <tr v-for="user in filteredUsers" :key="user.id" class="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
              <td class="px-6 py-4">
                <input
                  type="checkbox"
                  :checked="selectedUsers.includes(user.id)"
                  @change="toggleSelect(user.id)"
                  class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/30 cursor-pointer"
                />
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span class="text-xs font-bold text-white">{{ getInitials(user.name) }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ user.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  {{ roleMap[user.roleId] || user.roleName }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium"
                  :class="user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'"
                  ></span>
                  {{ user.status }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatDate(user.createdAt) }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatLastLogin(user.lastLogin) }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="canEdit"
                    @click="navigateToEdit(user.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer dark:hover:bg-blue-500/10"
                    title="Edit user"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    v-if="canDelete"
                    @click="confirmDelete(user.id)"
                    class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer dark:hover:bg-red-500/10"
                    title="Delete user"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="7" class="px-6 py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg class="w-7 h-7 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">No users found</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Try adjusting your search or filter criteria.</p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
          <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-700">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Confirm Delete</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Are you sure? This action cannot be undone.
                </p>
              </div>
            </div>
            <div class="flex items-center justify-end gap-3 mt-6">
              <button
                @click="cancelDelete"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200 cursor-pointer dark:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                @click="executeDelete(deleteConfirmId)"
                class="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all duration-200 cursor-pointer shadow-sm"
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
