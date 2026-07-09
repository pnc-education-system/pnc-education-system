<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import UsersListView from '@/views/admin/UsersListView.vue'
import RolesListView from '@/views/admin/RolesListView.vue'

const authStore = useAuthStore()
const route = useRoute()

// Restore tab from query param, default to 'users'
const initialTab = (route.query.tab === 'roles') ? 'roles' : 'users'
const activeTab = ref<'users' | 'roles'>(initialTab)

const canManageUsers = computed(() =>
  authStore.hasPermission('users.manage')
)
const canManageRoles = computed(() =>
  authStore.hasPermission('roles.manage')
)

const tabs = computed(() => {
  const result: { id: 'users' | 'roles'; label: string }[] = []
  if (canManageUsers.value) result.push({ id: 'users', label: 'Users' })
  if (canManageRoles.value) result.push({ id: 'roles', label: 'Roles' })
  return result
})

// Default to first available tab
const firstTab = tabs.value[0]
if (firstTab && !tabs.value.find(t => t.id === activeTab.value)) {
  activeTab.value = firstTab.id
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
        Manage system settings, users, and roles.
      </p>
    </div>

    <!-- Tabs -->
    <div v-if="tabs.length > 0" class="border-b border-gray-200 dark:border-gray-700/50">
      <div class="flex gap-6">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="pb-3 text-sm font-medium transition-all duration-200 border-b-2 cursor-pointer -mb-px"
          :class="activeTab === tab.id
            ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
            : 'text-gray-500 border-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Users Tab Content -->
    <div v-if="activeTab === 'users' && canManageUsers">
      <UsersListView />
    </div>

    <!-- Roles Tab Content -->
    <div v-if="activeTab === 'roles' && canManageRoles">
      <RolesListView />
    </div>

    <!-- Empty State when no permissions -->
    <div v-if="tabs.length === 0" class="text-center py-12">
      <div class="flex flex-col items-center gap-2">
        <svg class="w-10 h-10 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
        <p class="text-sm text-gray-500 dark:text-gray-400">You don't have permission to manage settings.</p>
      </div>
    </div>
  </div>
</template>
