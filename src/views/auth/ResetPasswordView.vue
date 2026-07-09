<script setup lang="ts">
defineOptions({ name: 'ResetPasswordView' })

import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppInput from '@/components/AppInput.vue'
import AppButton from '@/components/AppButton.vue'
import { authAPI } from '@/api/auth'

const router = useRouter()
const route = useRoute()

const formData = reactive({
  email: '',
  resetToken: (route.query.token as string) || '',
  password: '',
  passwordConfirmation: '',
})

const errors = reactive<Record<string, string>>({
  email: '',
  resetToken: '',
  password: '',
  passwordConfirmation: '',
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const serverError = ref('')

function clearError(field: string) {
  errors[field] = ''
  serverError.value = ''
}

function validatePassword(): boolean {
  if (!formData.password) {
    errors.password = 'New password is required'
    return false
  }
  if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
    return false
  }
  errors.password = ''
  return true
}

function validateConfirmPassword(): boolean {
  if (!formData.passwordConfirmation) {
    errors.passwordConfirmation = 'Please confirm your password'
    return false
  }
  if (formData.password !== formData.passwordConfirmation) {
    errors.passwordConfirmation = 'Passwords do not match'
    return false
  }
  errors.passwordConfirmation = ''
  return true
}

// Password strength
const strengthLevel = computed(() => {
  const pwd = formData.password
  if (!pwd) return 0
  let score = 0
  if (pwd.length >= 8) score += 25
  if (pwd.length >= 12) score += 15
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 25
  if (/[0-9]/.test(pwd)) score += 20
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 15
  return Math.min(score, 100)
})

const strengthPercent = computed(() => strengthLevel.value)

const strengthMeta = computed(() => {
  const s = strengthLevel.value
  if (s < 30) return { label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' }
  if (s < 60) return { label: 'Fair', color: 'bg-orange-400', textColor: 'text-orange-400' }
  if (s < 85) return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500' }
  return { label: 'Very strong', color: 'bg-emerald-600', textColor: 'text-emerald-600' }
})

async function handleSubmit() {
  const validPassword = validatePassword()
  const validConfirm = validateConfirmPassword()

  if (!formData.email.trim()) {
    errors.email = 'Email is required'
  } else {
    errors.email = ''
  }
  if (!formData.resetToken.trim()) {
    errors.resetToken = 'Reset token is required'
  } else {
    errors.resetToken = ''
  }

  if (!validPassword || !validConfirm || errors.email || errors.resetToken) return

  loading.value = true
  serverError.value = ''

  try {
    await authAPI.confirmReset(
      formData.email,
      formData.resetToken,
      formData.password,
      formData.passwordConfirmation
    )
    router.replace({ name: 'password-success' })
  } catch (err: unknown) {
    const apiError = err as { response?: { data?: { message?: string } } }
    serverError.value =
      apiError.response?.data?.message || 'Failed to reset password. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-bg"></div>

    <div class="auth-card animate-card-enter">
      <div class="auth-header">
        <div class="logo-icon">
          <!-- Logo matching login page -->
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="10" fill="url(#logo-gradient)"/>
            <path d="M12 28V16L20 12L28 16V28L20 32L12 28Z" fill="white" fill-opacity="0.9"/>
            <path d="M16 22L19 25L24 19" stroke="url(#logo-gradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <defs>
              <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                <stop stop-color="#7c3aed"/>
                <stop offset="1" stop-color="#4f46e5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 class="auth-title">Choose a new password</h1>
        <p class="auth-subtitle">Create a strong password for your account.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
        <!-- Email -->
        <AppInput
          id="reset-email"
          v-model="formData.email"
          label="Email"
          type="email"
          placeholder="staff@pnc.edu.kh"
          autocomplete="email"
          required
          :error="errors.email"
        >
          <template #leading>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </template>
        </AppInput>

        <!-- Reset Token -->
        <AppInput
          id="reset-token"
          v-model="formData.resetToken"
          label="Reset Token"
          type="text"
          placeholder="Enter the reset token from your email"
          required
          :error="errors.resetToken"
        >
          <template #leading>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </template>
        </AppInput>

        <!-- New Password -->
        <AppInput
          id="new-password"
          v-model="formData.password"
          label="New Password"
          :type="showPassword ? 'text' : 'password'"
          placeholder="At least 8 characters"
          autocomplete="new-password"
          required
          :error="errors.password"
          @input="clearError('password')"
          @blur="validatePassword"
        >
          <template #leading>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z" />
              <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
          </template>
          <template #trailing>
            <button
              type="button"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              class="password-toggle"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </template>
        </AppInput>

        <!-- Password strength indicator -->
        <div v-if="formData.password" class="password-strength">
          <div class="strength-bar">
            <div
              class="strength-fill"
              :class="strengthMeta.color"
              :style="{ width: strengthPercent + '%' }"
            ></div>
          </div>
          <span class="strength-text" :class="strengthMeta.textColor">{{ strengthMeta.label }}</span>
        </div>

        <!-- Confirm Password -->
        <AppInput
          id="confirm-password"
          v-model="formData.passwordConfirmation"
          label="Confirm Password"
          :type="showConfirmPassword ? 'text' : 'password'"
          placeholder="Re-enter your new password"
          autocomplete="new-password"
          required
          :error="errors.passwordConfirmation"
          @input="clearError('passwordConfirmation')"
          @blur="validateConfirmPassword"
        >
          <template #leading>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.2 4.5 3 5.8V19a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4.2c1.8-1.3 3-3.4 3-5.8a7 7 0 0 0-7-7z" />
              <path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
          </template>
          <template #trailing>
            <button
              type="button"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
              class="password-toggle"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <svg v-if="!showConfirmPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </template>
        </AppInput>

        <!-- Server error -->
        <Transition name="slide-fade">
          <div v-if="serverError" class="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ serverError }}</span>
          </div>
        </Transition>

        <AppButton type="submit" :loading="loading">
          Update Password
        </AppButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
}

.auth-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #5b21b6 75%, #4338ca 100%);
  z-index: 0;
}

.auth-bg::before {
  content: '';
  position: absolute;
  top: -20%;
  right: -10%;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%);
  pointer-events: none;
}

.auth-bg::after {
  content: '';
  position: absolute;
  bottom: -20%;
  left: -10%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
  pointer-events: none;
}

.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 10px 15px -3px rgba(0, 0, 0, 0.15),
    0 25px 50px -12px rgba(0, 0, 0, 0.3);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  display: inline-flex;
  margin-bottom: 16px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
  margin-bottom: 6px;
}

.auth-subtitle {
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Password toggle */
.password-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.password-toggle:hover {
  background: #f1f5f9;
  color: #64748b;
}

/* Password strength */
.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: -4px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.strength-text {
  font-size: 11px;
  font-weight: 500;
  min-width: 68px;
  text-align: right;
}

/* Alert */
.alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.alert-error {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fecaca;
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive */
@media (max-width: 480px) {
  .auth-card {
    padding: 28px 24px;
    border-radius: 16px;
  }

  .auth-title {
    font-size: 20px;
  }
}
</style>
