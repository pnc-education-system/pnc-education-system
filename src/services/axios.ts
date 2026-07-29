import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  timeout: 30_000, // 30-second global safety net for all requests
  headers: {
    'Content-Type': 'application/json',
  },
})

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/password/reset',
  '/auth/password/reset/confirm',
  '/students/verify',
  '/student-cards/student',
  '/student-cards/qr',
  '/cards/verify',
]

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

    // When sending FormData, let the browser set the correct Content-Type (multipart/form-data with boundary)
    // This prevents axios from forcing 'application/json' which would break file uploads
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
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

      // Redirect to login page
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

export default axiosInstance
