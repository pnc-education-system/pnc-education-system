<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <div
      class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-700/50"
    >
      <svg
        class="w-9 h-9 text-gray-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </div>
    <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
      {{ t('errors.404.title') }}
    </h1>
    <p class="text-base text-gray-500 dark:text-gray-400 max-w-sm mb-8">
      {{ t('errors.404.message') }}
    </p>
    <button
      class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer"
      @click="router.push('/dashboard')"
    >
      <svg
        class="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      {{ t('errors.back_to_dashboard') }}
    </button>
  </div>
</template>
