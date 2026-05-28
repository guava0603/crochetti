import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  getRecordResultSharingLayoutWidthPx,
  measurePrintedDomainWidthPx,
  RECORD_RESULT_SHARING_WIDTH_CSS
} from '@/constants/recordResultSharingLayout'

/**
 * Track layout width from the rendered capture / printed-domain root.
 * @param {import('vue').Ref<HTMLElement | null | undefined>} captureRootRef
 */
export function useRecordResultSharingLayoutWidth(captureRootRef) {
  const layoutWidthPx = ref(0)

  const layoutWidthCss = computed(() =>
    layoutWidthPx.value > 0 ? `${layoutWidthPx.value}px` : RECORD_RESULT_SHARING_WIDTH_CSS
  )

  function refreshLayoutWidth() {
    const root = captureRootRef?.value
    if (root) {
      layoutWidthPx.value = measurePrintedDomainWidthPx(root)
      return
    }
    layoutWidthPx.value = getRecordResultSharingLayoutWidthPx()
  }

  let resizeObserver

  onMounted(() => {
    refreshLayoutWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', refreshLayoutWidth, { passive: true })
      window.visualViewport?.addEventListener('resize', refreshLayoutWidth, { passive: true })
      return
    }

    resizeObserver = new ResizeObserver(() => refreshLayoutWidth())

    watch(
      captureRootRef,
      (root) => {
        resizeObserver.disconnect()
        if (root) {
          const target = root.classList?.contains('printed-domain')
            ? root
            : root.querySelector?.('.printed-domain') || root
          resizeObserver.observe(target)
        }
        refreshLayoutWidth()
      },
      { immediate: true }
    )

    window.addEventListener('resize', refreshLayoutWidth, { passive: true })
    window.visualViewport?.addEventListener('resize', refreshLayoutWidth, { passive: true })
  })

  onUnmounted(() => {
    resizeObserver?.disconnect()
    window.removeEventListener('resize', refreshLayoutWidth)
    window.visualViewport?.removeEventListener('resize', refreshLayoutWidth)
  })

  return {
    layoutWidthPx,
    layoutWidthCss,
    refreshLayoutWidth
  }
}
