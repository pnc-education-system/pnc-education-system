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
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="bg-white dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 sm:p-8">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span class="text-lg font-bold text-white">
            {{ user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'SA' }}
          </span>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {{ user?.name?.split(' ')[0] || 'User' }}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here's an overview of your account and system status.
          </p>
        </div>
      </div>
    </div>

    <div v-if="user" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Account Info -->
      <div class="lg:col-span-2 bg-white dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Account Information</h2>
        </div>
        <div class="p-6 space-y-3">
          <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
            <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{{ user.name }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
            <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Email Address</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">{{ user.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl">
            <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-400 uppercase tracking-wider">Role</p>
              <p class="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 capitalize">{{ user.role }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions -->
      <div v-if="permissions.length > 0" class="bg-white dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Permissions</h2>
        </div>
        <div class="p-6">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="permission in permissions"
              :key="permission"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-xs font-medium rounded-lg border border-green-100 dark:border-green-500/20"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {{ permission }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center py-16">
      <div class="flex flex-col items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg class="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Loading your dashboard...</p>
      </div>
    </div>
  </div>
</template>
