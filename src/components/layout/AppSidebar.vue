<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { ref, computed, inject, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const sidebarOpen = inject('sidebarOpen') as Ref<boolean>
const closeSidebar = inject('closeSidebar') as () => void

const studentsDropdown = ref(false)
const enrollmentDropdown = ref(false)
const adminDropdown = ref(false)
const cardDropdown = ref(false)

const canManageEnrollments = computed(() => authStore.hasPermission('enrollment.manage'))
const { t } = useI18n()

const canManageUsers = computed(() => authStore.hasPermission('users.manage'))
const canManageRoles = computed(() => authStore.hasPermission('roles.manage'))
const canGenerateCards = computed(() => authStore.hasPermission('cards.generate'))

const navigate = (path: string) => {
  router.push(path)
  closeSidebar()
  studentsDropdown.value = false
  enrollmentDropdown.value = false
  adminDropdown.value = false
  cardDropdown.value = false
}

const isActive = (path: string) => route.path === path

const isStudentsActive = computed(() => route.path.startsWith('/students'))
const isEnrollmentActive = computed(() => route.path.startsWith('/enrollment'))
const isAdminActive = computed(() => route.path.startsWith('/admin'))
const isCardActive = computed(() => route.path.startsWith('/cards'))

const onStudentsClick = () => {
  studentsDropdown.value = !studentsDropdown.value
}

const onEnrollmentClick = () => {
  enrollmentDropdown.value = !enrollmentDropdown.value
}

const onAdminClick = () => {
  adminDropdown.value = !adminDropdown.value
}

const onCardClick = () => {
  cardDropdown.value = !cardDropdown.value
}
</script>

<template>
  <transition
    enter-active-class="transition-opacity duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden dark:bg-black/60"
      @click="closeSidebar"
    ></div>
  </transition>


  <aside
    class="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0F172A] z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-out -translate-x-full lg:translate-x-0"
    :class="{ 'translate-x-0': sidebarOpen }"
    style="border-radius: 0 20px 20px 0; box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);"
  >
    <div class="px-6 pt-7 pb-6 flex-shrink-0">
      <div class="flex items-center gap-3.5">
        <img
          src="@/assets/images/PN_logo_clear.png"
          alt="PNC Logo"
          class="w-9 h-9 object-contain"
        />
        <div>
          <h1 class="text-base font-bold text-white tracking-tight leading-tight">PNC Education</h1>
          <p class="text-[11px] text-slate-400 font-medium mt-0.5">System Management</p>
        </div>
      </div>
    </div>
    <button
      class="absolute top-6 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors lg:hidden cursor-pointer"
      @click="closeSidebar"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>
    <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
      <button
        @click="navigate('/dashboard')"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
        :class="isActive('/dashboard')
          ? 'bg-blue-500/10 text-blue-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
      >
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
        <span>{{ t('sidebar.dashboard') }}</span>
      </button>

      <div class="relative" v-if="canManageEnrollments">
        <button
          @click="onEnrollmentClick"
          class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
          :class="isEnrollmentActive || enrollmentDropdown
            ? 'bg-blue-500/10 text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" x2="8" y1="13" y2="13" />
            <line x1="16" x2="8" y1="17" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span class="flex-1">{{ t('sidebar.enrollment') }}</span>
          <svg
            class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200"
            :class="{ 'rotate-180': enrollmentDropdown }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="enrollmentDropdown"
            class="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3"
          >
            <button
              @click="navigate('/enrollment')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/enrollment' && !route.path.startsWith('/enrollment/history')
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <span>{{ t('sidebar.import_upload') }}</span>
            </button>
            <button
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              @click="navigate('/enrollment/views')"
              :class="route.path === '/enrollment/views'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <span>{{ t('sidebar.import_views') }}</span>
            </button>
            <button
              @click="navigate('/enrollment/history')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/enrollment/history'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{{ t('sidebar.import_history') }}</span>
            </button>
          </div>
        </transition>
      </div>

      <!-- Students -->
      <div class="relative">
        <button
          @click="onStudentsClick"
          class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
          :class="isStudentsActive || studentsDropdown
            ? 'bg-blue-500/10 text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span class="flex-1">{{ t('sidebar.students') }}</span>
          <svg
            class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200"
            :class="{ 'rotate-180': studentsDropdown }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="studentsDropdown"
            class="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3"
          >
            <button
              @click="navigate('/students/tracking')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/students/tracking'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span>{{ t('sidebar.tracking_list') }}</span>
            </button>
            <button
              @click="navigate('/students/profile')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/students/profile' || (route.path.startsWith('/students/') && route.path.includes('/profile'))
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span>{{ t('sidebar.student_profile') }}</span>
            </button>
          </div>
        </transition>
      </div>

      <!-- Card -->
      <div class="relative" v-if="canGenerateCards">
        <button
          @click="onCardClick"
          class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
          :class="isCardActive || cardDropdown
            ? 'bg-blue-500/10 text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
            <line x1="6" x2="6" y1="7" y2="7.01" />
            <line x1="10" x2="10" y1="7" y2="7.01" />
            <path d="M8 17h8" />
          </svg>
          <span class="flex-1">{{ t('sidebar.card') }}</span>
          <svg
            class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200"
            :class="{ 'rotate-180': cardDropdown }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="cardDropdown"
            class="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3"
          >
            <button
              @click="navigate('/cards/id-card')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/cards/id-card'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
                <path d="M6 17h12" />
              </svg>
              <span>{{ t('sidebar.id_card') }}</span>
            </button>
            <button
              @click="navigate('/cards/batch-card')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/cards/batch-card'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
              </svg>
              <span>{{ t('sidebar.batch_card') }}</span>
            </button>
            <button
              @click="navigate('/cards/qr-verify')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/cards/qr-verify'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="5" height="5" rx="1" /><rect x="16" y="3" width="5" height="5" rx="1" /><rect x="3" y="16" width="5" height="5" rx="1" /><path d="M21 16h-5v-5" /><path d="M3 12h.01" /><path d="M12 3v.01" /><path d="M12 21v.01" />
              </svg>
              <span>{{ t('sidebar.qr_verify') }}</span>
            </button>
            <button
              @click="navigate('/cards/templates')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path === '/cards/templates'
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <span>{{ t('sidebar.manage_templates') }}</span>
            </button>
          </div>
        </transition>
      </div>

      <!-- Records -->
      <button
        @click="navigate('/records')"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
        :class="isActive('/records')
          ? 'bg-blue-500/10 text-blue-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
      >
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>{{ t('sidebar.records') }}</span>
      </button>

      <!-- Reports -->
      <button
        @click="navigate('/reports')"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
        :class="isActive('/reports')
          ? 'bg-blue-500/10 text-blue-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
      >
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <polyline points="12 15 12 3" />
        </svg>
        <span>{{ t('sidebar.reports') }}</span>
      </button>

      <!-- Self Evaluation -->
      <button
        @click="navigate('/evaluation/self')"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
        :class="isActive('/evaluation/self')
          ? 'bg-blue-500/10 text-blue-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
      >
        <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span>Self Evaluation</span>
      </button>

      <!-- Admin Dropdown -->
      <div class="relative">
        <button
          @click="onAdminClick"
          class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
          :class="isAdminActive || adminDropdown
            ? 'bg-blue-500/10 text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
        >
          <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
          <span class="flex-1">{{ t('sidebar.admin') }}</span>
          <svg
            class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200"
            :class="{ 'rotate-180': adminDropdown }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="adminDropdown"
            class="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.06] pl-3"
          >
            <button
              v-if="canManageUsers"
              @click="navigate('/admin/users')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path.startsWith('/admin/users')
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{{ t('sidebar.manage_users') }}</span>
            </button>
            <button
              v-if="canManageRoles"
              @click="navigate('/admin/roles')"
              class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-left"
              :class="route.path.startsWith('/admin/roles')
                ? 'bg-blue-500/10 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
            >
              <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>{{ t('sidebar.manage_roles') }}</span>
            </button>
          </div>
        </transition>
      </div>
    </nav>
  </aside>
</template>
