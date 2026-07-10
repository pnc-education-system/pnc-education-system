<script setup lang="ts">
defineOptions({ name: 'DashboardPage' })

import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/types'

const authStore = useAuthStore()

const user = ref<User | null>(null)
const permissions = ref<string[]>([])

onMounted(() => {
  if (authStore.user) {
    user.value = authStore.user
    permissions.value = authStore.permissions
  } else {
    const userData = localStorage.getItem('user')
    const permissionsData = localStorage.getItem('permissions')
    if (userData) user.value = JSON.parse(userData)
    if (permissionsData) permissions.value = JSON.parse(permissionsData)
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
    <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">Welcome back, {{ user?.name || 'User' }}</p>

    <div v-if="user" class="mt-6 space-y-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Info</h2>
        <div class="space-y-3">
          <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
            <span class="text-sm text-gray-600 dark:text-gray-400 w-20">Name</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ user.name }}</span>
          </div>
          <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
            <span class="text-sm text-gray-600 dark:text-gray-400 w-20">Email</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ user.email }}</span>
          </div>
          <div class="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
            <span class="text-sm text-gray-600 dark:text-gray-400 w-20">Role</span>
            <span class="text-sm font-medium text-gray-900 dark:text-white capitalize">{{ user.role }}</span>
          </div>
        </div>
      </div>

      <div v-if="permissions.length > 0" class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Permissions</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="permission in permissions"
            :key="permission"
            class="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-xs font-medium rounded-lg"
          >
            {{ permission }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="mt-6 text-gray-500 dark:text-gray-400">
      Loading user data...
    </div>
  </div>
</template>
