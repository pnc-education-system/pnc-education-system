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
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Route guard - check authentication
router.beforeEach((to) => {
  const authStore = useAuthStore()
  const requiresAuth = (to.meta as { requiresAuth?: boolean }).requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return '/'
  }
})

export default router
