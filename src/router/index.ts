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
      component: () => import('@/views/auth/ForgotPasswordView.vue')
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/auth/ResetPasswordView.vue')
    },
    {
      path: '/password-success',
      name: 'password-success',
      component: () => import('@/views/auth/PasswordSuccessView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue')
    }
  ],
})

// Navigation guard — redirect to /login if not authenticated
const publicRoutes = ['login', 'forgot-password', 'reset-password', 'password-success']

router.beforeEach((to) => {
  const token = localStorage.getItem('access_token')

  if (!token && !publicRoutes.includes(to.name as string)) {
    return { name: 'login' }
  }
})

export default router
