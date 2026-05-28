export const DESIGN_PRINT_SECTION_KEYS = Object.freeze([
  'images',
  'description',
  'materials',
  'notes',
  'selfDefinedStitches'
])

export const DEFAULT_DESIGN_PRINT_VISIBILITY = Object.freeze({
  images: true,
  description: true,
  materials: true,
  notes: true,
  selfDefinedStitches: true
})

export const DESIGN_PRINT_COMPONENT_MODES = Object.freeze({
  combined: 'combined',
  separate: 'separate'
})

export const DEFAULT_DESIGN_PRINT_COMPONENT_MODE = DESIGN_PRINT_COMPONENT_MODES.combined

export function normalizeDesignSectionVisibility(raw) {
  const out = { ...DEFAULT_DESIGN_PRINT_VISIBILITY }
  if (!raw || typeof raw !== 'object') return out

  for (const key of DESIGN_PRINT_SECTION_KEYS) {
    if (key in raw) out[key] = Boolean(raw[key])
  }

  return out
}

export function normalizeDesignComponentMode(raw) {
  const v = String(raw || '').trim()
  if (v === DESIGN_PRINT_COMPONENT_MODES.separate) return DESIGN_PRINT_COMPONENT_MODES.separate
  return DESIGN_PRINT_COMPONENT_MODES.combined
}

function filterVisibilityByAvailable(visibility, availableKeys) {
  if (!Array.isArray(availableKeys) || availableKeys.length === 0) {
    return normalizeDesignSectionVisibility(visibility)
  }

  const allowed = new Set(availableKeys)
  const out = normalizeDesignSectionVisibility(visibility)

  for (const key of DESIGN_PRINT_SECTION_KEYS) {
    if (!allowed.has(key)) out[key] = false
  }

  return out
}

export function loadStoredDesignPrintSettings(projectId, availableKeys = []) {
  const id = String(projectId || '').trim()
  const base = filterVisibilityByAvailable(DEFAULT_DESIGN_PRINT_VISIBILITY, availableKeys)

  if (!id || typeof localStorage === 'undefined') {
    return { sectionVisibility: base, componentMode: DEFAULT_DESIGN_PRINT_COMPONENT_MODE, extraImages: {} }
  }

  try {
    const raw = localStorage.getItem(`corchetti.designPrint.${id}`)
    if (!raw) {
      return { sectionVisibility: base, componentMode: DEFAULT_DESIGN_PRINT_COMPONENT_MODE }
    }
    const parsed = JSON.parse(raw)
    const sections = parsed?.sections ?? parsed
    return {
      sectionVisibility: filterVisibilityByAvailable(normalizeDesignSectionVisibility(sections), availableKeys),
      componentMode: normalizeDesignComponentMode(parsed?.componentMode),
      extraImages: parsed?.extraImages ?? {}
    }
  } catch {
    return { sectionVisibility: base, componentMode: DEFAULT_DESIGN_PRINT_COMPONENT_MODE, extraImages: {} }
  }
}

export function saveStoredDesignPrintSettings(projectId, settings, availableKeys = []) {
  const id = String(projectId || '').trim()
  if (!id || typeof localStorage === 'undefined') return

  try {
    const payload = {
      sections: filterVisibilityByAvailable(
        normalizeDesignSectionVisibility(settings?.sectionVisibility),
        availableKeys
      ),
      componentMode: normalizeDesignComponentMode(settings?.componentMode),
      extraImages: settings?.extraImages ?? {}
    }
    localStorage.setItem(`corchetti.designPrint.${id}`, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}
