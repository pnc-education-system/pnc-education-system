import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import type { User, LoginCredentials } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const refreshToken = ref<string | null>(localStorage.getItem('refresh_token'))
  const user = ref<User | null>(null)
  const permissions = ref<string[]>(JSON.parse(localStorage.getItem('permissions') || '[]'))
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  const hasPermission = (perm: string) => permissions.value.includes(perm)

  const hasAnyPermission = (perms: string[]) => perms.some(p => permissions.value.includes(p))

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
    localStorage.setItem('permissions', JSON.stringify(perms))
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
      error.value = err instanceof Error ? err.message : 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  const fetchProfile = async () => {
    if (!token.value) return

    loading.value = true
    try {
      const data = await authApi.getProfile()
      setUser(data.user)
      setPermissions(data.permissions)
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
    localStorage.removeItem('permissions')
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
    hasPermission,
    hasAnyPermission,
    setToken,
    setRefreshToken,
    setUser,
    setPermissions,
    login,
    fetchProfile,
    refreshAuth,
    clearSession,
    logout,
  }
})
