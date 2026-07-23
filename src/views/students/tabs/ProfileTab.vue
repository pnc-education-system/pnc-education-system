<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Student } from '@/types'
import { Mail, MapPin, User, Hash } from 'lucide-vue-next'

const { t } = useI18n()
defineProps<{ student: Student }>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <!-- Full Name -->
    <div class="group p-4 sm:p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-800/10 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-500/30 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300">
      <div class="flex items-center gap-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        <div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors duration-300">
          <User :size="13" class="text-blue-500" />
        </div>
        <span>{{ t('student_profile.full_name') }}</span>
      </div>
      <p class="text-sm sm:text-base font-semibold text-gray-900 dark:text-white ml-9">{{ student.fullName }}</p>
    </div>

    <!-- Student ID -->
    <div class="group p-4 sm:p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-800/10 border border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/5 transition-all duration-300">
      <div class="flex items-center gap-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        <div class="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors duration-300">
          <Hash :size="13" class="text-purple-500" />
        </div>
        <span>{{ t('student_profile.student_id') }}</span>
      </div>
      <p class="text-sm sm:text-base font-mono font-semibold text-gray-900 dark:text-white ml-9">{{ student.studentIdNo }}</p>
    </div>

    <!-- Email -->
    <div class="group p-4 sm:p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-800/10 border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300">
      <div class="flex items-center gap-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors duration-300">
          <Mail :size="13" class="text-emerald-500" />
        </div>
        <span>{{ t('student_profile.email') }}</span>
      </div>
      <p class="text-sm sm:text-base font-medium text-gray-900 dark:text-white ml-9 truncate">{{ student.email || t('student_profile.not_provided') }}</p>
    </div>

    <!-- Address -->
    <div class="group p-4 sm:p-5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-800/10 border border-gray-100 dark:border-gray-700 hover:border-amber-200 dark:hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300">
      <div class="flex items-center gap-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        <div class="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 transition-colors duration-300">
          <MapPin :size="13" class="text-amber-500" />
        </div>
        <span>{{ t('student_profile.address') }}</span>
      </div>
      <p class="text-sm sm:text-base font-medium text-gray-900 dark:text-white ml-9">{{ student.province || t('student_profile.not_provided') }}</p>
    </div>
  </div>
</template>
