<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { ref, computed, inject, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const sidebarOpen = inject('sidebarOpen') as Ref<boolean>
const closeSidebar = inject('closeSidebar') as () => void

const adminHovered = ref(false)
const adminDropdown = ref(false)

const userInitials = computed(() => {
  if (!authStore.user?.name) return 'SA'
  return authStore.user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

interface NavItem {
  label: string
  icon: string
  route: string
  permission?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
  { label: 'Admin', icon: 'admin', route: '/admin' },
]

const visibleNavItems = computed(() =>
  navItems.filter(item => !item.permission || authStore.hasPermission(item.permission))
)

const canManageUsers = computed(() => authStore.hasPermission('users.manage'))
const canManageRoles = computed(() => authStore.hasPermission('roles.manage'))

const navigate = (path: string) => {
  router.push(path)
  closeSidebar()
  adminDropdown.value = false
  adminHovered.value = false
}

const isActive = (path: string) => route.path === path

const isAdminActive = computed(() => route.path.startsWith('/admin'))

const onAdminEnter = () => {
  adminHovered.value = true
  adminDropdown.value = true
}

const onAdminLeave = () => {
  adminHovered.value = false
  setTimeout(() => {
    if (!adminHovered.value) {
      adminDropdown.value = false
    }
  }, 100)
}

const onAdminClick = () => {
  adminDropdown.value = !adminDropdown.value
}
</script>

<template>
  <!-- Backdrop overlay (mobile only) -->
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

  <!-- Sidebar -->
  <aside
    class="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0F172A] z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-out -translate-x-full lg:translate-x-0"
    :class="{ 'translate-x-0': sidebarOpen }"
    style="border-radius: 0 20px 20px 0; box-shadow: 4px 0 24px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.06);"
  >
    <!-- Logo Section -->
    <div class="px-6 pt-7 pb-6 flex-shrink-0">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20"
        >
          <svg
            class="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <div>
          <h1 class="text-base font-bold text-white tracking-tight leading-tight">PNC Education</h1>
          <p class="text-[11px] text-slate-400 font-medium mt-0.5">System Management</p>
        </div>
      </div>
    </div>

    <!-- Close button (mobile only) -->
    <button
      class="absolute top-6 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors lg:hidden cursor-pointer"
      @click="closeSidebar"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </button>

    <!-- Navigation Links -->
    <nav class="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      <!-- Regular nav items (except Admin) -->
      <button
        v-for="item in visibleNavItems.filter(i => i.label !== 'Admin')"
        :key="item.route"
        @click="navigate(item.route)"
        class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
        :class="isActive(item.route)
          ? 'bg-blue-500/10 text-blue-400 shadow-sm'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
      >
        <span class="w-5 h-5 flex items-center justify-center flex-shrink-0">{{ item.label[0] }}</span>
        <span>{{ item.label }}</span>
      </button>

      <!-- Admin with hover dropdown -->
      <div
        class="relative"
        @mouseenter="onAdminEnter"
        @mouseleave="onAdminLeave"
      >
        <button
          @click="onAdminClick"
          class="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left"
          :class="isAdminActive || adminDropdown
            ? 'bg-blue-500/10 text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'"
        >
          <span class="w-5 h-5 flex items-center justify-center flex-shrink-0">A</span>
          <span class="flex-1">Admin</span>
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

        <!-- Dropdown sub-menu -->
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
            class="ml-4 mt-1 space-y-0.5"
          >
            <!-- Users Section -->
            <div class="pt-2 pb-1 px-1">
              <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Users</p>
            </div>
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
              <span>Manage Users</span>
            </button>

            <!-- Roles Section -->
            <div class="pt-3 pb-1 px-1">
              <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Roles</p>
            </div>
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
              <span>Manage Roles</span>
            </button>
          </div>
        </transition>
      </div>
    </nav>

    <!-- Profile Card -->
    <div class="flex-shrink-0 px-3 pb-5 pt-3">
      <div
        class="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer group"
      >
        <div
          class="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm"
        >
          <span class="text-xs font-bold text-white">{{ userInitials }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-200 truncate leading-tight">
            {{ authStore.user?.name || 'System Admin' }}
          </p>
          <p class="text-[11px] text-slate-500 font-medium mt-0.5">{{ authStore.user?.role || 'System Admin' }}</p>
        </div>
        <svg
          class="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors duration-200 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      </div>
    </div>
  </aside>
</template>
