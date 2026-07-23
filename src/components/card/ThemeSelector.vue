<script setup lang="ts">
import type { CardTheme } from '@/types/card'

const props = defineProps<{
  modelValue: CardTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CardTheme]
}>()

const themes = [
  { id: 'blue' as CardTheme, name: 'Blue', color: '#1e3a8a', bgColor: 'bg-blue-900' },
  { id: 'green' as CardTheme, name: 'Green', color: '#166534', bgColor: 'bg-green-900' },
  { id: 'purple' as CardTheme, name: 'Purple', color: '#7c3aed', bgColor: 'bg-purple-900' },
  { id: 'orange' as CardTheme, name: 'Orange', color: '#c2410c', bgColor: 'bg-orange-900' },
  { id: 'dark' as CardTheme, name: 'Dark', color: '#1f2937', bgColor: 'bg-gray-900' }
]

const selectTheme = (theme: CardTheme) => {
  emit('update:modelValue', theme)
}
</script>

<template>
  <div>
    <h3 class="text-sm font-bold text-gray-800 mb-3">Theme Colors</h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="theme in themes"
        :key="theme.id"
        @click="selectTheme(theme.id)"
        class="flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200"
        :class="modelValue === theme.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'"
      >
        <div class="w-6 h-6 rounded-full" :style="{ backgroundColor: theme.color }"></div>
        <span class="text-sm font-medium text-gray-700">{{ theme.name }}</span>
      </button>
    </div>
  </div>
</template>
