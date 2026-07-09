<script setup lang="ts">
defineOptions({ name: 'PasswordSuccessView' })

import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'

const router = useRouter()
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-bg"></div>

    <div class="auth-card animate-card-enter">
      <div class="text-center">
        <!-- Shield with checkmark icon -->
        <div class="success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div class="auth-header">
          <h1 class="auth-title">Password Updated Successfully</h1>
          <p class="auth-subtitle">Your password has been updated successfully.</p>
        </div>

        <div class="btn-wrapper">
          <AppButton
            type="button"
            @click="router.push('/login')"
          >
            Back to Sign In
          </AppButton>
        </div>
      </div>
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

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: 50%;
  background: #f5f3ff;
}

.auth-header {
  text-align: center;
}

.btn-wrapper {
  margin-top: 32px;
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
