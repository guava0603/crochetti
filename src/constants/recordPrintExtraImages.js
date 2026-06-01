export const EXTRA_IMAGE_DISPLAY_ORDERS = ['horizontal', 'vertical']

export const EXTRA_IMAGE_ASPECT_RATIO_MIN = 1
export const EXTRA_IMAGE_ASPECT_RATIO_MAX = 3
export const EXTRA_IMAGE_ASPECT_RATIO_STEP = 0.1
export const DEFAULT_EXTRA_IMAGE_ASPECT_RATIO = 1.2
export const DEFAULT_EXTRA_IMAGE_ASPECT_LANDSCAPE = true

/** @deprecated Preset list kept for legacy localStorage migration only. */
export const EXTRA_IMAGE_ASPECT_RATIOS = ['5:4', '3:2', '1:1']

export const DEFAULT_EXTRA_IMAGES_SETTINGS = Object.freeze({
  selectedUrls: [],
  aspectRatio: DEFAULT_EXTRA_IMAGE_ASPECT_RATIO,
  aspectLandscape: DEFAULT_EXTRA_IMAGE_ASPECT_LANDSCAPE,
  displayOrder: 'horizontal',
  gapPx: 10,
  roundedCorners: false
})

export function clampAspectRatio(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_EXTRA_IMAGE_ASPECT_RATIO
  const clamped = Math.max(EXTRA_IMAGE_ASPECT_RATIO_MIN, Math.min(EXTRA_IMAGE_ASPECT_RATIO_MAX, n))
  const tenths = Math.round(clamped * 10 - 1e-8)
  return tenths / 10
}

export function formatExtraImagesAspectRatioCss(ratio, landscape = true) {
  const r = clampAspectRatio(ratio)
  return landscape ? `${r} / 1` : `1 / ${r}`
}

export function formatExtraImagesAspectRatioLabel(ratio, landscape = true) {
  const r = clampAspectRatio(ratio)
  const text = Number.isInteger(r) ? String(r) : r.toFixed(1)
  return landscape ? `${text}:1` : `1:${text}`
}

export function legacySizeToAspect(size) {
  const [width, height] = String(size || '')
    .split(':')
    .map(Number)
  if (!width || !height) {
    return {
      aspectRatio: DEFAULT_EXTRA_IMAGE_ASPECT_RATIO,
      aspectLandscape: DEFAULT_EXTRA_IMAGE_ASPECT_LANDSCAPE
    }
  }
  if (width >= height) {
    return { aspectRatio: clampAspectRatio(width / height), aspectLandscape: true }
  }
  return { aspectRatio: clampAspectRatio(height / width), aspectLandscape: false }
}

export function normalizeSourceImageUrls(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3)
}

function normalizeLegacyBorder(raw) {
  if (!raw || typeof raw !== 'object') return {}
  if (!('border' in raw)) return {}
  return { gapPx: raw.border ? 10 : 0 }
}

function normalizeAspectFields(raw, out) {
  if (typeof raw.aspectRatio === 'number' && Number.isFinite(raw.aspectRatio)) {
    out.aspectRatio = clampAspectRatio(raw.aspectRatio)
  } else if (typeof raw.size === 'string') {
    Object.assign(out, legacySizeToAspect(raw.size))
  }

  if (typeof raw.aspectLandscape === 'boolean') {
    out.aspectLandscape = raw.aspectLandscape
  }
}

export function normalizeExtraImagesSettings(raw, sourceUrls = []) {
  const sources = normalizeSourceImageUrls(sourceUrls)
  const sourceSet = new Set(sources)
  const out = {
    ...DEFAULT_EXTRA_IMAGES_SETTINGS,
    selectedUrls: [...sources]
  }

  if (!raw || typeof raw !== 'object') return out

  normalizeAspectFields(raw, out)

  if (raw.displayOrder === 'horizontal') {
    out.displayOrder = 'horizontal'
  }
  if (raw.displayOrder === 'vertical') {
    out.displayOrder = 'vertical'
  }

  if (typeof raw.gapPx === 'number' && Number.isFinite(raw.gapPx)) {
    out.gapPx = Math.max(0, Math.min(32, Math.round(raw.gapPx)))
  } else {
    Object.assign(out, normalizeLegacyBorder(raw))
  }

  if (typeof raw.roundedCorners === 'boolean') {
    out.roundedCorners = raw.roundedCorners
  }

  if (Array.isArray(raw.selectedUrls)) {
    out.selectedUrls = raw.selectedUrls
      .map((u) => String(u || '').trim())
      .filter((u) => sourceSet.has(u))
  }

  if (!out.selectedUrls.length && sources.length) {
    out.selectedUrls = [...sources]
  }

  return out
}

export function resolveExtraImagesForDisplay(settings, sourceUrls = []) {
  const sources = normalizeSourceImageUrls(sourceUrls)
  const normalized = normalizeExtraImagesSettings(settings, sources)
  const images = normalized.selectedUrls.filter((url) => sources.includes(url))

  const gapPx = images.length > 1 ? normalized.gapPx : 0
  const aspectRatioCss = formatExtraImagesAspectRatioCss(
    normalized.aspectRatio,
    normalized.aspectLandscape
  )

  return {
    images,
    aspectRatio: normalized.aspectRatio,
    aspectLandscape: normalized.aspectLandscape,
    aspectRatioCss,
    displayOrder: normalized.displayOrder,
    gapPx,
    roundedCorners: normalized.roundedCorners
  }
}
