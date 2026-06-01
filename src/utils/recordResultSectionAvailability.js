import {
  RECORD_RESULT_SHARING_SECTION_KEYS,
  normalizeSectionVisibility
} from '@/constants/recordResultSharingSections'
import { toMs } from '@/utils/toMs'

function getSlotDurationMs(slot, nowMs) {
  const startMs = toMs(slot?.start)
  if (startMs == null) return 0

  const endMs = slot?.end ? toMs(slot.end) : nowMs
  if (endMs == null) return 0

  return Math.max(0, endMs - startMs)
}

function getRecordSpanMs(record, nowMs) {
  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  let earliest = null
  let latest = null

  for (const slot of slots) {
    const startMs = toMs(slot?.start)
    if (startMs == null) continue
    if (earliest == null || startMs < earliest) earliest = startMs

    const endIso = slot?.end || null
    const endMs = endIso ? toMs(endIso) : nowMs
    if (endMs == null || !Number.isFinite(endMs)) continue
    if (latest == null || endMs > latest) latest = endMs
  }

  if (earliest == null || latest == null) return null
  return Math.max(0, latest - earliest)
}

function getRankedGroupCount(record, nowMs = Date.now()) {
  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  const byKey = new Map()

  for (const slot of slots) {
    const statusId = slot?.status_id ?? null
    const key = statusId == null ? '__none__' : String(statusId)
    const durationMs = getSlotDurationMs(slot, nowMs)

    if (!byKey.has(key)) {
      byKey.set(key, { durationMs: 0, count: 0 })
    }

    const group = byKey.get(key)
    group.durationMs += durationMs
    group.count += 1
  }

  return Array.from(byKey.values()).filter((g) => g.durationMs > 0 || g.count > 0).length
}

function getResultImages(record) {
  const list = record?.result?.images
  const arr = Array.isArray(list) ? list : []
  return arr.map((u) => String(u || '').trim()).filter(Boolean).slice(0, 3)
}

function getResultThought(record) {
  return String(record?.result?.thought || '').trim()
}

export function getRecordProjectTitle(record) {
  return String(record?.project_name || record?.projectName || '').trim()
}

export function getRecordCompletedAtMs(record, nowMs = Date.now()) {
  const explicit = toMs(record?.completed_at)
  if (explicit != null) return explicit

  if (!record?.is_completed) return null

  const slots = Array.isArray(record?.time_slots) ? record.time_slots : []
  let latest = null

  for (const slot of slots) {
    const endMs = slot?.end ? toMs(slot.end) : null
    if (endMs == null) continue
    if (latest == null || endMs > latest) latest = endMs
  }

  if (latest != null) return latest

  const updatedMs = toMs(record?.updated_at)
  if (updatedMs != null) return updatedMs

  return nowMs
}

/**
 * Section keys that can appear for the current record + layout (mirrors RecordResult rendering).
 */
export function getAvailableSharingSections(record, { layout = 'sharing', nowMs = Date.now() } = {}) {
  if (!record || typeof record !== 'object') return []

  const isSharingLayout = layout === 'sharing'
  const slots = Array.isArray(record.time_slots) ? record.time_slots : []
  const groupCount = getRankedGroupCount(record, nowMs)

  if (groupCount === 0) return []

  const keys = []

  if (isSharingLayout && getRecordProjectTitle(record)) {
    keys.push('projectTitle')
  }

  if (isSharingLayout && getRecordCompletedAtMs(record, nowMs) != null) {
    keys.push('completedTime')
  }

  if (slots.length > 0 && getRecordSpanMs(record, nowMs) != null) {
    keys.push('resultSummary')
  }

  if (isSharingLayout && getResultImages(record).length > 0) {
    keys.push('extraImages')
  }

  keys.push('resultHeader')

  if (groupCount > 1) {
    keys.push('moreStatus')
  }

  if (isSharingLayout && getResultThought(record)) {
    keys.push('extraNote')
  }

  return keys
}

export function normalizeSectionVisibilityForAvailable(raw, availableKeys) {
  const allowed = new Set(
    Array.isArray(availableKeys) && availableKeys.length
      ? availableKeys
      : RECORD_RESULT_SHARING_SECTION_KEYS
  )

  const normalized = normalizeSectionVisibility(raw)

  for (const key of RECORD_RESULT_SHARING_SECTION_KEYS) {
    if (!allowed.has(key)) {
      normalized[key] = false
    }
  }

  return normalized
}
