import { computed, onUnmounted, ref, watch } from 'vue'

export const PRINTED_IMAGE_CAPTURE_OPTIONS = {
  flattenForExport: true,
  backgroundColor: '#ffffff'
}

const REFRESH_DEBOUNCE_MS = 200

function resolveCaptureTargets(raw) {
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : [raw]
  return list.filter(Boolean)
}

/**
 * Rasterize hidden print/capture component(s) and expose preview object URL(s).
 * @param {() => import('vue').ComponentPublicInstance | import('vue').ComponentPublicInstance[] | null | undefined} getCaptureTargets
 * @param {import('vue').WatchSource | import('vue').WatchSource[]} watchSources
 * @param {() => Record<string, unknown>} [getCaptureOptions]
 */
export function usePrintedImagePreview(getCaptureTargets, watchSources, getCaptureOptions) {
  const previewUrls = ref([])
  const previewLoading = ref(false)
  const previewUrl = computed(() => previewUrls.value[0] || '')

  let refreshToken = 0
  let debounceTimer

  function revokePreviewUrls() {
    for (const url of previewUrls.value) {
      if (url) URL.revokeObjectURL(url)
    }
    previewUrls.value = []
  }

  async function refreshPreview() {
    const targets = resolveCaptureTargets(getCaptureTargets())
    if (!targets.length) return

    const token = ++refreshToken
    previewLoading.value = true

    try {
      const nextUrls = []

      for (const inst of targets) {
        const capture = inst?.captureAsPngBlob
        if (typeof capture !== 'function') continue

        const captureOptions = {
          ...PRINTED_IMAGE_CAPTURE_OPTIONS,
          ...(typeof getCaptureOptions === 'function' ? getCaptureOptions() : {})
        }
        const blob = await capture(captureOptions)
        if (token !== refreshToken) return
        if (blob) nextUrls.push(URL.createObjectURL(blob))
      }

      if (token !== refreshToken) return

      revokePreviewUrls()
      previewUrls.value = nextUrls
    } finally {
      if (token === refreshToken) {
        previewLoading.value = false
      }
    }
  }

  function scheduleRefresh() {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      refreshPreview()
    }, REFRESH_DEBOUNCE_MS)
  }

  watch(watchSources, scheduleRefresh, { deep: true })

  onUnmounted(() => {
    clearTimeout(debounceTimer)
    refreshToken += 1
    revokePreviewUrls()
  })

  return {
    previewUrl,
    previewUrls,
    previewLoading,
    refreshPreview,
    scheduleRefresh
  }
}
