<script setup lang="ts">
defineOptions({ name: 'EnrollmentPage' })

import { ref } from 'vue'
import { Upload, Eye, History, List } from 'lucide-vue-next'

const activeTab = ref<'list' | 'upload' | 'views' | 'history'>('list')

const tabs = [
  { id: 'list', label: 'Student List', icon: List },
  { id: 'upload', label: 'Import Upload', icon: Upload },
  { id: 'views', label: 'Import Views', icon: Eye },
  { id: 'history', label: 'Import History', icon: History },
] as const
</script>

<template>
  <div class="space-y-6" style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-[#111827] dark:text-white tracking-tight">Enrollment</h1>
        <p class="text-sm text-[#6B7280] dark:text-gray-400 mt-1">Manage student enrollment records.</p>
      </div>
    </div>

    <!-- Tab Navigation -->
    <div class="border-b border-[#E5E7EB] dark:border-gray-800">
      <div class="flex gap-1 -mb-[1px]">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 cursor-pointer"
          :class="activeTab === tab.id
            ? 'border-[#355C8C] text-[#355C8C] dark:text-blue-400'
            : 'border-transparent text-[#6B7280] hover:text-[#374151] dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'"
        >
          <component :is="tab.icon" :size="16" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Student List -->
    <div v-if="activeTab === 'list'" class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <div class="px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800">
        <h2 class="text-base font-semibold text-[#111827] dark:text-white">Student List</h2>
        <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">View and manage student enrollment records.</p>
      </div>
    </div>

    <!-- Import Upload -->
    <div v-if="activeTab === 'upload'" class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <div class="px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800">
        <h2 class="text-base font-semibold text-[#111827] dark:text-white">Import Upload</h2>
        <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">Upload Excel or CSV files to import student enrollment data.</p>
      </div>
    </div>

    <!-- Import Views -->
    <div v-if="activeTab === 'views'" class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <div class="px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800">
        <h2 class="text-base font-semibold text-[#111827] dark:text-white">Import Views</h2>
        <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">Preview imported data before confirming the enrollment records.</p>
      </div>
    </div>

    <!-- Import History -->
    <div v-if="activeTab === 'history'" class="rounded-[14px] bg-white dark:bg-[#131B2E] border border-[#E5E7EB] dark:border-gray-800" style="box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
      <div class="px-6 py-4 border-b border-[#E5E7EB] dark:border-gray-800">
        <h2 class="text-base font-semibold text-[#111827] dark:text-white">Import History</h2>
        <p class="text-[13px] text-[#6B7280] dark:text-gray-400 mt-0.5">View past import logs and track the status of uploaded files.</p>
      </div>
    </div>
  </div>
</template>
