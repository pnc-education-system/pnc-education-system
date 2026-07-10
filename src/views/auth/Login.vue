<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi, type LoginCredentials } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref<LoginCredentials>({
  email: '',
  password: '',
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<{ email?: string; password?: string }>({})

/**
 * Client-side validation before submitting to the API.
 * Checks for empty fields and email format.
 */
function validateForm(): boolean {
  fieldErrors.value = {}
  let valid = true

  if (!form.value.email.trim()) {
    fieldErrors.value.email = 'Email is required'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    fieldErrors.value.email = 'Please enter a valid email address'
    valid = false
  }

  if (!form.value.password) {
    fieldErrors.value.password = 'Password is required'
    valid = false
  }

  return valid
}

/**
 * Map backend API error responses to user-friendly messages
 * without revealing security-sensitive details.
 */
function getFriendlyErrorMessage(err: unknown): string {
  const apiErr = err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }
  const status = apiErr.response?.status
  const backendMessage = (apiErr.response?.data?.message || '').toLowerCase()

  // 401 Unauthorized — wrong credentials or inactive account
  if (status === 401) {
    if (backendMessage.includes('inactive')) {
      return 'This account has been deactivated. Please contact your administrator.'
    }
    // Return a generic message for both wrong password and non-existent user
    return 'Invalid email or password. Please check your credentials and try again.'
  }

  // 422 Validation failed — extract field-level errors from the response
  if (status === 422) {
    const errors = apiErr.response?.data?.errors
    if (errors) {
      fieldErrors.value = {
        email: errors.email?.[0],
        password: errors.password?.[0],
      }
    }
    return backendMessage
      ? backendMessage.charAt(0).toUpperCase() + backendMessage.slice(1) + '. Please correct the fields below.'
      : 'Please check the fields below.'
  }

  // Fallback for any other errors
  return 'Login failed. Please try again later.'
}

async function handleLogin() {
  // Clear previous errors
  errorMessage.value = ''
  fieldErrors.value = {}

  // Client-side validation first
  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const response = await authApi.login(form.value)

    // Store tokens
    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('refresh_token', response.refresh_token)
    localStorage.setItem('user', JSON.stringify(response.user))
    localStorage.setItem('permissions', JSON.stringify(response.permissions))

    authStore.setToken(response.access_token)
    authStore.setRefreshToken(response.refresh_token)
    authStore.setUser(response.user)
    authStore.setPermissions(response.permissions)

    router.push('/dashboard')
  } catch (err: unknown) {
    errorMessage.value = getFriendlyErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

// Compute whether each field has an error (for styling)
const emailError = computed(() => fieldErrors.value.email)
const passwordError = computed(() => fieldErrors.value.password)

/** Clear a specific field error when the user starts typing */
function clearFieldError(field: 'email' | 'password') {
  if (fieldErrors.value[field]) {
    fieldErrors.value = { ...fieldErrors.value, [field]: undefined }
    errorMessage.value = ''
  }
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

    <!-- Login card - centered -->
    <div class="w-full max-w-[440px] rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-slate-100">
      <div class="mb-8 text-center">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
          <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-slate-900">Welcome back!</h2>
        <p class="mt-2 text-sm text-slate-500">Sign in to continue to PNC Education System</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin">
          <!-- Error message -->
          <div v-if="errorMessage" class="flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <div
              class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200 focus-within:ring-2"
              :class="emailError
                ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-red-500/20'
                : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/20'"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
                :class="emailError ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'"
              >
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
                :class="emailError ? 'text-red-900 placeholder-red-400' : ''"
                @input="clearFieldError('email')"
              />
            </div>
            <p v-if="emailError" class="mt-1.5 flex items-center gap-1 text-xs text-red-600">
              <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {{ emailError }}
            </p>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <div
              class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200 focus-within:ring-2"
              :class="passwordError
                ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-red-500/20'
                : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/20'"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
                :class="passwordError ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••••••"
                class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0"
                :class="passwordError ? 'text-red-900 placeholder-red-400' : ''"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
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
            <div class="mt-1.5 flex items-center justify-between">
              <p v-if="passwordError" class="flex items-center gap-1 text-xs text-red-600">
                <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                {{ passwordError }}
              </p>
              <router-link to="/forgot-password" class="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors ml-auto">Forgot password?</router-link>
            </div>
          </div>

          <!-- Sign in -->
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
            {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
          </button>

          <!-- Security note -->
          <div class="flex items-start gap-2.5 rounded-xl bg-blue-50 px-4 py-3.5 border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p class="text-xs leading-relaxed text-blue-700">
              Your data is secure and protected with industry-standard encryption.
            </p>
          </div>
        </form>
      </div>
  </div>
</template>

<style scoped>
input::placeholder {
  color: #9ca3af;
}
</style>
