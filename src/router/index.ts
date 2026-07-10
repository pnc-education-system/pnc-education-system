import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
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
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/forbidden',
    name: 'Forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { requiresAuth: true },
  },

  // Admin routes
  {
    path: '/admin/users',
    name: 'AdminUsers',
    component: () => import('@/views/admin/UsersListView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/admin/users/new',
    name: 'AdminUserCreate',
    component: () => import('@/views/admin/UserFormView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },
  {
    path: '/admin/users/:id/edit',
    name: 'AdminUserEdit',
    component: () => import('@/views/admin/UserFormView.vue'),
    meta: { requiresAuth: true, permission: 'users.manage' },
  },

  {
    path: '/admin/roles',
    name: 'AdminRoles',
    component: () => import('@/views/admin/RolesListView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
  {
    path: '/admin/roles/new',
    name: 'AdminRoleCreate',
    component: () => import('@/views/admin/RoleFormView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },
  {
    path: '/admin/roles/:id/edit',
    name: 'AdminRoleEdit',
    component: () => import('@/views/admin/RoleFormView.vue'),
    meta: { requiresAuth: true, permission: 'roles.manage' },
  },

  // Regular routes
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
    meta: { requiresAuth: true, permission: 'settings.manage' },
  },

  // Default
  {
    path: '/',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route guard - check authentication and permissions
const publicRoutes = ['Login', 'ForgotPassword', 'ResetPassword']
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated && !publicRoutes.includes(to.name as string)) {
    return { name: 'Login' }
  }

  if (authStore.isAuthenticated && publicRoutes.includes(to.name as string)) {
    return { name: 'Dashboard' }
  }

  const requiredPermission = (to.meta as { permission?: string }).permission
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return { name: 'Forbidden' }
  }
})

export default router

