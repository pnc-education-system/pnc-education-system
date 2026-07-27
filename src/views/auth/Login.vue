<script setup lang="ts">
defineOptions({ name: 'LoginPage' })

import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api'
import type { LoginCredentials } from '@/types'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'

const { t } = useI18n()
const loginTitle = computed(() => t('login.title'))
const loginSubtitle = computed(() => t('login.subtitle'))
const loginEmailLabel = computed(() => t('login.email_label'))
const loginPasswordLabel = computed(() => t('login.password_label'))
const loginShowPassword = computed(() => t('login.show_password'))
const loginHidePassword = computed(() => t('login.hide_password'))
const loginForgotPassword = computed(() => t('login.forgot_password'))
const loginSignIn = computed(() => t('login.sign_in'))
const loginSigningIn = computed(() => t('login.signing_in'))
const loginSecurityNote = computed(() => t('login.security_note'))

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref<LoginCredentials>({
  email: '',
  password: '',
})

const showPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<{ email?: string; password?: string }>({})

function validateForm(): boolean {
  fieldErrors.value = {}
  let valid = true

  if (!form.value.email.trim()) {
    fieldErrors.value.email = t('login.error.email_required')
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    fieldErrors.value.email = t('login.error.invalid_email')
    valid = false
  }

  if (!form.value.password) {
    fieldErrors.value.password = t('login.error.password_required')
    valid = false
  }

  return valid
}

interface BackendErrorPayload {
  message?: string
  errors?: Record<string, string[]>
}

interface BackendErrorResponse {
  error?: BackendErrorPayload
  message?: string
  errors?: Record<string, string[]>
}

function getFriendlyErrorMessage(err: unknown): string {
  const apiErr = err as { response?: { status?: number; data?: unknown } }
  const status = apiErr.response?.status
  const body = (apiErr.response?.data ?? {}) as BackendErrorResponse

  // Extract message from either envelope { error: { message } } or flat { message } format
  const backendMessage = (body.error?.message || body.message || '').toLowerCase()

  if (status === 401) {
    if (backendMessage.includes('inactive')) {
      return t('login.error.account_deactivated')
    }
    return t('login.error.invalid_credentials')
  }

  if (status === 422) {
    const unwrappedErrors = body.error?.errors || body.errors
    if (unwrappedErrors) {
      fieldErrors.value = {
        email: unwrappedErrors.email?.[0],
        password: unwrappedErrors.password?.[0],
      }
    }
    return t('login.error.correct_fields')
  }

  return t('login.error.generic')
}

async function handleLogin() {
  errorMessage.value = ''
  fieldErrors.value = {}

  if (!validateForm()) return

  isSubmitting.value = true

  try {
    const response = await authApi.login(form.value)

    localStorage.setItem('access_token', response.access_token)
    localStorage.setItem('refresh_token', response.refresh_token)
    localStorage.setItem('user', JSON.stringify(response.user))
    localStorage.setItem('permissions', JSON.stringify(response.permissions))

    authStore.setToken(response.access_token)
    authStore.setRefreshToken(response.refresh_token)
    authStore.setUser(response.user)
    authStore.setPermissions(response.permissions)

    const redirectTo = (route.query.redirect as string) || '/dashboard'
    router.push(redirectTo)
  } catch (err: unknown) {
    // Log the full error details to help diagnose 401 issues
    console.error('[Login] Request failed:', err)
    errorMessage.value = getFriendlyErrorMessage(err)
  } finally {
    isSubmitting.value = false
  }
}

const emailError = computed(() => fieldErrors.value.email)
const passwordError = computed(() => fieldErrors.value.password)

function clearFieldError(field: 'email' | 'password') {
  if (fieldErrors.value[field]) {
    fieldErrors.value = { ...fieldErrors.value, [field]: undefined }
    errorMessage.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-[#0B1120] flex items-center justify-center p-6">
    <div class="absolute right-6 top-6">
      <LanguageSwitcher />
    </div>
    <div class="w-full max-w-[440px] rounded-3xl bg-white dark:bg-[#131B2E] p-10 shadow-2xl ring-1 ring-slate-100 dark:ring-gray-700/50">
      <div class="mb-8 text-center">
        <div class="flex flex-col items-center gap-3 mb-4">
          <img
            src="@/assets/images/PN_logo_clear.png"
            alt="PNC Logo"
            class="w-20 h-20 object-contain"
          />
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{{ loginTitle }}</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-gray-400">{{ loginSubtitle }}</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleLogin">
          <div v-if="errorMessage" class="flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>
          <div>
            <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">{{ loginEmailLabel }}</label>
            <div
              class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200 focus-within:ring-2"
              :class="emailError
                ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500/50 dark:bg-red-500/5'
                : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/20 dark:border-gray-700 dark:focus-within:border-blue-400'"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
                :class="emailError ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'"
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
                class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0"
                :class="emailError ? 'text-red-900 dark:text-red-300 placeholder-red-400 dark:placeholder-red-500' : ''"
                @input="clearFieldError('email')"
              />
            </div>
            <p v-if="emailError" class="mt-1.5 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
              {{ emailError }}
            </p>
          </div>
          <div>
            <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">{{ loginPasswordLabel }}</label>
            <div
              class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-200 focus-within:ring-2"
              :class="passwordError
                ? 'border-red-300 bg-red-50/50 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500/50 dark:bg-red-500/5'
                : 'border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-500/20 dark:border-gray-700 dark:focus-within:border-blue-400'"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
                :class="passwordError ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'"
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
                class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0"
                :class="passwordError ? 'text-red-900 dark:text-red-300 placeholder-red-400 dark:placeholder-red-500' : ''"
                @input="clearFieldError('password')"
              />
              <button
                type="button"
                class="shrink-0 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-1"
                :aria-label="showPassword ? loginHidePassword : loginShowPassword"
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
              <p v-if="passwordError" class="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
                {{ passwordError }}
              </p>
              <router-link to="/forgot-password" class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors ml-auto">{{ loginForgotPassword }}</router-link>
            </div>
          </div>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
            </svg>
            {{ isSubmitting ? loginSigningIn : loginSignIn }}
          </button>

          <div class="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-4 py-3.5 border border-blue-100 dark:border-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <p class="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
              {{ loginSecurityNote }}
            </p>
          </div>
        </form>
      </div>
  </div>
</template>

