import { ref, nextTick } from 'vue'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
  title: string
}

const toasts = ref<Toast[]>([])
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function useToast() {
  function showSuccessToast(msg: string, title: string = 'Success') {
    addToast(msg, 'success', title)
  }

  function showErrorToast(msg: string, title: string = 'Error') {
    addToast(msg, 'error', title)
  }

  function addToast(msg: string, type: 'success' | 'error', title: string) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    toasts.value.push({ id, message: msg, type, title })

    toastTimers.set(id, setTimeout(() => {
      removeToast(id)
    }, 3500))
    nextTick(() => {
      const container = document.getElementById('toast-container')
      if (container) {
        container.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }

  function removeToast(id: string) {
    const timer = toastTimers.get(id)
    if (timer) {
      clearTimeout(timer)
      toastTimers.delete(id)
    }
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    showSuccessToast,
    showErrorToast,
    removeToast,
  }
}
