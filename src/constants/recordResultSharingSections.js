import { normalizeExtraImagesSettings, normalizeSourceImageUrls } from '@/constants/recordPrintExtraImages'
import { normalizeCompletedTimeSettings } from '@/constants/recordPrintCompletedTime'
import {
  DEFAULT_RECORD_PRINT_STYLE_ID,
  normalizeRecordPrintStyleId
} from '@/constants/recordPrintStyles'

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

export function loadStoredPrintSettings(recordId, availableKeys, sourceImageUrls = []) {
  const id = String(recordId || '').trim()
  const baseVisibility = { ...DEFAULT_RECORD_RESULT_SHARING_VISIBILITY }
  const baseExtraImages = normalizeExtraImagesSettings(null, sourceImageUrls)
  const baseCompletedTime = normalizeCompletedTimeSettings(null)

  if (!id || typeof localStorage === 'undefined') {
    return {
      sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
      extraImages: baseExtraImages,
      completedTime: baseCompletedTime
    }
  }

  try {
    const raw = localStorage.getItem(`corchetti.recordPrint.${id}`)
    if (!raw) {
      return {
        sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
        extraImages: baseExtraImages,
        completedTime: baseCompletedTime,
        printStyle: DEFAULT_RECORD_PRINT_STYLE_ID
      }
    }

    const parsed = JSON.parse(raw)
    const sections = parsed?.sections ?? parsed
    const extraImages = normalizeExtraImagesSettings(parsed?.extraImages, sourceImageUrls)
    const completedTime = normalizeCompletedTimeSettings(parsed?.completedTime)

    return {
      sectionVisibility: filterVisibilityByAvailable(normalizeSectionVisibility(sections), availableKeys),
      extraImages,
      completedTime
    }
  } catch {
    return {
      sectionVisibility: filterVisibilityByAvailable(baseVisibility, availableKeys),
      extraImages: baseExtraImages,
      completedTime: baseCompletedTime
    }
  }
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
      extraImages: normalizeExtraImagesSettings(settings?.extraImages, sourceImageUrls),
      completedTime: normalizeCompletedTimeSettings(settings?.completedTime),
      printStyle: normalizeRecordPrintStyleId(settings?.printStyle)
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
