<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const studentsTitle = computed(() => t('students.title'))
const studentsSubtitle = computed(() => t('students.subtitle'))
const studentsImport = computed(() => t('students.import'))
const studentsAddStudent = computed(() => t('students.add_student'))
const studentsEmptyTitle = computed(() => t('students.empty_title'))
const studentsEmptyDescription = computed(() => t('students.empty_description'))
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ studentsTitle }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ studentsSubtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-permission="'students.import'"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer"
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          {{ studentsImport }}
        </button>
        <button
          v-permission="'students.edit'"
          class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 cursor-pointer"
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
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
          </svg>
          {{ studentsAddStudent }}
        </button>
      </div>
    </div>

    <div
      class="bg-white dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6"
    >
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div
          class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3"
        >
          <svg
            class="w-7 h-7 text-gray-300 dark:text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
            />
          </svg>
        </div>
        <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">
          {{ studentsEmptyTitle }}
        </p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
          {{ studentsEmptyDescription }}
        </p>
      </div>
    </div>
  </div>
</template>
