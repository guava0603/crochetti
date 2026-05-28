export const RECORD_RESULT_SHARING_SECTION_KEYS = [
  'projectTitle',
  'completedTime',
  'resultSummary',
  'extraImages',
  'resultHeader',
  'moreStatus',
  'extraNote'
]

export const DEFAULT_RECORD_RESULT_SHARING_VISIBILITY = Object.freeze({
  projectTitle: true,
  completedTime: true,
  resultSummary: true,
  extraImages: true,
  resultHeader: true,
  moreStatus: true,
  extraNote: true
})

export function normalizeSectionVisibility(raw) {
  const out = { ...DEFAULT_RECORD_RESULT_SHARING_VISIBILITY }
  if (!raw || typeof raw !== 'object') return out

  for (const key of RECORD_RESULT_SHARING_SECTION_KEYS) {
    if (key in raw) out[key] = Boolean(raw[key])
  }

  return out
}

import {
  DEFAULT_EXTRA_IMAGES_SETTINGS,
  normalizeExtraImagesSettings,
  normalizeSourceImageUrls
} from '@/constants/recordPrintExtraImages'

export function loadStoredSectionVisibility(recordId, availableKeys) {
  return loadStoredPrintSettings(recordId, availableKeys).sectionVisibility
}

export function loadStoredPrintSettings(recordId, availableKeys, sourceImageUrls = []) {
  const id = String(recordId || '').trim()
  const baseVisibility = { ...DEFAULT_RECORD_RESULT_SHARING_VISIBILITY }
  const baseExtraImages = normalizeExtraImagesSettings(null, sourceImageUrls)

  if (!id || typeof localStorage === 'undefined') {
    return {
      sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
      extraImages: baseExtraImages
    }
  }

  try {
    const raw = localStorage.getItem(`corchetti.recordPrint.${id}`)
    if (!raw) {
      return {
        sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
        extraImages: baseExtraImages
      }
    }

    const parsed = JSON.parse(raw)
    const sections = parsed?.sections ?? parsed
    const extraImages = normalizeExtraImagesSettings(parsed?.extraImages, sourceImageUrls)

    return {
      sectionVisibility: filterVisibilityByAvailable(normalizeSectionVisibility(sections), availableKeys),
      extraImages
    }
  } catch {
    return {
      sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
      extraImages: baseExtraImages
    }
  }
}

export function saveStoredSectionVisibility(recordId, visibility, availableKeys) {
  saveStoredPrintSettings(
    recordId,
    {
      sectionVisibility: visibility,
      extraImages: { ...DEFAULT_EXTRA_IMAGES_SETTINGS }
    },
    availableKeys
  )
}

export function saveStoredPrintSettings(recordId, settings, availableKeys, sourceImageUrls = []) {
  const id = String(recordId || '').trim()
  if (!id || typeof localStorage === 'undefined') return

  try {
    const payload = {
      sections: filterVisibilityByAvailable(
        normalizeSectionVisibility(settings?.sectionVisibility),
        availableKeys
      ),
      extraImages: normalizeExtraImagesSettings(settings?.extraImages, sourceImageUrls)
    }
    localStorage.setItem(`corchetti.recordPrint.${id}`, JSON.stringify(payload))
  } catch {
    // ignore quota / private mode
  }
}

export function getRecordSourceImageUrls(record) {
  return normalizeSourceImageUrls(record?.result?.images)
}

function filterVisibilityByAvailable(visibility, availableKeys) {
  if (!Array.isArray(availableKeys) || availableKeys.length === 0) {
    return normalizeSectionVisibility(visibility)
  }

  const allowed = new Set(availableKeys)
  const out = normalizeSectionVisibility(visibility)

  for (const key of RECORD_RESULT_SHARING_SECTION_KEYS) {
    if (!allowed.has(key)) out[key] = false
  }

  return out
}
