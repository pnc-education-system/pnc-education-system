<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <div class="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6 dark:bg-red-500/10">
      <i class="pi pi-lock text-4xl text-red-500"></i>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">403 — Forbidden</h1>
    <p class="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
      You don't have permission to access this page.
    </p>
    <button
      class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
      @click="router.push('/dashboard')"
    >
      Back to Dashboard
    </button>
  </div>
</template>
