<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRolesStore } from '@/stores/roles'
import { useToast } from '@/composables/useToast'
import { ALL_PERMISSION_GROUPS } from '@/types'
import type { PermissionGroup } from '@/types'

const route = useRoute()
const router = useRouter()
const rolesStore = useRolesStore()
const { showSuccessToast, showErrorToast } = useToast()

const isEdit = computed(() => route.path.includes('/edit'))
const roleId = computed(() => route.params.id as string)

const form = ref({
  name: '',
  description: '',
  permissions: [] as string[],
})

const saving = ref(false)
const permissionGroups = ALL_PERMISSION_GROUPS

onMounted(() => {
  if (isEdit.value && roleId.value) {
    const existing = rolesStore.getById(roleId.value)
    if (existing) {
      form.value = {
        name: existing.name,
        description: existing.description,
        permissions: [...existing.permissions],
      }
    } else {
      showErrorToast('Role not found.', 'Error')
      router.push('/admin/roles')
    }
  }
})

function togglePermission(permKey: string) {
  const idx = form.value.permissions.indexOf(permKey)
  if (idx === -1) {
    form.value.permissions.push(permKey)
  } else {
    form.value.permissions.splice(idx, 1)
  }
}

function isPermissionSelected(key: string): boolean {
  return form.value.permissions.includes(key)
}

function selectAllInGroup(group: PermissionGroup) {
  const allKeys = group.permissions.map(p => p.key)
  const allSelected = allKeys.every(k => form.value.permissions.includes(k))
  if (allSelected) {
    form.value.permissions = form.value.permissions.filter(k => !allKeys.includes(k))
  } else {
    const missing = allKeys.filter(k => !form.value.permissions.includes(k))
    form.value.permissions.push(...missing)
  }
}

function isGroupAllSelected(group: PermissionGroup): boolean {
  return group.permissions.every(p => form.value.permissions.includes(p.key))
}

function isGroupPartiallySelected(group: PermissionGroup): boolean {
  const selected = group.permissions.filter(p => form.value.permissions.includes(p.key))
  return selected.length > 0 && selected.length < group.permissions.length
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    showErrorToast('Role name is required.', 'Validation Error')
    return
  }

  saving.value = true

  try {
    if (isEdit.value && roleId.value) {
      await rolesStore.update(roleId.value, {
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        permissions: [...form.value.permissions],
      })
      showSuccessToast('Role has been updated successfully.', 'Role Updated')
    } else {
      await rolesStore.create({
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        permissions: [...form.value.permissions],
        userCount: 0,
      })
      showSuccessToast('New role has been created successfully.', 'Role Created')
    }
    router.push('/admin/roles')
  } catch {
    showErrorToast('An error occurred while saving.', 'Error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/admin/roles')
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ isEdit ? 'Edit Role' : 'New Role' }}</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ isEdit ? 'Update role details and permissions.' : 'Create a new role with custom permissions.' }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <div class="space-y-6">
      <!-- Role Details -->
      <div class="bg-white border border-gray-100 rounded-2xl p-6 space-y-5 dark:bg-gray-800/20 dark:border-gray-700/50">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Role Details</h2>

        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">Role Name <span class="text-red-400">*</span></label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Editor"
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
          />
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Describe what this role can do..."
            class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 resize-none dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-200"
          ></textarea>
        </div>
      </div>

      <!-- Permissions -->
      <div class="bg-white border border-gray-100 rounded-2xl p-6 dark:bg-gray-800/20 dark:border-gray-700/50">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Permissions</h2>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ form.permissions.length }} selected
          </span>
        </div>

        <div class="space-y-5">
          <div v-for="group in permissionGroups" :key="group.group" class="border border-gray-100 rounded-xl overflow-hidden dark:border-gray-700/50">
            <!-- Group Header -->
            <div
              @click="selectAllInGroup(group)"
              class="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors dark:bg-gray-800/50 dark:hover:bg-gray-800"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150"
                  :class="isGroupAllSelected(group)
                    ? 'bg-blue-500 border-blue-500'
                    : isGroupPartiallySelected(group)
                      ? 'bg-blue-200 border-blue-300 dark:bg-blue-500/30'
                      : 'border-gray-300 dark:border-gray-600'"
                >
                  <svg v-if="isGroupAllSelected(group) || isGroupPartiallySelected(group)" class="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ group.group }}</span>
              </div>
              <span class="text-xs text-gray-400">{{ group.permissions.filter(p => form.permissions.includes(p.key)).length }}/{{ group.permissions.length }}</span>
            </div>

            <!-- Permissions in Group -->
            <div class="px-4 py-2 space-y-1">
              <label
                v-for="perm in group.permissions"
                :key="perm.key"
                class="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer dark:hover:bg-gray-800/30"
              >
                <input
                  type="checkbox"
                  :checked="isPermissionSelected(perm.key)"
                  @change="togglePermission(perm.key)"
                  class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/30 cursor-pointer"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ perm.label }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3">
        <button
          @click="goBack"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors cursor-pointer dark:bg-gray-700 dark:text-gray-300"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="saving"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ saving ? 'Saving...' : (isEdit ? 'Update Role' : 'Create Role') }}
        </button>
      </div>
    </div>
  </div>
</template>
