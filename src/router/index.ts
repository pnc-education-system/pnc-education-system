import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login'
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/Login.vue')
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/views/auth/ForgotPassword.vue')
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPassword.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue')
    },
  ],
})

// Navigation guard — redirect to /login if not authenticated
const publicRoutes = ['login', 'forgot-password', 'reset-password']

router.beforeEach((to) => {
  const token = localStorage.getItem('access_token')

  if (!token && !publicRoutes.includes(to.name as string)) {
    return { name: 'login' }
  }
})

export default router
