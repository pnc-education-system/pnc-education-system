<script setup lang="ts">
defineOptions({ name: 'ForgotPasswordView' })

import AuthLayout from '@/components/AuthLayout.vue'
</script>

<template>
  <AuthLayout>
    <div class="w-full max-w-md">
      <!-- Card -->
      <div class="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10 animate-card-enter relative">
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
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Forgot password?</h1>
          <p class="text-sm text-gray-500 mt-1.5">Enter your email and we'll send you a reset link</p>
        </div>

        <!-- Form -->
        <form @submit.prevent class="space-y-5">
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
                type="email"
                placeholder="you@example.com"
                autocomplete="email"
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50/50 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/50 focus:bg-white"
              />
            </div>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="relative w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-300/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center min-h-[44px] overflow-hidden group cursor-pointer"
          >
            <span class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
            <span class="relative z-10">Send Reset Link</span>
          </button>
        </form>

        <!-- Back to login -->
        <div class="text-center mt-8">
          <router-link
            to="/login"
            class="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to sign in
          </router-link>
        </div>
      </div>

      <!-- Footer -->
      <p class="text-center mt-6 text-xs text-gray-400">
        &copy; {{ new Date().getFullYear() }} PNC Education System. All rights reserved.
      </p>
    </div>
  </AuthLayout>
</template>
