<script setup lang="ts">
</script>

<template>
  <div class="space-y-6 animate-pulse">
    <!-- Header skeleton -->
    <div class="flex items-center justify-between">
      <div class="space-y-3">
        <div class="h-6 w-64 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
        <div class="h-4 w-96 bg-gray-100 rounded-lg dark:bg-gray-800"></div>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-gray-200"></div>
        <div class="w-8 h-8 rounded-full bg-gray-200"></div>
      </div>
    </div>

    <!-- Stats cards skeleton -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/80 dark:bg-gray-800/20 dark:border-gray-700/50">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-3 w-20 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
            <div class="h-7 w-24 bg-gray-200 rounded-lg dark:bg-gray-600"></div>
            <div class="h-5 w-16 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts section skeleton -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/80 dark:bg-gray-800/20 dark:border-gray-700/50">
        <div class="flex items-center justify-between mb-6">
          <div class="h-5 w-36 bg-gray-200 rounded-lg dark:bg-gray-600"></div>
          <div class="h-6 w-28 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
        </div>
        <div class="h-64 flex items-end gap-3 px-4">
          <div v-for="i in 6" :key="i" class="flex-1 bg-gray-100 rounded-t-lg dark:bg-gray-700" :style="{ height: `${40 + Math.random() * 50}%` }"></div>
        </div>
      </div>
      <div class="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/80 dark:bg-gray-800/20 dark:border-gray-700/50">
        <div class="h-5 w-44 bg-gray-200 rounded-lg mb-6 dark:bg-gray-600"></div>
        <div class="flex items-center justify-center h-48">
          <div class="w-40 h-40 rounded-full bg-gray-100 dark:bg-gray-700"></div>
        </div>
        <div class="mt-5 space-y-3">
          <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 rounded-xl dark:bg-gray-700"></div>
        </div>
      </div>
    </div>

    <!-- Bottom section skeleton -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/80 dark:bg-gray-800/20 dark:border-gray-700/50">
        <div class="flex items-center justify-between mb-6">
          <div class="space-y-2">
            <div class="h-5 w-32 bg-gray-200 rounded-lg dark:bg-gray-600"></div>
            <div class="h-3 w-44 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
          </div>
          <div class="flex gap-3">
            <div class="h-9 w-20 bg-gray-100 rounded-xl dark:bg-gray-700"></div>
            <div class="h-9 w-24 bg-gray-200 rounded-xl dark:bg-gray-600"></div>
          </div>
        </div>
        <div class="space-y-4">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700"></div>
            <div class="flex-1 space-y-2">
              <div class="h-3 w-1/3 bg-gray-100 rounded-lg dark:bg-gray-700"></div>
              <div class="h-3 w-1/5 bg-gray-50 rounded-lg dark:bg-gray-800"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="space-y-6">
        <div v-for="i in 2" :key="i" class="bg-white rounded-[20px] p-6 shadow-sm border border-gray-100/80 dark:bg-gray-800/20 dark:border-gray-700/50">
          <div class="h-5 w-28 bg-gray-200 rounded-lg mb-5 dark:bg-gray-600"></div>
          <div class="space-y-4">
            <div v-for="j in 4" :key="j" class="h-12 bg-gray-100 rounded-2xl dark:bg-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
