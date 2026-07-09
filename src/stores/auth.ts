import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import type { User, LoginCredentials } from '@/types'

/** Extract meaningful error text from an Axios error response */
function getApiErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response: { data: { error?: { message?: string } } } }).response
    if (response?.data?.error?.message) {
      return response.data.error.message
    }
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Login failed'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const user = ref<User | null>(null)
  const permissions = ref<string[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDemoMode = ref(false)

  const isAuthenticated = computed(() => !!token.value)

  const hasPermission = (perm: string) => permissions.value.includes(perm)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('access_token', newToken)
  }

  const setRefreshToken = (newToken: string) => {
    refreshToken.value = newToken
    localStorage.setItem('refresh_token', newToken)
  }

  const setUser = (userData: User | null) => {
    user.value = userData
  }

  const setPermissions = (perms: string[]) => {
    permissions.value = perms
  }

  const login = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)
      setToken(response.access_token)
      setRefreshToken(response.refresh_token)
      setPermissions(response.permissions)
      setUser(response.user)
      return true
    } catch (err) {
      error.value = getApiErrorMessage(err)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Demo login that works without a real backend.
   * Populates the store with mock user data and permissions.
   */
  const demoLogin = () => {
    const mockUser: User = {
      id: '1',
      email: 'admin@pnc.edu',
      name: 'Admin User',
      role: 'admin',
    }

    const mockPermissions = [
      'users.view',
      'users.create',
      'users.edit',
      'users.delete',
      'dashboard.view',
      'teachers.view',
      'students.view',
      'subjects.view',
      'schedules.view',
      'classes.view',
    ]

    setToken('demo_token_' + Date.now())
    setRefreshToken('demo_refresh_token')
    setUser(mockUser)
    setPermissions(mockPermissions)
    isDemoMode.value = true
    error.value = null
    return true
  }

  const fetchProfile = async () => {
    if (!token.value) return

    loading.value = true
    try {
      const profile = await authApi.getProfile()
      setUser(profile)
    } catch {
      clearSession()
    } finally {
      loading.value = false
    }
  }

  const refreshAuth = async () => {
    if (!refreshToken.value) return false
    try {
      const data = await authApi.refresh(refreshToken.value)
      setToken(data.access_token)
      setRefreshToken(data.refresh_token)
      setPermissions(data.permissions || [])
      return true
    } catch {
      return false
    }
  }

  const clearSession = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    permissions.value = []
    error.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  const logout = () => {
    clearSession()
  }

  return {
    token,
    refreshToken,
    user,
    permissions,
    loading,
    error,
    isAuthenticated,
    isDemoMode,
    hasPermission,
    setToken,
    setRefreshToken,
    setUser,
    setPermissions,
    login,
    demoLogin,
    fetchProfile,
    refreshAuth,
    clearSession,
    logout,
  }
})
