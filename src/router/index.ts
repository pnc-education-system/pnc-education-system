import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { h } from 'vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: {
      render: () => h('div', { class: 'p-8' }, [
        h('h1', { class: 'text-2xl font-bold text-gray-900 dark:text-white' }, 'Dashboard'),
        h('p', { class: 'text-sm text-gray-500 mt-2 dark:text-gray-400' }, 'Welcome to your dashboard.'),
      ]),
    },
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    name: 'Home',
    component: {
      render: () => h('div', { class: 'p-8' }, [
        h('h1', { class: 'text-2xl font-bold text-gray-900 dark:text-white' }, 'Welcome to PNC Education System'),
        h('p', { class: 'text-sm text-gray-500 mt-2 dark:text-gray-400' }, 'App shell is ready.'),
      ]),
    },
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/SettingsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'UsersList',
    component: () => import('@/views/admin/UsersListView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/admin/roles',
    name: 'RolesList',
    component: () => import('@/views/admin/RolesListView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
  {
    path: '/admin/users/new',
    name: 'UserCreate',
    component: () => import('@/views/admin/UserFormView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/admin/users/:id/edit',
    name: 'UserEdit',
    component: () => import('@/views/admin/UserFormView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/admin/roles/new',
    name: 'RoleCreate',
    component: () => import('@/views/admin/RoleFormView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
  {
    path: '/admin/roles/:id/edit',
    name: 'RoleEdit',
    component: () => import('@/views/admin/RoleFormView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route guard - check authentication and permissions
router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = (to.meta as { requiresAuth?: boolean }).requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return '/dashboard'
  }

  // Check permission
  const requiredPermission = (to.meta as { permission?: string }).permission
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return '/dashboard'
  }
})

export default router
