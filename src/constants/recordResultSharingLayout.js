/** Use container width in CSS; avoid 100vw inside padded `.page-content` (causes horizontal overflow). */
export const RECORD_RESULT_SHARING_WIDTH_CSS = '100%'

/** Legacy gutter used only for px fallback before first measure. */
export const RECORD_RESULT_SHARING_VIEWPORT_GUTTER_REM = 0.9

export function getRemPx(doc = document) {
  const root = doc?.documentElement
  if (!root) return 16
  const size = parseFloat(getComputedStyle(root).fontSize)
  return Number.isFinite(size) && size > 0 ? size : 16
}

/** Pixel width fallback when the capture root is not yet measurable. */
export function getRecordResultSharingLayoutWidthPx(
  viewportWidthPx = typeof window !== 'undefined' ? document.documentElement?.clientWidth : 0,
  remPx = getRemPx()
) {
  const vw = Number(viewportWidthPx)
  const safeVw = Number.isFinite(vw) && vw > 0 ? vw : 0
  const gutter = RECORD_RESULT_SHARING_VIEWPORT_GUTTER_REM * remPx
  return Math.max(0, Math.round(safeVw - gutter))
}

/** Prefer a parent content box width over raw viewport when measuring layout. */
export function measureLayoutContainerWidthPx(element) {
  if (!element) return 0

  let node = element.parentElement
  while (node) {
    if (typeof node.getBoundingClientRect === 'function') {
      const w = Math.round(node.getBoundingClientRect().width)
      if (w > 0) return w
    }
    if (node.classList?.contains('page-content') || node.classList?.contains('print-page-content')) {
      break
    }
    node = node.parentElement
  }

  return getRecordResultSharingLayoutWidthPx()
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

  const measured = measureLayoutContainerWidthPx(target)
  if (measured > 0) return measured

  return getRecordResultSharingLayoutWidthPx()
}
