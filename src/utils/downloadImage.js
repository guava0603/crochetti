/**
 * Capture a DOM node as PNG and share (iOS sheet) or download.
 * Used by download-design, record result-sharing, and related export flows.
 *
 * On Capacitor native (iOS/Android), PNGs are written to a real cache .png file and
 * shared via @capacitor/share so iOS shows "Save Image" in the share sheet.
 */

import { Capacitor } from '@capacitor/core'
import { getRemPx } from '@/constants/recordResultSharingLayout'
import { sharePngBlobsViaNative } from '@/utils/nativeImageShare'

const EXPORT_CARD_BG = '#f5ebda'
const EXPORT_CAPTURE_STYLE_ID = 'corchetti-export-capture-fix'
const CARD_INNER_FRAME_INSET_REM = 0.4375
const CARD_INNER_FRAME_RADIUS_REM = 0.875

/** Real `.card-inner-frame` nodes size reliably in html2canvas; set explicit px box in the clone. */
function normalizeCardInnerFrames(root, doc) {
  if (!root?.querySelectorAll) return

  const remPx = getRemPx(doc)
  const insetPx = CARD_INNER_FRAME_INSET_REM * remPx
  const radiusPx = CARD_INNER_FRAME_RADIUS_REM * remPx

  for (const card of root.querySelectorAll('.export-healing-card')) {
    const frame = card.querySelector(':scope > .card-inner-frame')
    if (!frame) continue

    const w = card.offsetWidth
    const h = card.offsetHeight
    if (w <= 0 || h <= 0) continue

    const innerW = Math.max(0, w - insetPx * 2)
    const innerH = Math.max(0, h - insetPx * 2)

    frame.style.setProperty('display', 'block', 'important')
    frame.style.setProperty('position', 'absolute', 'important')
    frame.style.setProperty('top', `${insetPx}px`, 'important')
    frame.style.setProperty('left', `${insetPx}px`, 'important')
    frame.style.setProperty('width', `${innerW}px`, 'important')
    frame.style.setProperty('height', `${innerH}px`, 'important')
    frame.style.setProperty('right', 'auto', 'important')
    frame.style.setProperty('bottom', 'auto', 'important')
    frame.style.setProperty('margin', '0', 'important')
    frame.style.setProperty('box-sizing', 'border-box', 'important')
    frame.style.setProperty('border-radius', `${radiusPx}px`, 'important')
    frame.style.setProperty('border-style', 'solid', 'important')
    frame.style.setProperty('border-width', '1px', 'important')
    frame.style.setProperty('border-color', 'rgba(122, 90, 58, 0.38)', 'important')
    frame.style.setProperty('pointer-events', 'none', 'important')
  }
}

function injectExportCaptureStyles(doc) {
  if (!doc?.head) return
  if (doc.getElementById(EXPORT_CAPTURE_STYLE_ID)) return

  const style = doc.createElement('style')
  style.id = EXPORT_CAPTURE_STYLE_ID
  style.textContent = `
    .export-healing-card::before,
    .export-healing-card::after,
    .export-healing-card *::before,
    .export-healing-card *::after {
      display: none !important;
      content: none !important;
    }
  `
  doc.head.appendChild(style)
}

/** Flatten styles that html2canvas renders incorrectly (backdrop-filter, inset shadow, alpha fill). */
export function applyExportFlatStyles(root, doc = null, { layoutWidthPx } = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') return

  if (doc) injectExportCaptureStyles(doc)

  if (layoutWidthPx > 0) {
    root.style.setProperty('width', `${layoutWidthPx}px`, 'important')
    root.style.setProperty('max-width', `${layoutWidthPx}px`, 'important')
    root.style.setProperty('box-sizing', 'border-box', 'important')
  }

  const cardSelector = '.export-healing-card'
  const nodes = root.querySelectorAll(cardSelector)
  for (const el of nodes) {
    el.style.setProperty('background', EXPORT_CARD_BG, 'important')
    el.style.setProperty('background-color', EXPORT_CARD_BG, 'important')
    el.style.setProperty('backdrop-filter', 'none', 'important')
    el.style.setProperty('-webkit-backdrop-filter', 'none', 'important')
    el.style.setProperty('box-shadow', '0 12px 26px rgba(0, 0, 0, 0.1)', 'important')
  }

  for (const el of root.querySelectorAll('.export-healing-card.rest-card, .export-healing-card.extra-note-card')) {
    el.style.setProperty('overflow', 'hidden', 'important')
  }

  if (root.matches?.(cardSelector)) {
    root.style.setProperty('background', EXPORT_CARD_BG, 'important')
    root.style.setProperty('background-color', EXPORT_CARD_BG, 'important')
    root.style.setProperty('backdrop-filter', 'none', 'important')
    root.style.setProperty('-webkit-backdrop-filter', 'none', 'important')
    root.style.setProperty('box-shadow', '0 12px 26px rgba(0, 0, 0, 0.1)', 'important')
  }

  root.style.setProperty('background', '#ffffff', 'important')
  root.style.setProperty('background-color', '#ffffff', 'important')

  normalizeCardInnerFrames(root, doc)
}

