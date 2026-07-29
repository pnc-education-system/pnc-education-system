<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, type Locale } from '@/i18n'
import { Globe, Check } from 'lucide-vue-next'

const { locale } = useI18n()

const showDropdown = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const activeLocale = computed<Locale>(() => locale.value as Locale)

const options: { key: Locale; label: string; full: string }[] = [
  { key: 'en', label: 'EN', full: 'English' },
  { key: 'kh', label: 'ខ្មែរ', full: 'Khmer' },
]

function toggleDropdown(): void {
  showDropdown.value = !showDropdown.value
}

function switchLanguage(lang: Locale): void {
  if (lang !== activeLocale.value) {
    setLocale(lang)
  }
  showDropdown.value = false
}

function handleClickOutside(e: MouseEvent): void {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showDropdown.value = false
  }
}

function handleKeydown(e: KeyboardEvent, lang: Locale): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    switchLanguage(lang)
  }
}

function handleEscape(e: KeyboardEvent): void {
  if (e.key === 'Escape') showDropdown.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="dropdownRef" class="relative" @keydown="handleEscape">
    <button
      @click="toggleDropdown"
      class="relative flex items-center gap-1.5 px-2.5 h-9 lg:h-10 rounded-xl bg-gray-50 border border-gray-200/80 text-gray-500 cursor-pointer transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700/80 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-200"
      :title="activeLocale === 'en' ? 'Switch Language' : 'ប្តូរភាសា'"
      aria-label="Select language"
      aria-haspopup="listbox"
      :aria-expanded="showDropdown"
    >
      <Globe :size="16" />
      <span class="text-xs font-semibold tracking-wide uppercase">{{ activeLocale }}</span>
      <svg
        class="w-3 h-3 text-gray-400 transition-transform duration-200"
        :class="{ 'rotate-180': showDropdown }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-[-4px]"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-[-4px]"
    >
      <div
        v-if="showDropdown"
        role="listbox"
        aria-label="Language options"
        class="absolute right-0 mt-2 w-44 bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-200/50 overflow-hidden dark:bg-[#131B2E] dark:border-gray-700/80 dark:shadow-gray-900/50"
      >
        <div class="p-1.5">
          <button
            v-for="opt in options"
            :key="opt.key"
            :role="'option'"
            :aria-selected="activeLocale === opt.key"
            @click="switchLanguage(opt.key)"
            @keydown="handleKeydown($event, opt.key)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 cursor-pointer text-left"
            :class="
              activeLocale === opt.key
                ? 'bg-blue-50 text-[#355C8C] font-semibold dark:bg-[#355C8C]/15 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]'
            "
          >
            <span class="flex-1">
              <span class="font-medium">{{ opt.label }}</span>
              <span class="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">{{ opt.full }}</span>
            </span>
            <Check
              v-if="activeLocale === opt.key"
              :size="14"
              class="text-[#355C8C] dark:text-blue-400 flex-shrink-0"
            />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
