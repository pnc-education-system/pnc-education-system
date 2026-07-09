import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api'
import type { User, LoginCredentials } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  const setUser = (userData: User | null) => {
    user.value = userData
  }

  const login = async (credentials: LoginCredentials) => {
    loading.value = true
    error.value = null

    try {
      const response = await authApi.login(credentials)
      setToken(response.token)
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
      const profile = await authApi.getProfile()
      setUser(profile)
    } catch {
      clearSession()
    } finally {
      loading.value = false
    }
  }

  const clearSession = () => {
    token.value = null
    user.value = null
    error.value = null
    localStorage.removeItem('token')
  }

  const logout = () => {
    clearSession()
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    setToken,
    setUser,
    login,
    fetchProfile,
    clearSession,
    logout,
  }
})
