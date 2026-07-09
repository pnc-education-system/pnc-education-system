<script setup lang="ts">
import pncBackground from '@/assets/images/pnc.background.png'
import pncLogo from '@/assets/images/pnc.logo.png'
</script>

<template>
  <div class="min-h-screen flex bg-gradient-to-br from-indigo-50 via-white to-purple-50">
    <!-- Left Image Section -->
    <div
      class="hidden lg:flex w-1/2 bg-cover bg-center relative"
      :style="{ backgroundImage: `url(${pncBackground})` }"
    >
      <!-- Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-indigo-900/60"></div>

      <!-- Subtle pattern overlay -->
      <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle at 25% 25%, white 1px, transparent 1px); background-size: 40px 40px;"></div>

      <!-- Logo + Text -->
      <div class="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16 2xl:p-20">
        <!-- Logo top -->
        <div>
          <img
            :src="pncLogo"
            alt="PNC Logo"
            class="w-28 xl:w-32 mb-12 drop-shadow-lg"
          />
        </div>

        <!-- Brand text bottom -->
        <div class="space-y-2">
          <h1 class="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight tracking-tight">
            Empowering
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">Education</span>.
          </h1>

          <h1 class="text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white leading-tight tracking-tight">
            Building
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300">Futures</span>.
          </h1>

          <p class="mt-8 text-base xl:text-lg text-white/80 max-w-lg leading-relaxed font-light">
            A smart platform for education staff to manage,
            connect and create impact every day.
          </p>

          <!-- Decorative line -->
          <div class="mt-8 w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- Right Content -->
    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <slot />
    </div>
  </div>
</template>
