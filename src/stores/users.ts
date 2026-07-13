import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usersApi } from '@/services/api'
import type { AdminUser, BackendUser } from '@/types'
import type { CreateUserPayload, UpdateUserPayload } from '@/services/api/users'

function mapBackendUser(backend: BackendUser): AdminUser {
  return {
    id: String(backend.id),
    email: backend.email,
    name: backend.name,
    roleId: backend.role ? String(backend.role.id) : '',
    roleName: backend.role?.name || 'Unknown',
    status: backend.is_active ? 'active' : 'inactive',
    createdAt: backend.created_at,
    lastLogin: backend.last_login_at ?? undefined,
  }
}

export const useUsersStore = defineStore('users', () => {
  const users = ref<AdminUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalUsers = computed(() => users.value.length)
  const activeUsers = computed(() => users.value.filter(u => u.status === 'active').length)
  const inactiveUsers = computed(() => users.value.filter(u => u.status === 'inactive').length)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const paginated = await usersApi.list()
      users.value = paginated.data.map(mapBackendUser)
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 403) {
        users.value = []
        error.value = null
        return
      }

      console.error('[users store] fetchAll failed:', err)
      error.value = 'Failed to load users from server.'
    } finally {
      loading.value = false
    }
  }

  function getById(id: string): AdminUser | undefined {
    return users.value.find(u => u.id === id)
  }

  async function create(payload: Omit<AdminUser, 'id' | 'createdAt'> & { password?: string }): Promise<AdminUser> {
    const apiPayload: CreateUserPayload = {
      name: payload.name,
      email: payload.email,
      password: payload.password || 'changeme123',
      role_id: payload.roleId ? Number(payload.roleId) : null,
      is_active: payload.status === 'active',
    }
    const backend = await usersApi.create(apiPayload)
    const mapped = mapBackendUser(backend)
    const existingIdx = users.value.findIndex(u => u.id === mapped.id)
    if (existingIdx === -1) {
      users.value.push(mapped)
    } else {
      users.value[existingIdx] = mapped
    }
    return mapped
  }

  async function update(id: string, updates: Partial<AdminUser> & { password?: string }): Promise<boolean> {
    const index = users.value.findIndex(u => u.id === id)
    if (index === -1) return false

    const apiPayload: UpdateUserPayload = {
      name: updates.name,
      email: updates.email,
      role_id: updates.roleId ? Number(updates.roleId) : undefined,
      is_active: updates.status !== undefined ? updates.status === 'active' : undefined,
    }
    if (updates.password) {
      apiPayload.password = updates.password
    }
    const backend = await usersApi.update(Number(id), apiPayload)
    users.value[index] = mapBackendUser(backend)
    return true
  }

  async function remove(id: string): Promise<boolean> {
    const index = users.value.findIndex(u => u.id === id)
    if (index === -1) return false

    await usersApi.delete(Number(id))
    users.value.splice(index, 1)
    return true
  }

  return {
    users,
    loading,
    error,
    totalUsers,
    activeUsers,
    inactiveUsers,
    fetchAll,
    getById,
    create,
    update,
    remove,
  }
})
