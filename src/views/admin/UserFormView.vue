<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUsersStore } from '@/stores/users'
import { useRolesStore } from '@/stores/roles'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const usersStore = useUsersStore()
const rolesStore = useRolesStore()
const { showSuccessToast, showErrorToast } = useToast()

const isEdit = computed(() => route.path.includes('/edit'))
const userId = computed(() => route.params.id as string)

const form = ref({
  name: '',
  email: '',
  password: '',
  roleId: '',
  status: 'active' as 'active' | 'inactive',
})

const saving = ref(false)

onMounted(() => {
  if (isEdit.value && userId.value) {
    const existing = usersStore.getById(userId.value)
    if (existing) {
      form.value = {
        name: existing.name,
        email: existing.email,
        password: '',
        roleId: existing.roleId,
        status: existing.status,
      }
    } else {
      showErrorToast('User not found.', 'Error')
      router.push('/admin/users')
    }
  }
})

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.roleId) {
    showErrorToast('Please fill in all required fields.', 'Validation Error')
    return
  }

  if (!isEdit.value && !form.value.password.trim()) {
    showErrorToast('Password is required for new users.', 'Validation Error')
    return
  }

  if (!isEdit.value && form.value.password.length < 8) {
    showErrorToast('Password must be at least 8 characters.', 'Validation Error')
    return
  }

  saving.value = true
  const role = rolesStore.getById(form.value.roleId)

  try {
    if (isEdit.value && userId.value) {
      await usersStore.update(userId.value, {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        roleId: form.value.roleId,
        roleName: role?.name || 'Unknown',
        status: form.value.status,
        ...(form.value.password ? { password: form.value.password } : {}),
      })
      showSuccessToast('User has been updated successfully.', 'User Updated')
    } else {
      await usersStore.create({
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        roleId: form.value.roleId,
        roleName: role?.name || 'Unknown',
        status: form.value.status,
        password: form.value.password.trim(),
      })
      showSuccessToast('New user has been created successfully.', 'User Created')
    }
    router.push('/admin/users')
  } catch {
    showErrorToast('An error occurred while saving.', 'Error')
  } finally {
    saving.value = false
  }
}

function goBack() {
  router.push('/admin/users')
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 cursor-pointer dark:hover:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ isEdit ? 'Edit User' : 'New User' }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ isEdit ? 'Update user details and role assignment.' : 'Create a new user account.' }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <div class="bg-white dark:bg-gray-800/20 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden">
      <!-- Section Header -->
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
        <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Account Details</h2>
      </div>

      <div class="p-6 space-y-5">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Full Name <span class="text-red-400">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. Jane Doe"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Email <span class="text-red-400">*</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            placeholder="e.g. jane@pnc.edu"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {{ isEdit ? 'New Password' : 'Password' }}
            <span v-if="!isEdit" class="text-red-400">*</span>
            <span v-else class="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            v-model="form.password"
            :type="isEdit ? 'password' : 'password'"
            :placeholder="isEdit ? 'Leave blank to keep current' : 'Min. 8 characters'"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition-all duration-200 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-800/70 focus:ring-2 focus:ring-blue-500/20"
          />
          <p v-if="!isEdit" class="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            Minimum 8 characters required.
          </p>
        </div>

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Role <span class="text-red-400">*</span>
          </label>
          <select
            v-model="form.roleId"
            class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-200 outline-none transition-all duration-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="" disabled>Select a role</option>
            <option v-for="role in rolesStore.roles" :key="role.id" :value="role.id">
              {{ role.name }}
            </option>
          </select>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2.5">Account Status</label>
          <div class="flex items-center gap-6">
            <label class="relative flex items-center gap-3 cursor-pointer group">
              <input type="radio" v-model="form.status" value="active" class="peer sr-only" />
              <div class="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all duration-200 group-hover:border-gray-400">
                <div class="w-full h-full rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200 bg-white"></div>
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label class="relative flex items-center gap-3 cursor-pointer group">
              <input type="radio" v-model="form.status" value="inactive" class="peer sr-only" />
              <div class="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 peer-checked:border-gray-500 peer-checked:bg-gray-500 transition-all duration-200 group-hover:border-gray-400">
                <div class="w-full h-full rounded-full scale-0 peer-checked:scale-100 transition-transform duration-200 bg-white"></div>
              </div>
              <span class="text-sm text-gray-700 dark:text-gray-300">Inactive</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-end gap-3">
        <button
          @click="goBack"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer"
        >
          Cancel
        </button>
        <button
          @click="handleSubmit"
          :disabled="saving"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ saving ? 'Saving...' : (isEdit ? 'Update User' : 'Create User') }}
        </button>
      </div>
    </div>
  </div>
</template>
