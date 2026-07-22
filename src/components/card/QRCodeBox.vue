<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  data: string
  size?: number
  color?: string
}>()

const qrDataUrl = ref('')

onMounted(async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.data, {
      width: props.size || 80,
      margin: 1,
      color: {
        dark: props.color || '#000000',
        light: '#ffffff'
      }
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
})
</script>

<template>
  <div class="w-20 h-20 bg-white rounded-lg p-1 border-2 border-gray-200">
    <img
      v-if="qrDataUrl"
      :src="qrDataUrl"
      alt="QR Code"
      class="w-full h-full object-contain"
    />
    <div v-else class="w-full h-full flex items-center justify-center bg-gray-100 rounded">
      <svg class="w-10 h-10 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    </div>
  </div>
</template>
