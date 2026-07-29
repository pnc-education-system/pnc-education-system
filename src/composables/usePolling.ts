import { ref, onMounted, onUnmounted } from 'vue'

/**
 * A lightweight polling composable that periodically calls a fetch function.
 *
 * - Pauses automatically when the browser tab is hidden (visibilitychange)
 * - Resumes when the tab becomes visible again
 * - Cleans up the interval on component unmount
 *
 * @param fetchFn     Async function that fetches/refreshes data
 * @param intervalMs  Polling interval in milliseconds (default: 30_000 = 30s)
 * @returns           Reactive `active` ref and `start`/`stop` controls
 */
export function usePolling(fetchFn: () => void | Promise<void>, intervalMs = 30_000) {
  const active = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  function start() {
    if (timer !== null) return // already running
    active.value = true
    timer = setInterval(() => {
      fetchFn()
    }, intervalMs)
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
    active.value = false
  }

  function onVisibilityChange() {
    if (document.hidden) {
      stop()
    } else {
      // Tab became visible again — refetch immediately then resume polling
      fetchFn()
      start()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { active, start, stop }
}
