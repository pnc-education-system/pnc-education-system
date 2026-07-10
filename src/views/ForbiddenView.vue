<script setup lang="ts">
defineOptions({ name: 'ForbiddenPage' })

import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <div class="w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-6 border border-red-100 dark:border-red-500/20">
      <svg class="w-9 h-9 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">403</h1>
    <p class="text-base text-gray-500 dark:text-gray-400 max-w-sm mb-8">
      You don't have the required permissions to access this page.
    </p>
    <button
      class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer"
      @click="router.push('/dashboard')"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back to Dashboard
    </button>
  </div>
</template>
