import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { prefetchBatches } from '@/utils/batchesCache'

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
    path: '/enrollment',
    name: 'Enrollment',
    component: () => import('@/views/EnrollmentPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/enrollment/history',
    name: 'ImportHistory',
    component: () => import('@/views/enrollments/ImportHistoryView.vue'),
    meta: { requiresAuth: true, permission: 'enrollment.manage' },
  },
  {
    path: '/enrollment/views',
    name: 'ImportViews',
    component: () => import('@/views/enrollments/ImportViewsView.vue'),
    meta: { requiresAuth: true, permission: 'enrollment.manage' },
  },
  {
    path: '/forbidden',
    name: 'Forbidden',
    component: () => import('@/views/ForbiddenView.vue'),
    meta: { requiresAuth: true },
  },
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

  {
    path: '/students',
    name: 'Students',
    component: () => import('@/views/students/TrackingList/TrackingListView.vue'),
    meta: { requiresAuth: true, permission: 'students.view' },
  },
  {
    path: '/students/tracking',
    name: 'StudentTracking',
    component: () => import('@/views/students/TrackingList/TrackingListView.vue'),
    meta: { requiresAuth: true, permission: 'students.view' },
  },
  {
    path: '/students/new',
    name: 'StudentCreate',
    component: () => import('@/views/students/StudentFormView.vue'),
    meta: { requiresAuth: true, permission: 'students.create' },
  },
  {
    path: '/imports',
    name: 'Imports',
    component: () => import('@/views/imports/ImportsView.vue'),
    meta: { requiresAuth: true, permission: 'students.import' },
  },
  {
    path: '/users',
    redirect: '/admin/users',
  },
  {
    path: '/students/:id/edit',
    name: 'StudentEdit',
    component: () => import('@/views/students/StudentFormView.vue'),
    meta: { requiresAuth: true, permission: 'students.edit' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/SettingsView.vue'),
    meta: { requiresAuth: true, permission: 'settings.manage' },
  },

 
  {
    path: '/cards',
    redirect: '/cards/id-card',
  },
  {
    path: '/cards/id-card',
    name: 'CardIdCard',
    component: () => import('@/views/cards/CardGeneratorView.vue'),
    meta: { requiresAuth: true, permission: 'cards.generate' },
  },
  {
    path: '/cards/batch-card',
    name: 'CardBatchCard',
    component: () => import('@/views/cards/BatchCardView.vue'),
    meta: { requiresAuth: true, permission: 'cards.generate' },
  },
  {
    path: '/cards/qr-verify',
    name: 'CardQrVerify',
    component: () => import('@/views/cards/QRVerifyView.vue'),
    meta: { requiresAuth: true, permission: 'cards.generate' },
  },

  {
    path: '/verify/:token',
    name: 'StudentVerify',
    component: () => import('@/views/cards/StudentVerifyView.vue'),
    meta: { requiresAuth: false },
  },

  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile/ProfileView.vue'),
    meta: { requiresAuth: true },
  },

  {
    path: '/',
    redirect: '/dashboard',
  },
]


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

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

  // Pre-fetch selection batches so the dropdown is ready instantly
  if (to.name === 'Enrollment' || to.name === 'ImportViews' || to.name === 'CardIdCard') {
    prefetchBatches()
  }
})

export default router