export async function captureElementAsPngBlob(element, options = {}) {
  if (!element) throw new Error('captureElementAsPngBlob: missing element')

  const { default: html2canvas } = await import('html2canvas')

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  const scale = options.scale ?? Math.max(1, Math.min(2, dpr))
  const flattenForExport = Boolean(options.flattenForExport)
  const layoutWidthPx = Number(options.layoutWidthPx) || 0
  const html2canvasOptions = options.html2canvas || {}

  const canvas = await html2canvas(element, {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    scale,
    useCORS: true,
    logging: false,
    ...html2canvasOptions,
    onclone: (doc, clonedNode) => {
      if (flattenForExport) {
        applyExportFlatStyles(clonedNode, doc, { layoutWidthPx })
      }
      if (typeof html2canvasOptions.onclone === 'function') {
        html2canvasOptions.onclone(doc, clonedNode)
      }
    }
  })

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png')
  })

  if (!blob) throw new Error('Failed to create PNG blob')
  return blob
}

/**
 * @returns {'share'|'download'|'cancelled'}
 */
export async function shareOrDownloadImageBlob({ blob, filename, shareTitle } = {}) {
  if (!blob) throw new Error('shareOrDownloadImageBlob: missing blob')

  const safeName = String(filename || 'image.png').trim() || 'image.png'

  if (Capacitor.isNativePlatform()) {
    return sharePngBlobsViaNative({
      items: [{ blob, filename: safeName }],
      shareTitle: shareTitle ?? safeName
    })
  }

  const file = typeof File !== 'undefined' ? new File([blob], safeName, { type: 'image/png' }) : null

  try {
    if (file && navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({
        title: String(shareTitle || safeName),
        files: [file]
      })
      return 'share'
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled'
    // Fall through to download.
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return 'download'
}

/**
 * Share multiple PNG blobs in one action when possible.
 *
 * Note: many browsers block multiple downloads from a single click; prefer Web Share when available.
 *
 * @returns {'share'|'download'|'cancelled'}
 */
export async function shareOrDownloadImageBlobs(items = []) {
  const list = Array.isArray(items) ? items : []
  const normalized = list
    .map((it) => ({
      blob: it?.blob ?? null,
      filename: String(it?.filename || 'image.png').trim() || 'image.png'
    }))
    .filter((it) => it.blob)

  if (!normalized.length) throw new Error('shareOrDownloadImageBlobs: missing blobs')

  if (Capacitor.isNativePlatform()) {
    return sharePngBlobsViaNative({
      items: normalized,
      shareTitle: normalized[0]?.filename
    })
  }

  const files =
    typeof File !== 'undefined'
      ? normalized.map((it) => new File([it.blob], it.filename, { type: 'image/png' }))
      : null

  try {
    if (files && navigator.share && (!navigator.canShare || navigator.canShare({ files }))) {
      await navigator.share({ files })
      return 'share'
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled'
    // Fall through to download.
  }

  // Fallback: sequential downloads (may still be blocked by browser policies).
  for (const it of normalized) {
    await shareOrDownloadImageBlob({ blob: it.blob, filename: it.filename, shareTitle: it.filename })
    await new Promise((r) => setTimeout(r, 250))
  }
  return 'download'
}

/**
 * Capture `element` and share or download as PNG.
 *
 * @returns {'share'|'download'|'cancelled'}
 */
export async function shareOrDownloadElementAsImage(element, options = {}) {
  const blob = await captureElementAsPngBlob(element, options)
  return shareOrDownloadImageBlob({
    blob,
    filename: options.filename,
    shareTitle: options.shareTitle ?? options.title
  })
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = String(filename || 'download.txt')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
