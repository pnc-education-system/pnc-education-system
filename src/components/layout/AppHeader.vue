<script setup lang="ts">
// App header component with search, profile menu, and theme toggle
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const showProfileMenu = ref(false)
const profileMenuRef = ref<HTMLElement | null>(null)

const toggleSidebar = inject('toggleSidebar') as () => void
const { isDark, toggleTheme } = useTheme()

const labelMap: Record<string, string> = {
  Dashboard: 'Dashboard',
  Home: 'Home',
  Login: 'Login',
}

const pageTitle = computed(() => {
  const name = route.name
  if (typeof name === 'string') return labelMap[name] || name
  return 'Dashboard'
})

const handleLogout = () => {
  showProfileMenu.value = false
  authStore.logout()
  router.push('/login')
}

const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value
}

const closeProfileMenu = (e: MouseEvent) => {
  if (profileMenuRef.value && !profileMenuRef.value.contains(e.target as Node)) {
    showProfileMenu.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', closeProfileMenu)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', closeProfileMenu)
  document.removeEventListener('keydown', handleKeydown)
})

const userInitials = authStore.user?.name
  ? authStore.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  : 'SA'
</script>

<template>
  <header
    class="fixed top-0 right-0 h-16 bg-white border-b border-gray-200/80 z-30 flex items-center transition-all duration-300 dark:bg-[#0B1120] dark:border-gray-800"
    :class="['lg:left-[260px] left-0']"
  >
    <div class="flex items-center justify-between h-full w-full px-4 sm:px-6 lg:px-8">
      <!-- Left: Hamburger + Page Title -->
      <div class="flex items-center gap-3">
        <!-- Hamburger Menu (mobile only) -->
        <button
          class="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition-all duration-200 cursor-pointer lg:hidden"
          @click="toggleSidebar"
          title="Toggle sidebar"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </button>
        <!-- Breadcrumb: Pages > Current Page -->
        <div class="flex items-center gap-2 text-sm select-none">
          <button
            class="text-gray-400 font-medium hidden sm:inline cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors dark:text-gray-500"
            @click="router.push('/dashboard')"
          >
            Pages
          </button>
          <svg class="w-3.5 h-3.5 text-gray-300 hidden sm:block dark:text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span class="text-sm sm:text-base font-semibold text-gray-900 tracking-tight dark:text-white">{{ pageTitle }}</span>
        </div>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-1 sm:gap-2">
        <!-- Search Bar -->
        <div
          class="hidden sm:flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-gray-200/80 rounded-2xl px-4 lg:px-5 py-2.5 w-[240px] lg:w-[400px] transition-all duration-200 hover:border-gray-300 focus-within:border-blue-400 focus-within:bg-white/90 focus-within:shadow-sm focus-within:shadow-blue-500/10 dark:bg-gray-800/70 dark:border-gray-700/80 dark:hover:border-gray-600 dark:focus-within:border-blue-400 dark:focus-within:bg-gray-800/90"
        >
          <svg
            class="w-4 h-4 text-gray-400 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="Search students, records, or tools"
            class="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
          />
          <div
            class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-200/60 text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0 dark:bg-gray-700/60 dark:text-gray-400"
          >
            <span>⌘</span><span>K</span>
          </div>
        </div>

        <!-- Mobile Search Icon -->
        <button
          class="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
          title="Search"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <!-- Dark Mode Toggle -->
        <button
          class="relative w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200/80 text-gray-500 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700/80 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-200"
          :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          @click="toggleTheme"
        >
          <!-- Sun icon (shown in dark mode) -->
          <svg v-if="isDark" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" x2="12" y1="1" y2="3" />
            <line x1="12" x2="12" y1="21" y2="23" />
            <line x1="4.22" x2="5.64" y1="4.22" y2="5.64" />
            <line x1="18.36" x2="19.78" y1="18.36" y2="19.78" />
            <line x1="1" x2="3" y1="12" y2="12" />
            <line x1="21" x2="23" y1="12" y2="12" />
            <line x1="4.22" x2="5.64" y1="19.78" y2="18.36" />
            <line x1="18.36" x2="19.78" y1="5.64" y2="4.22" />
          </svg>
          <!-- Moon icon (shown in light mode) -->
          <svg v-else class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>

        <!-- Language Switcher -->
        <LanguageSwitcher />

        <!-- Notifications -->
        <button
          class="relative w-9 h-9 lg:w-10 lg:h-10 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200/80 text-gray-500 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700/80 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-200"
          title="Notifications"
        >
          <svg
            class="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span class="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-800"></span>
        </button>

        <!-- Profile Menu (with dropdown) -->
        <div class="relative" ref="profileMenuRef">
          <button
            class="flex items-center gap-2.5 pl-3 ml-1 border-l border-gray-200 cursor-pointer transition-all duration-200 hover:opacity-80 dark:border-gray-700"
            @click="toggleProfileMenu"
          >
            <div class="text-right hidden md:block">
              <p class="text-sm font-semibold text-gray-900 leading-tight dark:text-white">
                {{ authStore.user?.name || 'System Admin' }}
              </p>
              <p class="text-[11px] text-gray-500 font-medium dark:text-gray-400">{{ authStore.user?.role || 'System Admin' }}</p>
            </div>
            <div
              class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm"
            >
              <span class="text-xs font-bold text-white">{{ userInitials }}</span>
            </div>
            <svg
              class="w-4 h-4 text-gray-400 transition-transform duration-200"
              :class="{ 'rotate-180': showProfileMenu }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-[-4px]"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-[-4px]"
          >
            <div
              v-if="showProfileMenu"
              class="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-200/50 overflow-hidden dark:bg-[#131B2E] dark:border-gray-700/80 dark:shadow-gray-900/50"
            >
              <!-- Profile Header in Menu -->
              <div class="px-4 py-4 border-b border-gray-100 dark:border-gray-700/80">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0"
                  >
                    <span class="text-sm font-bold text-white">{{ userInitials }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate dark:text-white">
                      {{ authStore.user?.name || 'System Admin' }}
                    </p>
                    <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                      {{ authStore.user?.email || 'admin@pnc.edu' }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Menu Items -->
              <div class="p-1.5">
                <button class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:text-gray-300 dark:hover:bg-white/[0.04]">
                  <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                  </svg>
                  <span>Settings</span>
                </button>
                <button class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:text-gray-300 dark:hover:bg-white/[0.04]">
                  <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profile</span>
                </button>
                <button class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:text-gray-300 dark:hover:bg-white/[0.04]">
                  <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <span>Security</span>
                </button>
                <button class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer dark:text-gray-300 dark:hover:bg-white/[0.04]">
                  <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Privacy</span>
                </button>
              </div>

              <!-- Logout -->
              <div class="border-t border-gray-100 p-1.5 dark:border-gray-700/80">
                <button
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer dark:hover:bg-red-500/10"
                  @click="handleLogout"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </header>
</template>
