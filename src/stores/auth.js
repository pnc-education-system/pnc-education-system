import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const permissions = ref([])

  const isAuthenticated = computed(() => !!accessToken.value)
  const userRole = computed(() => user.value?.role || null)
  const hasPermission = computed(() => (permission) => permissions.value.includes(permission))

  function setUser(userData) {
    user.value = userData
  }

  function setTokens(tokens) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    permissions.value = tokens.permissions || []
    
    localStorage.setItem('access_token', tokens.access_token)
    localStorage.setItem('refresh_token', tokens.refresh_token)
    localStorage.setItem('permissions', JSON.stringify(tokens.permissions || []))
  }

  function clearAuth() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    permissions.value = []
    
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('permissions')
  }

  function loadFromStorage() {
    const storedToken = localStorage.getItem('access_token')
    const storedRefreshToken = localStorage.getItem('refresh_token')
    const storedPermissions = localStorage.getItem('permissions')
    
    if (storedToken) accessToken.value = storedToken
    if (storedRefreshToken) refreshToken.value = storedRefreshToken
    if (storedPermissions) permissions.value = JSON.parse(storedPermissions)
  }

  return {
    user,
    accessToken,
    refreshToken,
    permissions,
    isAuthenticated,
    userRole,
    hasPermission,
    setUser,
    setTokens,
    clearAuth,
    loadFromStorage
  }
})
