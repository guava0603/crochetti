export const COMPONENT_TYPE_STITCH = 'stitch'
export const COMPONENT_TYPE_CROCHET = 'component-crochet'
export const COMPONENT_TYPE_KNITTING = 'component-knitting'

// Legacy values seen in existing data.
const LEGACY_COMPONENT_TYPE = 'component'

export function isStitchType(type) {
  return String(type || '') === COMPONENT_TYPE_STITCH
}

export function isComponentType(type) {
  const t = String(type || '')
  // Legacy projects may omit `type` for components.
  if (!t) return true
  return t === LEGACY_COMPONENT_TYPE || t === COMPONENT_TYPE_CROCHET || t === COMPONENT_TYPE_KNITTING
}

export function componentTypeFromCraftKey(craftKey, fallback = COMPONENT_TYPE_CROCHET) {
  const key = String(craftKey || '').trim()
  if (key === 'knitting') return COMPONENT_TYPE_CROCHET
  if (key === 'crochet') return COMPONENT_TYPE_CROCHET
  return fallback
}

export function craftKeyFromComponentType(type) {
  const t = String(type || '')
  if (!t || t === LEGACY_COMPONENT_TYPE || t === COMPONENT_TYPE_CROCHET || t === COMPONENT_TYPE_KNITTING) {
    return 'crochet'
  }
  return null
}

export function normalizeComponentType(rawType, { defaultComponentType = COMPONENT_TYPE_CROCHET } = {}) {
  const t = String(rawType || '')
  if (!t || t === LEGACY_COMPONENT_TYPE || t === COMPONENT_TYPE_KNITTING) return defaultComponentType
  if (t === COMPONENT_TYPE_CROCHET || t === COMPONENT_TYPE_STITCH) return t
  return t
}
