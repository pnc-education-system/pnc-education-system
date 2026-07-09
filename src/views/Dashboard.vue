<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const router = useRouter()
const user = ref<any>(null)
const permissions = ref<string[]>([])

onMounted(() => {
  const userData = localStorage.getItem('user')
  const permissionsData = localStorage.getItem('permissions')
  
  if (userData) {
    user.value = JSON.parse(userData)
  }
  if (permissionsData) {
    permissions.value = JSON.parse(permissionsData)
  }
})

async function handleLogout() {
  try {
    await authApi.logout()
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    localStorage.clear()
    router.push('/login')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">PNC Education System</h1>
        <div class="flex items-center gap-4">
          <span v-if="user" class="text-gray-700">{{ user.name }}</span>
          <button
            @click="handleLogout"
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-white rounded-xl shadow-sm p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Welcome to Dashboard</h2>
        
        <div v-if="user" class="space-y-4">
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-gray-600"><strong>Name:</strong> {{ user.name }}</p>
            <p class="text-sm text-gray-600"><strong>Email:</strong> {{ user.email }}</p>
            <p class="text-sm text-gray-600"><strong>Role:</strong> {{ user.role }}</p>
          </div>

          <div v-if="permissions.length > 0" class="p-4 bg-green-50 rounded-lg">
            <p class="text-sm font-medium text-gray-700 mb-2">Permissions:</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="permission in permissions"
                :key="permission"
                class="px-2 py-1 bg-green-200 text-green-800 text-xs rounded"
              >
                {{ permission }}
              </span>
            </div>
          </div>
        </div>

        <div v-else class="text-gray-500">
          Loading user data...
        </div>
      </div>
    </main>
  </div>
</template>
