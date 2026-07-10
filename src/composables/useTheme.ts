import { ref } from 'vue'

const isDark = ref(false)

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  isDark.value = dark
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

function initTheme() {
  const stored = localStorage.getItem('theme')
  if (stored) {
    applyTheme(stored === 'dark')
    return
  }
  // Check system preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(prefersDark)
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

// Listen for system preference changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches)
    }
  })
}

export function useTheme() {
  return {
    isDark,
    toggleTheme,
    initTheme,
  }
}
