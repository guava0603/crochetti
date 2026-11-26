// Vertical page scrolling for the record page: bring a component's current position into view.

const isScrollableY = (el) => {
  if (!el || typeof window === 'undefined') return false
  const { overflowY } = window.getComputedStyle(el)
  return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight
}

/** Nearest vertically scrollable ancestor, or the document scroller. */
function findScrollParentY(el) {
  let node = el?.parentElement || null
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollableY(node)) return node
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

// Fixed app chrome that covers the page: the top banner, the bottom footer dock and the
// recording overlay box. The visible area is what's left between them.
const TOP_CHROME = ['.app-banner']
const BOTTOM_CHROME = ['.app-footer', '.top-overlay-box']

const isFixedVisible = (el) => {
  if (!el || el.offsetHeight === 0) return false
  const { position, visibility, display } = window.getComputedStyle(el)
  return (position === 'fixed' || position === 'sticky') && visibility !== 'hidden' && display !== 'none'
}

/** Pixels covered by fixed chrome at the top / bottom of the window. */
function getChromeInsets() {
  if (typeof document === 'undefined') return { top: 0, bottom: 0 }
  const h = window.innerHeight
  let top = 0
  let bottom = 0
  for (const sel of TOP_CHROME) {
    for (const el of document.querySelectorAll(sel)) {
      if (!isFixedVisible(el)) continue
      const r = el.getBoundingClientRect()
      if (r.top <= 1) top = Math.max(top, r.bottom)
    }
  }
  for (const sel of BOTTOM_CHROME) {
    for (const el of document.querySelectorAll(sel)) {
      if (!isFixedVisible(el)) continue
      const r = el.getBoundingClientRect()
      if (r.bottom >= h - 1) bottom = Math.max(bottom, h - r.top)
    }
  }
  return { top: Math.max(0, top), bottom: Math.max(0, bottom) }
}

/**
 * Scroll `el`'s vertical scroller so `el` is centered in the visible area, between the
 * fixed banner and footer. Only the vertical axis moves, so a horizontal carousel around
 * `el` is never disturbed.
 */
export function scrollElementToCenterY(el, { behavior = 'smooth' } = {}) {
  if (!el) return
  const scroller = findScrollParentY(el)
  if (!scroller) return

  const isDocument = scroller === document.scrollingElement || scroller === document.documentElement
  const box = isDocument
    ? { top: 0, bottom: window.innerHeight }
    : { top: scroller.getBoundingClientRect().top, bottom: scroller.getBoundingClientRect().top + scroller.clientHeight }
  // Keep the target out from under the fixed banner / footer.
  const chrome = getChromeInsets()
  const viewTop = Math.max(box.top, chrome.top)
  const viewHeight = Math.max(1, Math.min(box.bottom, window.innerHeight - chrome.bottom) - viewTop)
  const rect = el.getBoundingClientRect()
  const delta = rect.top - viewTop + rect.height / 2 - viewHeight / 2

  const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
  const top = Math.max(0, Math.min(maxTop, scroller.scrollTop + delta))
  scroller.scrollTo({ top, behavior })
}

/** Scroll `el`'s vertical scroller back to the start of the page. */
export function scrollPageToStartY(el, { behavior = 'smooth' } = {}) {
  const scroller = findScrollParentY(el)
  scroller?.scrollTo({ top: 0, behavior })
}
