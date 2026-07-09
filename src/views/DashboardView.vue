<template>
  <div class="dashboard-wrapper">
    <header class="dashboard-header">
      <div class="header-content">
        <h1>Dashboard</h1>
        <div class="header-right">
          <span class="user-email">{{ user?.email }}</span>
          <button @click="handleLogout" class="btn-logout">Logout</button>
        </div>
      </div>
    </header>
    <main class="dashboard-main">
      <div class="welcome-card">
        <h2>Welcome, {{ user?.name || 'User' }}</h2>
        <p>You are logged in as <strong>{{ user?.role }}</strong></p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'DashboardView' })

import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { authAPI } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

onMounted(async () => {
  if (!authStore.user) {
    try {
      const response = await authAPI.me()
      authStore.setUser(response.user)
    } catch {
      authStore.clearAuth()
      router.push('/login')
    }
  }
})

async function handleLogout() {
  try {
    await authAPI.logout()
  } catch {
    // Proceed with local logout even if API call fails
  }
  authStore.clearAuth()
  router.push('/login')
}
</script>

