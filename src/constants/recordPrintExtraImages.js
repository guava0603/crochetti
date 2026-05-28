export const EXTRA_IMAGE_ASPECT_RATIOS = ['5:4', '3:2', '1:1']
export const EXTRA_IMAGE_DISPLAY_ORDERS = ['horizontal', 'vertical']

export const DEFAULT_EXTRA_IMAGES_SETTINGS = Object.freeze({
  selectedUrls: [],
  size: '5:4',
  displayOrder: 'horizontal',
  gapPx: 10,
  roundedCorners: false
})

export function normalizeSourceImageUrls(raw) {
  const list = Array.isArray(raw) ? raw : []
  return list.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3)
}

function normalizeLegacyBorder(raw) {
  if (!raw || typeof raw !== 'object') return {}
  if (!('border' in raw)) return {}
  return { gapPx: raw.border ? 10 : 0 }
}

export function normalizeExtraImagesSettings(raw, sourceUrls = []) {
  const sources = normalizeSourceImageUrls(sourceUrls)
  const sourceSet = new Set(sources)
  const out = {
    ...DEFAULT_EXTRA_IMAGES_SETTINGS,
    selectedUrls: [...sources]
  }

  if (!raw || typeof raw !== 'object') return out

  if (typeof raw.size === 'string' && EXTRA_IMAGE_ASPECT_RATIOS.includes(raw.size)) {
    out.size = raw.size
  }

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

  return {
    images,
    size: normalized.size,
    displayOrder: normalized.displayOrder,
    gapPx,
    roundedCorners: normalized.roundedCorners
  }
}