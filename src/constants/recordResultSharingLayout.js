/** Viewport gutter for sharing / print column (CSS fallback before first measure). */
export const RECORD_RESULT_SHARING_VIEWPORT_GUTTER_REM = 0.9

export const RECORD_RESULT_SHARING_WIDTH_CSS = `calc(100vw - ${RECORD_RESULT_SHARING_VIEWPORT_GUTTER_REM}rem)`

export function getRemPx(doc = document) {
  const root = doc?.documentElement
  if (!root) return 16
  const size = parseFloat(getComputedStyle(root).fontSize)
  return Number.isFinite(size) && size > 0 ? size : 16
}

/** Pixel width for `100vw - 0.9rem` (fallback only). */
export function getRecordResultSharingLayoutWidthPx(
  viewportWidthPx = typeof window !== 'undefined' ? window.innerWidth : 0,
  remPx = getRemPx()
) {
  const vw = Number(viewportWidthPx)
  const safeVw = Number.isFinite(vw) && vw > 0 ? vw : 0
  const gutter = RECORD_RESULT_SHARING_VIEWPORT_GUTTER_REM * remPx
  return Math.max(0, Math.round(safeVw - gutter))
}

/** Capture root, or its `.printed-domain` node when present (print export). */
export function resolvePrintedDomainElement(root) {
  if (!root) return null
  if (root.classList?.contains('printed-domain')) return root
  const nested = root.querySelector?.('.printed-domain')
  return nested || root
}

/** html2canvas width = rendered `.printed-domain` box (padding + border included). */
export function measurePrintedDomainWidthPx(root) {
  const target = resolvePrintedDomainElement(root)
  if (!target) return 0

  if (typeof target.getBoundingClientRect === 'function') {
    const measured = Math.round(target.getBoundingClientRect().width)
    if (measured > 0) return measured
  }

  if (target.offsetWidth > 0) return target.offsetWidth

  return getRecordResultSharingLayoutWidthPx()
}
