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

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export const useAuthStore = defineStore('auth', () => {
  // ── Detect and purge stale demo tokens on startup ──
  const storedToken = localStorage.getItem('access_token')
  if (storedToken && storedToken.startsWith('demo_token_')) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_permissions')
  }

  const token = ref<string | null>(
    storedToken?.startsWith('demo_token_') ? null : storedToken
  )
  const refreshToken = ref<string | null>(
    token.value ? localStorage.getItem('refresh_token') : null
  )
  const user = ref<User | null>(
    token.value ? loadFromStorage<User | null>('auth_user', null) : null
  )
  const permissions = ref<string[]>(
    token.value ? loadFromStorage<string[]>('auth_permissions', []) : []
  )
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
    saveToStorage('auth_user', userData)
  }

  const setPermissions = (perms: string[]) => {
    permissions.value = perms
    saveToStorage('auth_permissions', perms)
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
      role: 'administrator',
    }

    const mockPermissions = [
      'users.manage',
      'roles.manage',
      'audit.view',
      'settings.manage',
      'students.view',
      'students.edit',
      'students.import',
      'enrollment.manage',
      'cards.generate',
      'records.view',
      'records.manage',
      'evaluation.view',
      'evaluation.manage',
      'evaluation.submit',
      'reports.view',
    ]

    setToken('demo_token_' + Date.now())
    setRefreshToken('demo_refresh_token')
    setUser(mockUser)
    setPermissions(mockPermissions)
    isDemoMode.value = true
    error.value = null
    return true
  }

  /**
   * Restore session from stored tokens and attempt to verify with the backend.
   * Called once on app startup if a token exists.
   */
  const initSession = async () => {
    if (!token.value) return

    // If we already have user/permissions from localStorage, the route guard
    // will allow navigation. Try to verify with backend in background.
    if (user.value && permissions.value.length > 0) {
      // Silently re-verify in the background
      fetchProfile()
      return
    }

    // No cached user/permissions — must fetch from API
    await fetchProfile()
  }

  const fetchProfile = async () => {
    if (!token.value) return

    loading.value = true
    try {
      const { user: profile, permissions: perms } = await authApi.getProfile()
      setUser(profile)
      setPermissions(perms)
    } catch (err) {
      console.error('[auth store] fetchProfile failed:', err)
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
      if (data.permissions) {
        setPermissions(data.permissions)
      }
      return true
    } catch (err) {
      console.error('[auth store] refreshAuth failed:', err)
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
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_permissions')
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
    initSession,
    fetchProfile,
    refreshAuth,
    clearSession,
    logout,
  }
})
