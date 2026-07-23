<script setup lang="ts">
import type { CardTemplate } from '@/types/card'

const props = defineProps<{
  modelValue: CardTemplate
}>()

const emit = defineEmits<{
  'update:modelValue': [value: CardTemplate]
}>()

const templates = [
  { id: 'classic' as CardTemplate, name: 'Classic', description: 'Clean and professional' },
  { id: 'modern' as CardTemplate, name: 'Modern', description: 'Glassmorphism design' },
  { id: 'premium' as CardTemplate, name: 'Premium', description: 'Corporate style' }
]

const selectTemplate = (template: CardTemplate) => {
  emit('update:modelValue', template)
}
</script>

<template>
  <div>
    <h3 class="text-sm font-bold text-gray-800 mb-3">Template Selector</h3>
    <div class="space-y-2">
      <label
        v-for="template in templates"
        :key="template.id"
        class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200"
        :class="modelValue === template.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
        @click="selectTemplate(template.id)"
      >
        <div class="relative">
          <input
            type="radio"
            :name="template.id"
            :checked="modelValue === template.id"
            class="w-4 h-4 text-blue-600 focus:ring-blue-500"
            @change="selectTemplate(template.id)"
          />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-gray-800">{{ template.name }}</p>
          <p class="text-xs text-gray-500">{{ template.description }}</p>
        </div>
        <div v-if="modelValue === template.id" class="w-2 h-2 rounded-full bg-blue-500"></div>
      </label>
    </div>
  </div>
</template>
