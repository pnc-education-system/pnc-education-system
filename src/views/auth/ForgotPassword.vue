<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authApi } from '@/services/api'
import type { PasswordResetRequest } from '@/types'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'

const { t } = useI18n()
const router = useRouter()

const forgotTitle = computed(() => t('forgot_password.title'))
const forgotSubtitle = computed(() => t('forgot_password.subtitle'))
const forgotEmailLabel = computed(() => t('forgot_password.email_label'))
const forgotSendLink = computed(() => t('forgot_password.send_link'))
const forgotSending = computed(() => t('forgot_password.sending'))
const forgotBackToLogin = computed(() => t('forgot_password.back_to_login'))

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
    const apiErr = err as { response?: { data?: { error?: { message?: string }; message?: string; errors?: Record<string, string[]> } } }
    errorMessage.value = apiErr.response?.data?.error?.message
      || apiErr.response?.data?.message
      || t('forgot_password.error.generic')
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
    <div class="absolute right-6 top-6">
      <LanguageSwitcher />
    </div>
    <div class="w-full max-w-[440px] rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-slate-100">
      <div class="mb-8 text-center">
        <div class="flex flex-col items-center gap-3 mb-4">
          <img
            src="@/assets/images/PN_logo_clear.png"
            alt="PNC Logo"
            class="w-20 h-20 object-contain"
          />
        </div>
        <h2 class="text-2xl font-bold text-slate-900 dark:text-white">{{ forgotTitle }}</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-gray-400">{{ forgotSubtitle }}</p>
      </div>

      <form class="space-y-5" @submit.prevent="handleSubmit">
        <div v-if="successMessage" class="flex items-center gap-2.5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 border border-green-100">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{{ successMessage }}</span>
        </div>
        <div v-if="errorMessage" class="flex items-center gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-100">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
        <div>
          <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-300">{{ forgotEmailLabel }}</label>
          <div class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 transition-all duration-200 focus-within:border-blue-500 dark:focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-blue-400/20">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
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
            />
          </div>
        </div>
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
          {{ isSubmitting ? forgotSending : forgotSendLink }}
        </button>
        <div class="text-center">
          <button
            type="button"
            @click="goToLogin"
            class="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {{ forgotBackToLogin }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
