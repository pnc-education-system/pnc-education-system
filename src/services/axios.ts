import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 30_000, // 30-second global safety net for all requests
  headers: {
    'Content-Type': 'application/json',
  },
})

const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/password/reset', '/auth/password/reset/confirm', '/student-cards/qr/', '/student-cards/student/']

function isPublicEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}
axiosInstance.interceptors.request.use(
  (config) => {
    if (isPublicEndpoint(config.url)) {
      delete config.headers.Authorization
      return config
    }

    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) {
      resolve(token)
    } else {
      reject(error)
    }
  })
  failedQueue = []
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Don't try to refresh the token for public endpoints (e.g. login, forgot password)
    const isPublic = isPublicEndpoint(originalRequest.url)

    if (error.response?.status === 401 && !originalRequest._retry && !isPublic) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return axiosInstance(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const authStore = useAuthStore()
      const refreshed = await authStore.refreshAuth()

      if (refreshed) {
        processQueue(null, authStore.token)
        originalRequest.headers.Authorization = `Bearer ${authStore.token}`
        isRefreshing = false
        return axiosInstance(originalRequest)
      }

      processQueue(error, null)
      authStore.logout()
      isRefreshing = false
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
