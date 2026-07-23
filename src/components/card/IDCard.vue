<script setup lang="ts">
import { ref } from 'vue'
import CardFront from './CardFront.vue'
import CardBack from './CardBack.vue'
import type { Student, CardTemplate, CardTheme, CardBackground } from '@/types/card'

const props = defineProps<{
  student: Student
  template: CardTemplate
  theme: CardTheme
  background: CardBackground
  showQRCode: boolean
  showAcademicYear: boolean
  showBatch: boolean
  showStatus: boolean
  showFooter: boolean
}>()

const isFlipped = ref(false)

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}

defineExpose({
  toggleFlip
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Card Container with 3D Flip Animation -->
    <div class="relative w-[320px] h-[500px] perspective-1000">
      <div 
        class="relative w-full h-full transition-transform duration-500 transform-style-3d hover:scale-[1.02]"
        :class="{ 'rotate-y-180': isFlipped }"
      >
        <!-- Front Card -->
        <div class="absolute inset-0 backface-hidden">
          <CardFront
            :student="student"
            :template="template"
            :theme="theme"
            :background="background"
            :showQRCode="showQRCode"
            :showAcademicYear="showAcademicYear"
            :showBatch="showBatch"
            :showStatus="showStatus"
            :showFooter="showFooter"
          />
        </div>

        <!-- Back Card -->
        <div class="absolute inset-0 backface-hidden rotate-y-180">
          <CardBack
            :student="student"
            :template="template"
            :theme="theme"
          />
        </div>
      </div>
    </div>

    <!-- Flip Button -->
    <button
      @click="toggleFlip"
      class="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      {{ isFlipped ? 'Show Front' : 'Show Back' }}
    </button>
  </div>
</template>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.backface-hidden {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>
