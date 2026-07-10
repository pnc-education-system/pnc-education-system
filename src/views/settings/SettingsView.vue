<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">System configuration and settings.</p>
      </div>
      <button
        v-permission="'settings.manage'"
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
      >
        Save Changes
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div class="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Settings form will be displayed here.</p>
      </div>
    </div>
  </div>
</template>
