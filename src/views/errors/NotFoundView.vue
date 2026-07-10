<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6 dark:bg-gray-800">
      <i class="pi pi-exclamation-triangle text-4xl text-gray-400"></i>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">404 — Not Found</h1>
    <p class="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
      The page you're looking for doesn't exist.
    </p>
    <button
      class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
      @click="router.push('/dashboard')"
    >
      Back to Dashboard
    </button>
  </div>
</template>
