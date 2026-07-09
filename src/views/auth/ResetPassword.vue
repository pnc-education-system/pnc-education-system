<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi, type PasswordResetConfirm } from '@/api/auth'

const router = useRouter()
const route = useRoute()

const form = ref<PasswordResetConfirm>({
  email: '',
  token: '',
  password: '',
  password_confirmation: '',
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

onMounted(() => {
  // Get email and token from query params
  form.value.email = (route.query.email as string) || ''
  form.value.token = (route.query.token as string) || ''
})

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await authApi.confirmPasswordReset(form.value)
    successMessage.value = response.message
    
    // Redirect to login after successful reset
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    if (error.response?.data?.message) {
      errorMessage.value = error.response.data.message
    } else if (error.response?.data?.errors) {
      const errors = error.response.data.errors
      errorMessage.value = Object.values(errors).flat().join(', ')
    } else {
      errorMessage.value = 'Failed to reset password. Please try again.'
    }
  } finally {
    isSubmitting.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-6">
    <!-- Language selector - top right -->
    <div class="absolute right-6 top-6">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        EN
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </div>

    <!-- Card -->
    <div class="w-full max-w-[450px] rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-slate-100 lg:max-w-[480px]">
      <div class="mb-8 text-center">
        <h2 class="text-2xl font-bold text-slate-900">Reset Password</h2>
        <p class="mt-2 text-sm text-slate-500">Enter your new password below</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <!-- Success message -->
        <div v-if="successMessage" class="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {{ successMessage }}
        </div>

        <!-- Error message -->
        <div v-if="errorMessage" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ errorMessage }}
        </div>

        <!-- Email (hidden, from query param) -->
        <input type="hidden" v-model="form.email" />
        <input type="hidden" v-model="form.token" />

        <!-- New Password -->
        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••••••"
              class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              class="shrink-0 text-slate-400 hover:text-slate-600"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password_confirmation"
              v-model="form.password_confirmation"
              :type="showConfirmPassword ? 'text' : 'password'"
              autocomplete="new-password"
              placeholder="••••••••••••"
              class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              class="shrink-0 text-slate-400 hover:text-slate-600"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg v-if="!showConfirmPassword" xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
          {{ isSubmitting ? 'Resetting...' : 'Reset Password' }}
        </button>

        <!-- Back to login -->
        <div class="text-center">
          <button
            type="button"
            @click="goToLogin"
            class="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Login
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
