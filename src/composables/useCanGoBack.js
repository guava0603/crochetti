import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

function readCanGoBack() {
  const state = window.history.state
  if (state && state.back != null) return true
  return window.history.length > 1
}

/**
 * True when the browser history stack has a previous entry to return to.
 */
export function useCanGoBack() {
  const router = useRouter()
  const canGoBack = ref(false)

  function update() {
    canGoBack.value = readCanGoBack()
  }

  update()
  router.isReady().then(update)

  const stopAfterEach = router.afterEach(() => {
    update()
  })

  onMounted(() => {
    window.addEventListener('popstate', update)
    update()
  })

  onUnmounted(() => {
    stopAfterEach()
    window.removeEventListener('popstate', update)
  })

  return canGoBack
}
