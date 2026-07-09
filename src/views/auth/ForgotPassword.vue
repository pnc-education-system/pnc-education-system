<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi, type PasswordResetRequest } from '@/api/auth'

const router = useRouter()

const form = ref<PasswordResetRequest>({
  email: '',
})

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await authApi.requestPasswordReset(form.value)
    successMessage.value = response.message
    form.value.email = ''
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }
    if (error.response?.data?.message) {
      errorMessage.value = error.response.data.message
    } else if (error.response?.data?.errors) {
      const errors = error.response.data.errors
      errorMessage.value = Object.values(errors).flat().join(', ')
    } else {
      errorMessage.value = 'Failed to send reset link. Please try again.'
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
        <h2 class="text-2xl font-bold text-slate-900">Forgot Password?</h2>
        <p class="mt-2 text-sm text-slate-500">Enter your email to receive a password reset link</p>
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

        <!-- Email -->
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 transition focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 6-10 7L2 6" />
              </svg>
            </span>
            <input
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              placeholder="example@gmail.com"
              class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
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
          {{ isSubmitting ? 'Sending...' : 'Send Reset Link' }}
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
