export function getRecordPreferredStatus(record) {
  const r = record && typeof record === 'object' ? record : null
  if (!r) return { statusId: 0, statusNote: '' }

  const slots = Array.isArray(r.time_slots) ? r.time_slots : []
  const last = slots.length ? slots[slots.length - 1] : null

  const rawId = last?.status_id ?? r.pending_status_id ?? 0
  const statusId = Number(rawId)

  return {
    statusId: Number.isFinite(statusId) ? statusId : 0,
    statusNote: String(last?.status_note ?? r.pending_status_note ?? '').trim()
  }
}

export function setRecordPendingStatus(record, { statusId, statusNote } = {}) {
  if (!record || typeof record !== 'object') return

  const id = Number(statusId)
  record.pending_status_id = Number.isFinite(id) ? id : 0
  record.pending_status_note = String(statusNote || '').trim()
}
