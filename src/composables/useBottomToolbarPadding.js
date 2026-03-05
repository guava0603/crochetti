import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useBottomToolbarPadding() {
  const bottomToolbarEl = ref(null)
  const bottomToolbarHeight = ref(0)

  const stepFormStyle = computed(() => {
    if (!bottomToolbarHeight.value) return {}
    return {
      paddingBottom: `calc(${bottomToolbarHeight.value}px + env(safe-area-inset-bottom))`
    }
  })

  let resizeObserver = null

  function updateBottomToolbarHeight() {
    const el = bottomToolbarEl.value
    if (!el) {
      bottomToolbarHeight.value = 0
      return
    }
    bottomToolbarHeight.value = Math.ceil(el.getBoundingClientRect().height)
  }

  onMounted(() => {
    updateBottomToolbarHeight()
    window.addEventListener('resize', updateBottomToolbarHeight)

    if (typeof ResizeObserver !== 'undefined' && bottomToolbarEl.value) {
      resizeObserver = new ResizeObserver(() => updateBottomToolbarHeight())
      resizeObserver.observe(bottomToolbarEl.value)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateBottomToolbarHeight)
    if (resizeObserver) resizeObserver.disconnect()
    resizeObserver = null
  })

  return {
    bottomToolbarEl,
    bottomToolbarHeight,
    stepFormStyle,
    updateBottomToolbarHeight
  }
}
