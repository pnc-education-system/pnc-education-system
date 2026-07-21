<script setup lang="ts">
import type { Student } from '@/types'
import { Download, Printer, Share2, Shield } from 'lucide-vue-next'

defineProps<{ student: Student }>()

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}
</script>

<template>
  <div class="space-y-8">
    <!-- ID Card Preview -->
    <div class="relative max-w-[340px] mx-auto">
      <div class="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1" style="aspect-ratio: 1.586 / 1;">
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.06)_0%,_transparent_60%)]"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.03)_0%,_transparent_50%)]"></div>
        <div class="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5"></div>
        <div class="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5"></div>
        <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div class="relative p-5 sm:p-6 h-full flex flex-col">
          <div class="flex items-center justify-between mb-auto">
            <div>
              <p class="text-[11px] font-bold text-gray-200 uppercase tracking-[0.15em]">PNC</p>
              <p class="text-[7px] text-gray-300 uppercase tracking-[0.2em] font-medium">Education System</p>
            </div>
            <div class="flex items-center gap-1.5">
              <Shield :size="16" class="text-gray-300" />
              <span class="text-[7px] text-gray-300 uppercase tracking-wider font-medium">Student</span>
            </div>
          </div>

          <div class="flex items-center gap-4 mt-4 mb-auto">
            <div class="w-[60px] h-[60px] rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm ring-2 ring-white/10 shadow-lg">
              <span class="text-xl font-bold text-white">{{ getInitials(student.fullName) }}</span>
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-white leading-tight truncate">{{ student.fullName }}</h3>
              <p class="text-[10px] text-gray-200 font-mono mt-1">{{ student.studentIdNo }}</p>
              <p class="text-[9px] text-gray-300 mt-0.5 truncate">{{ student.selectionBatchName || 'Batch B' }} · Intake {{ student.intakeYear || '2025' }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-auto pt-3 border-t border-white/10">
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[44px]">Gender</span><span class="text-[10px] text-white font-semibold">{{ student.gender || '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[28px]">DOB</span><span class="text-[10px] text-white font-semibold truncate">{{ student.dob ? new Date(student.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[44px]">Province</span><span class="text-[10px] text-white font-semibold truncate">{{ student.province || '—' }}</span></div>
            <div class="flex items-center gap-2"><span class="text-[8px] text-gray-300 uppercase tracking-wider font-medium min-w-[28px]">Batch</span><span class="text-[10px] text-white font-semibold truncate">{{ student.selectionBatchName || '—' }}</span></div>
          </div>

          <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
            <p class="text-[7px] text-gray-300">Valid academic year {{ student.intakeYear || '2025' }}</p>
            <div class="flex gap-1"><div class="w-5 h-3 rounded-sm bg-white/10"></div><div class="w-5 h-3 rounded-sm bg-white/10"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="grid grid-cols-3 gap-3 sm:gap-4 max-w-sm mx-auto">
      <button class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm">
          <Download :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">Download</span>
      </button>
      <button class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm">
          <Printer :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">Print</span>
      </button>
      <button class="group flex flex-col items-center gap-2 p-4 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-100 dark:group-hover:bg-gray-600/50 transition-all duration-300 shadow-sm">
          <Share2 :size="18" class="text-gray-500 dark:text-gray-400 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-200">Share</span>
      </button>
    </div>
  </div>
</template>
