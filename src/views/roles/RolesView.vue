<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage roles and their permissions.</p>
      </div>
      <button
        v-permission="'roles.manage'"
        class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
        </svg>
        Add Role
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6">
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-gray-300 dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">Role Management</p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
          Role list and permission management features will be available here.
        </p>
      </div>
    </div>
  </div>
</template>
