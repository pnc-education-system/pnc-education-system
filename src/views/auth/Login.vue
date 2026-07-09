<template>
  <AuthLayout>
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 relative animate-card-enter">
        <!-- Top accent -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>

        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-50 mb-4 ring-1 ring-indigo-100">
            <svg class="w-7 h-7 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z"/>
              <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
          <p class="text-sm text-gray-500 mt-1.5">Sign in to your account to continue</p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-5" novalidate>
          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div class="relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                placeholder="you@example.com"
                required
                autocomplete="email"
                @input="clearError('email')"
                @blur="validateEmail"
                class="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm text-gray-900 bg-gray-50/50 outline-none transition-all duration-200 placeholder:text-gray-400"
                :class="errors.email
                  ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-2 focus:ring-red-200/50'
                  : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 focus:bg-white'"
              />
            </div>
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 -translate-y-1"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <p v-if="errors.email" class="flex items-center gap-1 text-xs text-red-500 mt-1.5 pl-1">
                <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ errors.email }}
              </p>
            </Transition>
          </div>

          <!-- Password -->
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div class="relative">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z" />
                <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </svg>
              <input
                id="password"
                v-model="formData.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter your password"
                required
                autocomplete="current-password"
                @input="clearError('password')"
                @blur="validatePassword"
                class="w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm text-gray-900 bg-gray-50/50 outline-none transition-all duration-200 placeholder:text-gray-400"
                :class="errors.password
                  ? 'border-red-300 bg-red-50/50 focus:border-red-400 focus:ring-2 focus:ring-red-200/50'
                  : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 focus:bg-white'"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
              >
                <svg v-if="!showPassword" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              </button>
            </div>
            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              leave-active-class="transition-all duration-150 ease-in"
              enter-from-class="opacity-0 -translate-y-1"
              leave-to-class="opacity-0 -translate-y-1"
            >
              <p v-if="errors.password" class="flex items-center gap-1 text-xs text-red-500 mt-1.5 pl-1">
                <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ errors.password }}
              </p>
            </Transition>
          </div>

          <!-- Forgot Password -->
          <div class="flex justify-end -mt-1">
            <router-link
              to="/forgot-password"
              class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Forgot password?
            </router-link>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="relative w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center min-h-[44px] overflow-hidden group"
          >
            <!-- Shine effect -->
            <span class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
            <span v-if="loading" class="w-5 h-5 border-2.5 border-white/30 border-t-white rounded-full animate-spinner inline-block"></span>
            <span v-else class="relative z-10">Sign In</span>
          </button>

          <!-- Server Error -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            leave-active-class="transition-all duration-200 ease-in"
            enter-from-class="opacity-0 -translate-y-2"
            leave-to-class="opacity-0 -translate-y-2"
          >
            <div v-if="error" class="flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-medium text-red-700 bg-red-50 border border-red-100">
              <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ error }}</span>
            </div>
          </Transition>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center mt-6 text-xs text-gray-400">
        &copy; {{ new Date().getFullYear() }} PNC Education System. All rights reserved.
      </p>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authAPI } from '@/api/auth'
import AuthLayout from '@/components/AuthLayout.vue'

interface LoginForm {
  email: string
  password: string
}

interface FormErrors {
  email: string
  password: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const router = useRouter()
const authStore = useAuthStore()

const formData = reactive<LoginForm>({
  email: '',
  password: ''
})

const errors = reactive<FormErrors>({
  email: '',
  password: ''
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

function clearError(field: keyof FormErrors) {
  errors[field] = ''
  error.value = ''
}

function validateEmail(): boolean {
  if (!formData.email) {
    errors.email = 'Email is required'
    return false
  }
  if (!EMAIL_REGEX.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
    return false
  }
  errors.email = ''
  return true
}

function validatePassword(): boolean {
  if (!formData.password) {
    errors.password = 'Password is required'
    return false
  }
  if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
    return false
  }
  errors.password = ''
  return true
}

function validateForm(): boolean {
  const validEmail = validateEmail()
  const validPassword = validatePassword()
  return validEmail && validPassword
}

async function handleLogin() {
  if (!validateForm()) return

  loading.value = true
  error.value = ''

  try {
    const response = await authAPI.login(formData.email, formData.password)

    authStore.setTokens(response)
    authStore.setUser(response.user)

    router.push('/dashboard')
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { message?: string } } }
    error.value = apiError.response?.data?.message || 'Invalid email or password'
  } finally {
    loading.value = false
  }
}
</script>
