<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi } from '@/services/api'
import { useI18n } from 'vue-i18n'
import type { PasswordResetConfirm } from '@/types'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'

const router = useRouter()
const route = useRoute()

const form = ref<PasswordResetConfirm>({
  email: '',
  reset_token: '',
  password: '',
  password_confirmation: '',
})

const { t } = useI18n()
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

onMounted(() => {
  form.value.email = (route.query.email as string) || ''
  form.value.reset_token = (route.query.reset_token as string) || (route.query.token as string) || ''
})

async function handleSubmit() {
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const response = await authApi.resetPassword(form.value)
    successMessage.value = response.message
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err: unknown) {
    const apiErr = err as { response?: { data?: { error?: { message?: string }; message?: string; errors?: Record<string, string[]> } } }
    errorMessage.value = apiErr.response?.data?.error?.message
      || apiErr.response?.data?.message
      || t('reset_password.error_generic')
  } finally {
    isSubmitting.value = false
  }
}

function goToLogin() {
  router.push('/login')
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
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{{ t('reset_password.title') }}</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-gray-400">{{ t('reset_password.subtitle') }}</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div v-if="successMessage" class="flex items-center gap-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400 border border-green-100 dark:border-green-500/20">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>
        <div v-if="errorMessage" class="flex items-center gap-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <input type="hidden" v-model="form.email" />
        <input type="hidden" v-model="form.reset_token" />
        <div>
          <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">{{ t('reset_password.new_password_label') }}</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
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
              class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              class="shrink-0 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-1"
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
        <div>
          <label for="password_confirmation" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">{{ t('reset_password.confirm_password_label') }}</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
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
              class="w-full border-0 bg-transparent p-0 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              class="shrink-0 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors p-1"
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
        <button
          type="submit"
          :disabled="isSubmitting"            class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
          </svg>
          {{ isSubmitting ? t('reset_password.resetting') : t('reset_password.reset_button') }}
        </button>
        <div class="text-center">
          <button
            type="button"
            @click="goToLogin"
            class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {{ t('reset_password.back_to_login') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
