/** Default recording status: 專注 / Focus */
export const DEFAULT_STATUS_ID = 3

/** Legacy status ids removed from the picker (mapped to default for display + new sessions). */
export const LEGACY_REMOVED_STATUS_IDS = new Set([0, 4, 7])

export const originalStatuses = [
  { id: 3, nameKey: 'status.focus' },
  { id: 2, nameKey: 'status.music' },
  { id: 6, nameKey: 'status.video' },
  { id: 5, nameKey: 'status.chat' },
  { id: 1, nameKey: 'status.commute' },
]

export function isBuiltinStatusId(rawId) {
  const n = Number(rawId)
  if (!Number.isFinite(n)) return false
  return originalStatuses.some((s) => Number(s.id) === n)
}

export function normalizeStatusId(rawId) {
  const n = Number(rawId)
  if (!Number.isFinite(n)) return DEFAULT_STATUS_ID
  if (LEGACY_REMOVED_STATUS_IDS.has(n)) return DEFAULT_STATUS_ID
  if (isBuiltinStatusId(n)) return n
  // User-defined and legacy per-record custom ids — keep as-is.
  return n
}

export function findOriginalStatus(rawId) {
  const n = Number(rawId)
  if (!Number.isFinite(n)) return null
  if (LEGACY_REMOVED_STATUS_IDS.has(n)) {
    return originalStatuses.find((s) => Number(s.id) === DEFAULT_STATUS_ID) || null
  }
  return originalStatuses.find((s) => Number(s.id) === n) || null
}
