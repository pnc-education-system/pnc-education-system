<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { profileApi } from '@/services/api'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const authStore = useAuthStore()
const { toasts } = useToast()

const name = ref('')
const email = ref('')

const submitting = ref(false)
const fieldErrors = ref<Record<string, string>>({})

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
  if (!name.value.trim()) errs.name = t('profile.validation.name_required')
  if (!email.value.trim()) errs.email = t('profile.validation.email_required')
  // Very basic email check
  if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errs.email = t('profile.validation.email_invalid')
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

    if (res?.status === 'error') {
      throw new Error(res.message)
    }

    await authStore.fetchProfile()

    toasts.value.push({
      id: String(Date.now()),
      type: 'success',
      title: t('profile.toast.title.updated'),
      message: res?.message || t('profile.toast.message.updated_default'),
    })

    fieldErrors.value = {}
  } catch (err: unknown) {
    const e = err as { response?: { data?: { message?: string } }; message?: string }

    const msg =
      e?.response?.data?.message || e?.message || t('profile.toast.message.update_failed_default')

    toasts.value.push({
      id: String(Date.now()),
      type: 'error',
      title: t('profile.toast.title.update_failed'),
      message: msg,
    })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('profile.title') }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('profile.subtitle') }}</p>
      </div>
    </div>

    <form
      class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6"
      @submit.prevent="submit"
    >
      <div class="grid grid-cols-1 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
            t('profile.label.name')
          }}</label>
          <input
            v-model="name"
            type="text"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:border-blue-500 dark:focus:border-blue-500"
            :class="fieldErrors.name ? 'border-red-500 dark:border-red-500' : ''"
            :placeholder="t('profile.placeholder.name')"
          />
          <p v-if="fieldErrors.name" class="text-xs text-red-600 mt-1">{{ fieldErrors.name }}</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
            t('profile.label.email')
          }}</label>
          <input
            v-model="email"
            type="email"
            class="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:border-blue-500 dark:focus:border-blue-500"
            :class="fieldErrors.email ? 'border-red-500 dark:border-red-500' : ''"
            :placeholder="t('profile.placeholder.email')"
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
          {{ submitting ? t('profile.saving') : t('profile.button.save_changes') }}
        </button>
      </div>
    </form>
  </div>
</template>
