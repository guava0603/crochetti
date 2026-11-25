import { MIN_CUSTOM_STATUS_ID } from '@/constants/recordStatusCatalog'

export function normalizeStatusCatalog(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  const seenIds = new Set()

  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const id = Number(item.id)
    const name = String(item.name || '').trim()
    if (!Number.isFinite(id) || id < MIN_CUSTOM_STATUS_ID || !name) continue
    if (seenIds.has(id)) continue
    seenIds.add(id)
    out.push({ id, name })
  }

  return out.sort((a, b) => a.id - b.id)
}

export function normalizeStatusNotes(raw) {
  const list = Array.isArray(raw) ? raw : []
  const out = []
  const seen = new Set()

  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const statusId = Number(item.status_id)
    const description = String(item.description || '').trim()
    if (!Number.isFinite(statusId) || statusId < 1 || !description) continue
    const key = `${statusId}::${description}`
    if (seen.has(key)) continue
    seen.add(key)
    const note = { status_id: statusId, description }
    const appliedAt = Number(item.last_applied_at)
    if (Number.isFinite(appliedAt) && appliedAt > 0) note.last_applied_at = appliedAt
    out.push(note)
  }

  return out
}

export function allocateNextCustomStatusId(catalog) {
  const list = normalizeStatusCatalog(catalog)
  const ids = list.map((s) => s.id)
  const floor = MIN_CUSTOM_STATUS_ID - 1
  const maxId = ids.length ? Math.max(...ids) : floor
  return Math.max(MIN_CUSTOM_STATUS_ID, maxId + 1)
}

export function findCatalogStatusByName(catalog, name) {
  const needle = String(name || '').trim()
  if (!needle) return null
  return normalizeStatusCatalog(catalog).find((s) => s.name === needle) || null
}

export function findCatalogStatusById(catalog, statusId) {
  const id = Number(statusId)
  if (!Number.isFinite(id)) return null
  return normalizeStatusCatalog(catalog).find((s) => s.id === id) || null
}

export function mergeRecordStatusesIntoCatalog(catalog, recordStatuses) {
  const base = normalizeStatusCatalog(catalog)
  const byId = new Map(base.map((s) => [s.id, s]))

  for (const item of Array.isArray(recordStatuses) ? recordStatuses : []) {
    if (!item || typeof item !== 'object') continue
    const id = Number(item.id)
    const name = String(item.name || '').trim()
    if (!Number.isFinite(id) || id < MIN_CUSTOM_STATUS_ID || !name) continue
    if (!byId.has(id)) byId.set(id, { id, name })
  }

  return normalizeStatusCatalog([...byId.values()])
}

export function normalizeRecordLinkedStatuses(raw, userCatalog) {
  const catalog = normalizeStatusCatalog(userCatalog)
  const byId = new Map(catalog.map((s) => [s.id, s]))
  const out = []
  const seen = new Set()

  for (const item of Array.isArray(raw) ? raw : []) {
    if (!item || typeof item !== 'object') continue
    const id = Number(item.id)
    if (!Number.isFinite(id) || id < MIN_CUSTOM_STATUS_ID || seen.has(id)) continue
    seen.add(id)
    const fromCatalog = byId.get(id)
    const name = fromCatalog?.name || String(item.name || '').trim()
    if (!name) continue
    out.push({ id, name })
  }

  return out
}

export function linkStatusToRecordList(recordStatuses, statusEntry) {
  const entry = statusEntry && typeof statusEntry === 'object' ? statusEntry : null
  if (!entry || !Number.isFinite(Number(entry.id))) return normalizeRecordLinkedStatuses(recordStatuses, [])

  const list = normalizeRecordLinkedStatuses(recordStatuses, [entry])
  const id = Number(entry.id)
  if (list.some((s) => s.id === id)) return list
  return normalizeRecordLinkedStatuses([...list, { id, name: String(entry.name || '').trim() }], [entry])
}

/**
 * Notes for one status, most recently applied first.
 * Notes never applied (legacy, no `last_applied_at`) come after, newest-created first.
 */
export function getNoteSuggestionsForStatus(notes, statusId) {
  const id = Number(statusId)
  if (!Number.isFinite(id)) return []
  return normalizeStatusNotes(notes)
    .map((n, index) => ({ n, index }))
    .filter(({ n }) => Number(n.status_id) === id)
    .sort((a, b) => (b.n.last_applied_at || 0) - (a.n.last_applied_at || 0) || b.index - a.index)
    .map(({ n }) => n.description)
}

/** Record that a note was applied now: stamp it, or append it stamped if it is new. */
export function markNoteApplied(notes, { statusId, description, appliedAt = Date.now() }) {
  const id = Number(statusId)
  const desc = String(description || '').trim()
  const list = normalizeStatusNotes(notes)
  if (!Number.isFinite(id) || !desc) return list

  const at = Number(appliedAt)
  let found = false
  const next = list.map((n) => {
    if (Number(n.status_id) !== id || n.description !== desc) return n
    found = true
    return { ...n, last_applied_at: at }
  })
  return found ? next : [...next, { status_id: id, description: desc, last_applied_at: at }]
}

export function appendNoteIfNew(notes, { statusId, description }) {
  const id = Number(statusId)
  const desc = String(description || '').trim()
  if (!Number.isFinite(id) || !desc) return normalizeStatusNotes(notes)

  const list = normalizeStatusNotes(notes)
  if (list.some((n) => Number(n.status_id) === id && n.description === desc)) {
    return list
  }

  return [...list, { status_id: id, description: desc }]
}

export function mergeRecordNotesIntoProfile(profileNotes, recordNotes) {
  let next = normalizeStatusNotes(profileNotes)
  for (const item of Array.isArray(recordNotes) ? recordNotes : []) {
    if (!item || typeof item !== 'object') continue
    next = appendNoteIfNew(next, {
      statusId: item.status_id,
      description: item.description
    })
  }
  return next
}
