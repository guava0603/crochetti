import { DEFAULT_STATUS_ID, normalizeStatusId } from '@/constants/status'

export function getRecordPreferredStatus(record) {
  const r = record && typeof record === 'object' ? record : null
  if (!r) return { statusId: DEFAULT_STATUS_ID, statusNote: '' }

  const slots = Array.isArray(r.time_slots) ? r.time_slots : []
  const last = slots.length ? slots[slots.length - 1] : null

  const rawId = last?.status_id ?? r.pending_status_id ?? DEFAULT_STATUS_ID
  const statusId = normalizeStatusId(rawId)

  return {
    statusId,
    statusNote: String(last?.status_note ?? r.pending_status_note ?? '').trim()
  }
}

export function setRecordPendingStatus(record, { statusId, statusNote } = {}) {
  if (!record || typeof record !== 'object') return

  record.pending_status_id = normalizeStatusId(statusId)
  record.pending_status_note = String(statusNote || '').trim()
}
