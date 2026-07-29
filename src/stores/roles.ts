import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { rolesApi } from '@/services/api'
import type { Role, BackendRole, BackendPermission } from '@/types'
function mapBackendRole(backend: BackendRole): Role {
  return {
    id: String(backend.id),
    name: backend.name,
    description: backend.description || '',
    permissions: backend.permissions?.map((p) => p.slug) || [],
    userCount: backend.users_count || 0,
    createdAt: backend.created_at ?? '',
  }
}

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([])
  const permissions = ref<BackendPermission[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalRoles = computed(() => roles.value.length)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const data = await rolesApi.list()
      roles.value = data.map(mapBackendRole)
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number } }
      const status = apiErr?.response?.status
      if (status === 403) {
        roles.value = []
        error.value = null
        return
      }

      console.error('[roles store] fetchAll failed:', err)
      error.value = 'Failed to load roles from server.'
    } finally {
      loading.value = false
    }
  }
  async function fetchPermissions() {
    try {
      permissions.value = await rolesApi.permissions()
    } catch {
      permissions.value = []
    }
  }

  function getById(id: string): Role | undefined {
    return roles.value.find((r) => r.id === id)
  }

  async function create(role: Omit<Role, 'id' | 'createdAt'>): Promise<Role> {
    const backend = await rolesApi.create({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    })
    const mapped = mapBackendRole(backend)
    roles.value.push(mapped)
    return mapped
  }

  async function update(id: string, updates: Partial<Role>): Promise<boolean> {
    const index = roles.value.findIndex((r) => r.id === id)
    if (index === -1) return false

    const payload: { name?: string; description?: string; permissions?: string[] } = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.permissions !== undefined) payload.permissions = updates.permissions
    const backend = await rolesApi.update(Number(id), payload)
    if (backend) {
      roles.value[index] = mapBackendRole(backend)
      return true
    }
    return false
  }

  async function remove(id: string): Promise<boolean> {
    const index = roles.value.findIndex((r) => r.id === id)
    if (index === -1) return false
    try {
      await rolesApi.delete(Number(id))
    } catch {}
    roles.value.splice(index, 1)
    return true
  }

  return {
    roles,
    permissions,
    loading,
    error,
    totalRoles,
    fetchAll,
    fetchPermissions,
    getById,
    create,
    update,
    remove,
  }
})
