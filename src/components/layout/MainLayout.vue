<script setup lang="ts">
import { computed, ref, provide, onMounted, onUnmounted } from 'vue'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import PageSkeleton from '@/components/layout/PageSkeleton.vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'

const { initTheme } = useTheme()
const { toasts, removeToast } = useToast()
const authStore = useAuthStore()

onMounted(() => {
  initTheme()
  // Skip auth validation on public pages — avoids stale-token 401s before login
  if (!isLoginPage.value) {
    if (authStore.token) {
      authStore.initSession()
    }
    if (authStore.isAuthenticated && !authStore.user) {
      authStore.fetchProfile()
    }
  }
})

const route = useRoute()
const router = useRouter()
const publicPaths = ['/login', '/forgot-password', '/reset-password']
const isLoginPage = computed(() => publicPaths.includes(route.path))
const sidebarOpen = ref(false)
const routeLoading = ref(false)
let isFirstLoad = true

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

provide('sidebarOpen', sidebarOpen)
provide('toggleSidebar', toggleSidebar)
provide('closeSidebar', closeSidebar)

const removeBeforeGuard = router.beforeEach(() => {
  if (isFirstLoad) return
  routeLoading.value = true
})

const removeAfterGuard = router.afterEach(() => {
  isFirstLoad = false
  setTimeout(() => {
    routeLoading.value = false
  }, 150)
})

onUnmounted(() => {
  removeBeforeGuard()
  removeAfterGuard()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#0B1120]">
    <AppSidebar v-if="!isLoginPage" />
    <div :class="[isLoginPage ? '' : 'min-h-screen', 'flex flex-col']">
      <AppHeader v-if="!isLoginPage" />
      <main
        v-if="!isLoginPage"
        class="flex-1 bg-gray-50 lg:ml-[260px] dark:bg-[#0B1120]"
        style="padding-top: 64px"
        @click="closeSidebar"
      >
        <div class="p-4 sm:p-6 lg:p-8">
          <PageSkeleton v-if="routeLoading" />
          <div v-else>
            <router-view v-slot="{ Component }">
              <Transition
                mode="out-in"
                enter-active-class="transition-all duration-300 ease-out"
                enter-from-class="opacity-0 translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-1"
              >
                <component :is="Component" :key="route.fullPath" />
              </Transition>
            </router-view>
          </div>
        </div>
      </main>
      <main v-else class="flex-1">
        <router-view />
      </main>
    </div>
    <Teleport to="body">
      <div
        id="toast-container"
        class="fixed top-4 right-4 z-[60] max-h-[90vh] overflow-y-auto space-y-3 pointer-events-none"
        style="scrollbar-width: none"
      >
        <TransitionGroup name="toast" tag="div" class="space-y-3 pointer-events-auto">
          <div
            v-for="toast in toasts"
            :key="toast.id"
            class="flex items-start gap-3 max-w-sm bg-white rounded-2xl shadow-lg border p-4 dark:bg-[#131B2E] shadow-gray-200/50 dark:shadow-gray-900/50"
            :class="
              toast.type === 'success'
                ? 'border-emerald-100 dark:border-emerald-500/20'
                : 'border-red-100 dark:border-red-500/20'
            "
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              :class="
                toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10'
                  : 'bg-red-50 dark:bg-red-500/10'
              "
            >
              <svg
                v-if="toast.type === 'success'"
                class="w-5 h-5 text-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" x2="9" y1="9" y2="15" />
                <line x1="9" x2="15" y1="9" y2="15" />
              </svg>
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ toast.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5 dark:text-gray-400">{{ toast.message }}</p>
            </div>
            <button
              @click="removeToast(toast.id)"
              class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer flex-shrink-0 dark:hover:text-gray-300 dark:hover:bg-gray-800"
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<style>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(1rem) translateY(-0.5rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(1rem);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
