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

/** Same-origin proxy path (see vite.config.js). Avoids CORS when inlining Storage images in dev. */
const EXPORT_STORAGE_PROXY_PREFIX = '/__/firebase-storage'

const EXPORT_CARD_BG = '#f5ebda'
const EXPORT_CAPTURE_STYLE_ID = 'corchetti-export-capture-fix'

function shouldUseNativeImageShare() {
  if (Capacitor.isNativePlatform()) return true
  if (typeof window !== 'undefined' && window.location?.protocol === 'capacitor:') return true
  return false
}

function isIosLikeDevice() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function parseAspectRatioValue(raw) {
  const text = String(raw || '').trim()
  if (!text) return null

  const parts = text.split('/')
  if (parts.length === 2) {
    const w = parseFloat(parts[0])
    const h = parseFloat(parts[1])
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return w / h
  }

  const single = parseFloat(text)
  return Number.isFinite(single) && single > 0 ? single : null
}

/** html2canvas often ignores CSS aspect-ratio; pin explicit heights before capture. */
function resolveExtraImagesWidth(el, sourceEl, layoutWidthPx, doc = document) {
  const candidates = [
    el?.offsetWidth || 0,
    sourceEl?.offsetWidth || 0,
    sourceEl ? Math.round(sourceEl.getBoundingClientRect().width) : 0
  ]

  for (const width of candidates) {
    if (width > 0) return width
  }

  if (layoutWidthPx > 0) {
    const remPx = getRemPx(doc)
    return Math.max(0, Math.round(layoutWidthPx - 1.8 * remPx))
  }

  return 0
}

function normalizeExtraImagesForExport(root, layoutWidthPx = 0, sourceRoot = null, doc = document) {
  if (!root?.querySelectorAll) return

  const sourceContainers = sourceRoot ? [...sourceRoot.querySelectorAll('.extra-images')] : []

  root.querySelectorAll('.extra-images').forEach((el, index) => {
    const sourceEl = sourceContainers[index]
    const width = resolveExtraImagesWidth(el, sourceEl, layoutWidthPx, doc)
    if (width <= 0) return

    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null
    const ratio =
      parseAspectRatioValue(computed?.aspectRatio) ||
      parseAspectRatioValue(el.style.getPropertyValue('--extra-images-aspect-ratio')) ||
      parseAspectRatioValue(sourceEl?.style.getPropertyValue('--extra-images-aspect-ratio')) ||
      1.25

    const height = Math.max(1, Math.round(width / ratio))
    el.style.setProperty('height', `${height}px`, 'important')
    el.style.setProperty('min-height', `${height}px`, 'important')
    el.style.setProperty('aspect-ratio', 'auto', 'important')
    el.style.setProperty('display', 'flex', 'important')
    el.style.setProperty(
      'flex-direction',
      el.classList.contains('extra-images--vertical') ? 'column' : 'row',
      'important'
    )

    const gapRaw = el.style.getPropertyValue('--extra-images-gap') || sourceEl?.style.getPropertyValue('--extra-images-gap')
    const gap = Number.parseFloat(gapRaw) || 0
    if (gap > 0) el.style.setProperty('gap', `${gap}px`, 'important')

    const items = [...el.querySelectorAll('.extra-images__item')]
    const count = Math.max(1, items.length)
    const gapTotal = gap * Math.max(0, count - 1)
    const itemWidth = Math.max(1, Math.floor((width - gapTotal) / count))
    const itemHeight =
      el.classList.contains('extra-images--vertical')
        ? Math.max(1, Math.floor((height - gapTotal) / count))
        : height

    for (const item of items) {
      item.style.setProperty('flex', '1 1 0', 'important')
      item.style.setProperty('width', `${itemWidth}px`, 'important')
      item.style.setProperty('height', `${itemHeight}px`, 'important')
      item.style.setProperty('min-height', `${itemHeight}px`, 'important')
    }

    for (const node of el.querySelectorAll('.image-box, .image-box__cut, .image-box__img')) {
      node.style.setProperty('width', '100%', 'important')
      node.style.setProperty('height', '100%', 'important')
      node.style.setProperty('display', 'block', 'important')
    }
  })
}

function snapshotExtraImagesLayout(root) {
  if (!root?.querySelectorAll) return () => {}

  const entries = [...root.querySelectorAll('.extra-images')].map((el) => ({
    el,
    height: el.style.height,
    minHeight: el.style.minHeight,
    aspectRatio: el.style.aspectRatio
  }))

  return () => {
    for (const { el, height, minHeight, aspectRatio } of entries) {
      el.style.height = height
      el.style.minHeight = minHeight
      el.style.aspectRatio = aspectRatio
    }
  }
}

