<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { profileApi } from '@/services/api'
import { useToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { toasts, removeToast } = useToast()

const name = ref('')
const email = ref('')

const submitting = ref(false)
const fieldErrors = ref<Record<string, string>>({})

const userDisplay = computed(() => authStore.user)

const load = async () => {
  if (!authStore.user) {
    await authStore.fetchProfile()
  }
  name.value = authStore.user?.name ?? ''
  email.value = authStore.user?.email ?? ''
}

onMounted(() => {
  load()
})

const validate = () => {
  const errs: Record<string, string> = {}
  if (!name.value.trim()) errs.name = 'Full Name is required.'
  if (!email.value.trim()) errs.email = 'Email is required.'
  // Very basic email check
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errs.email = 'Email must be valid.'
  }
  fieldErrors.value = errs
  return Object.keys(errs).length === 0
}

const submit = async () => {
  if (!validate()) return
  if (!authStore.user?.id) return

  submitting.value = true
  fieldErrors.value = {}

  try {
    const res = await profileApi.updateProfile({
      name: name.value.trim(),
      email: email.value.trim(),
    })

    // backend ApiResponse {status,message,data?}
    if (res?.status === 'error') {
      // fallthrough to toast
      throw new Error(res.message)
    }

    // Prefer store refresh so UI is guaranteed correct
    await authStore.fetchProfile()

    // Toast is provided globally via MainLayout, but useToast gives local list.
    // If your app uses global toasts, this still works.
    toasts.value.push({
      id: Date.now(),
      type: 'success',
      title: 'Profile updated',
      message: res.message || 'Your profile was updated successfully.',
    } as any)

    // Clear any stale errors
    fieldErrors.value = {}
  } catch (err: any) {
    // Laravel validation errors likely in err.response.data.errors
    const errors = err?.response?.data?.errors
    if (errors && typeof errors === 'object') {
      const next: Record<string, string> = {}
      for (const [k, v] of Object.entries(errors)) {
        if (Array.isArray(v) && v.length) next[k] = String(v[0])
        else next[k] = String(v)
      }
      fieldErrors.value = next
    }

    const msg = err?.response?.data?.message || err?.message || 'Failed to update profile.'

    toasts.value.push({
      id: Date.now(),
      type: 'error',
      title: 'Update failed',
      message: msg,
    } as any)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your account details.</p>
      </div>
    </div>

    <form
      class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
      @submit.prevent="submit"
    >
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
          <input
            v-model="name"
            type="text"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:border-blue-500 dark:focus:border-blue-500"
            :class="fieldErrors.name ? 'border-red-500 dark:border-red-500' : ''"
            placeholder="Enter your full name"
          />
          <p v-if="fieldErrors.name" class="text-xs text-red-600 mt-1">{{ fieldErrors.name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:border-blue-500 dark:focus:border-blue-500"
            :class="fieldErrors.email ? 'border-red-500 dark:border-red-500' : ''"
            placeholder="Enter your email"
          />
          <p v-if="fieldErrors.email" class="text-xs text-red-600 mt-1">{{ fieldErrors.email }}</p>
        </div>
      </div>

      <div class="mt-6 flex items-center gap-3">
        <button
          type="submit"
          class="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 cursor-pointer disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitting ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

