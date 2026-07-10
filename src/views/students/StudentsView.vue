<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Students</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage student records.</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-permission="'students.import'"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 cursor-pointer"
        >
          Import
        </button>
        <button
          v-permission="'students.edit'"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer"
        >
          Add Student
        </button>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div class="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>Student list will be displayed here.</p>
      </div>
    </div>
  </div>
</template>
