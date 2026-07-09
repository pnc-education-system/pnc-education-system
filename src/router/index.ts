import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // Public routes
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/auth/ForgotPassword.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/auth/ResetPassword.vue'),
    meta: { requiresAuth: false },
  },

  // Authenticated routes
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/students',
    name: 'Students',
    component: () => import('@/views/students/StudentsView.vue'),
    meta: { requiresAuth: true, permission: 'students.view' },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/users/UsersView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/roles',
    name: 'Roles',
    component: () => import('@/views/roles/RolesView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/SettingsView.vue'),
    meta: { requiresAuth: true, permission: 'settings.view' },
  },

  // 403 Forbidden
  {
    path: '/forbidden',
    name: 'Forbidden',
    component: () => import('@/views/errors/ForbiddenView.vue'),
    meta: { requiresAuth: false },
  },

  // 404 catch-all
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/errors/NotFoundView.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const publicRoutes = ['Login', 'ForgotPassword', 'ResetPassword', 'Forbidden', 'NotFound']

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Redirect to login if not authenticated on a protected route
  if (!authStore.isAuthenticated && !publicRoutes.includes(to.name as string)) {
    return { name: 'Login' }
  }

  // Redirect away from auth pages if already logged in
  if (authStore.isAuthenticated && ['Login', 'ForgotPassword', 'ResetPassword'].includes(to.name as string)) {
    return { name: 'Dashboard' }
  }

  // Check route-level permission
  const requiredPermission = to.meta?.permission as string | undefined
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return { name: 'Forbidden' }
  }
})

export default router