function waitForImage(img) {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) {
      resolve()
      return
    }

    const done = () => resolve()
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  })
}

async function waitForImages(root) {
  if (!root?.querySelectorAll) return

  const imgs = [...root.querySelectorAll('img')].filter((img) => img.currentSrc || img.src)
  if (!imgs.length) return

  await Promise.all(imgs.map((img) => waitForImage(img)))
}

async function blobToDataUrl(blob) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

/** html2canvas ignores object-fit: cover; bake cover crop into the data URL. */
function drawCoverToDataUrl(img, width, height) {
  const targetW = Math.max(1, Math.round(width))
  const targetH = Math.max(1, Math.round(height))
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return null

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const scale = Math.max(targetW / iw, targetH / ih)
  const srcW = targetW / scale
  const srcH = targetH / scale
  const sx = (iw - srcW) / 2
  const sy = (ih - srcH) / 2
  ctx.drawImage(img, sx, sy, srcW, srcH, 0, 0, targetW, targetH)
  return canvas.toDataURL('image/png')
}

async function blobToCoverDataUrl(blob, width, height) {
  if (!(width > 0 && height > 0)) return blobToDataUrl(blob)

  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await loadImageElement(objectUrl)
    return drawCoverToDataUrl(img, width, height)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function isSameOriginUrl(url) {
  if (typeof window === 'undefined') return false

  try {
    return new URL(url, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

function isFirebaseStorageUrl(url) {
  try {
    return new URL(url).hostname.includes('firebasestorage.googleapis.com')
  } catch {
    return false
  }
}

/** Rewrite Storage download URL to same-origin proxy (dev) for CORS-free fetch. */
function toExportStorageFetchUrl(url) {
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.includes('firebasestorage.googleapis.com')) return url
    return `${EXPORT_STORAGE_PROXY_PREFIX}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

function canFetchExportUrl(url) {
  return isSameOriginUrl(url) || String(url).startsWith(EXPORT_STORAGE_PROXY_PREFIX)
}

async function resolveImageAsDataUrl(url, { width = 0, height = 0 } = {}) {
  const src = String(url || '').trim()
  if (!src) return null

  const fetchUrl = isFirebaseStorageUrl(src) ? toExportStorageFetchUrl(src) : src

  if (!canFetchExportUrl(fetchUrl)) return null

  try {
    const response = await fetch(fetchUrl)
    if (!response.ok) return null
    return await blobToCoverDataUrl(await response.blob(), width, height)
  } catch {
    return null
  }
}

/** Inline export images as data URLs in the clone when we can read them without CORS fetch. */
async function buildExportImageDataUrlMap(sourceRoot) {
  const map = new Map()
  if (!sourceRoot?.querySelectorAll) return map

  const entries = [...sourceRoot.querySelectorAll('.extra-images img')].map((img) => {
    const src = img.currentSrc || img.src
    const item = img.closest('.extra-images__item')
    return {
      src,
      width: item?.offsetWidth || img.offsetWidth || 0,
      height: item?.offsetHeight || img.offsetHeight || 0
    }
  }).filter((entry) => entry.src)

  await Promise.all(
    entries.map(async ({ src, width, height }) => {
      const dataUrl = await resolveImageAsDataUrl(src, { width, height })
      if (dataUrl) map.set(src, dataUrl)
    })
  )

  return map
}

function applyInlineImageDataUrls(root, imageDataUrlMap) {
  if (!root?.querySelectorAll || !imageDataUrlMap?.size) return

  for (const img of root.querySelectorAll('.extra-images img')) {
    const src = img.currentSrc || img.src || img.getAttribute('src')
    const dataUrl = imageDataUrlMap.get(src)
    if (dataUrl) img.src = dataUrl
  }
}

/** Keep clone img src aligned with live DOM only when not already inlined as data URLs. */
function syncExportImageSources(clonedRoot, sourceRoot, imageDataUrlMap = new Map()) {
  if (!clonedRoot?.querySelectorAll || !sourceRoot?.querySelectorAll) return

  const sourceImgs = [...sourceRoot.querySelectorAll('.extra-images img')]
  const clonedImgs = [...clonedRoot.querySelectorAll('.extra-images img')]

  clonedImgs.forEach((cloneImg, index) => {
    const sourceImg = sourceImgs[index]
    const src = sourceImg?.currentSrc || sourceImg?.src
    if (!src) return
    if (imageDataUrlMap.has(src)) return
    cloneImg.removeAttribute('crossorigin')
    cloneImg.src = src
  })
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
    .extra-images__item .image-box__img {
      object-fit: cover !important;
    }
  `
  doc.head.appendChild(style)
}

/** Flatten styles that html2canvas renders incorrectly (backdrop-filter, inset shadow, alpha fill). */
export function applyExportFlatStyles(root, doc = null, { layoutWidthPx, sourceRoot = null } = {}) {
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

  normalizeExtraImagesForExport(root, layoutWidthPx, sourceRoot, doc?.defaultView ? doc : document)
}

export async function captureElementAsPngBlob(element, options = {}) {
  if (!element) throw new Error('captureElementAsPngBlob: missing element')

  const { default: html2canvas } = await import('html2canvas')

  const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1
  const scale = options.scale ?? Math.max(1, Math.min(2, dpr))
  const flattenForExport = Boolean(options.flattenForExport)
  const layoutWidthPx = Number(options.layoutWidthPx) || 0
  const html2canvasOptions = options.html2canvas || {}

  await waitForImages(element)
  const restoreExtraImagesLayout = snapshotExtraImagesLayout(element)
  normalizeExtraImagesForExport(element, layoutWidthPx, element, document)

  let imageDataUrlMap = new Map()
  try {
    imageDataUrlMap = await buildExportImageDataUrlMap(element)
  } catch {
    imageDataUrlMap = new Map()
  }

  const extraImageUrls = [...element.querySelectorAll('.extra-images img')]
    .map((img) => img.currentSrc || img.src)
    .filter(Boolean)
  const extraImageCount = extraImageUrls.length
  const allExtraImagesInlined =
    extraImageCount === 0 || extraImageUrls.every((url) => imageDataUrlMap.has(url))

  if (extraImageCount > 0 && !allExtraImagesInlined) {
    throw new Error('captureElementAsPngBlob: failed to inline export images')
  }

  const mergedCanvasOptions = {
    backgroundColor: options.backgroundColor ?? '#ffffff',
    scale,
    logging: false,
    ...html2canvasOptions,
    useCORS: false,
    allowTaint: false
  }

  try {
    const canvas = await html2canvas(element, {
      ...mergedCanvasOptions,
      onclone: (doc, clonedNode) => {
        if (flattenForExport) {
          applyExportFlatStyles(clonedNode, doc, { layoutWidthPx, sourceRoot: element })
        } else {
          normalizeExtraImagesForExport(clonedNode, layoutWidthPx, element, doc)
        }

        applyInlineImageDataUrls(clonedNode, imageDataUrlMap)
        syncExportImageSources(clonedNode, element, imageDataUrlMap)

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
  } finally {
    restoreExtraImagesLayout()
  }
}

/**
 * @returns {'share'|'download'|'cancelled'}
 */
async function tryWebShareImageBlob(blob, filename, shareTitle) {
  if (!navigator.share || typeof File === 'undefined') return false

  const file = new File([blob], filename, { type: 'image/png' })
  const payload = { title: String(shareTitle || filename), files: [file] }

  const canShareFiles = !navigator.canShare || navigator.canShare({ files: [file] })

  if (canShareFiles) {
    await navigator.share(payload)
    return true
  }

  if (isIosLikeDevice()) {
    await navigator.share(payload)
    return true
  }

  return false
}

export async function shareOrDownloadImageBlob({ blob, filename, shareTitle } = {}) {
  if (!blob) throw new Error('shareOrDownloadImageBlob: missing blob')

  const safeName = String(filename || 'image.png').trim() || 'image.png'

  if (shouldUseNativeImageShare()) {
    return sharePngBlobsViaNative({
      items: [{ blob, filename: safeName }],
      shareTitle: shareTitle ?? safeName
    })
  }

  try {
    if (await tryWebShareImageBlob(blob, safeName, shareTitle)) {
      return 'share'
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled'
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

  if (shouldUseNativeImageShare()) {
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
    if (files?.length && navigator.share) {
      const canShareFiles = !navigator.canShare || navigator.canShare({ files })
      if (canShareFiles || isIosLikeDevice()) {
        await navigator.share({ files })
        return 'share'
      }
    }
  } catch (error) {
    if (error?.name === 'AbortError') return 'cancelled'
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
