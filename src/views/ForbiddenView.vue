<script setup lang="ts">
defineOptions({ name: 'ForbiddenPage' })

import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6">
      <svg class="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-md">
      You don't have the required permissions to access this page.
    </p>
    <button
      @click="router.push('/dashboard')"
      class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
    >
      Back to Dashboard
    </button>
  </div>
</template>
