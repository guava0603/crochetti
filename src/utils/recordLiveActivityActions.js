import { getRecordPreferredStatus } from '@/utils/recordStatus'

function toMs(value) {
  if (!value) return NaN
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  return new Date(value).getTime()
}

/**
 * Replay pause/start taps from the iOS Live Activity onto a record's time slots, the same way
 * the in-app play/pause buttons do (RecordOptions.vue start/pauseLatestRecord).
 *
 * Idempotent: an action is applied only if it happened after the latest slot event
 * (last slot's end, or its start while open), so replaying a queue that was already written,
 * or an action superseded by a later in-app change, is a no-op.
 *
 * @returns {Array|null} the new time_slots array, or null when nothing changed.
 */
export function applyLiveActivityActionsToSlots(record, actions) {
  const r = record && typeof record === 'object' ? record : null
  if (!r || r.is_completed) return null

  const list = (Array.isArray(actions) ? actions : [])
    .filter((a) => a && (a.action === 'pause' || a.action === 'start') && Number.isFinite(toMs(a.at)))
    .sort((a, b) => toMs(a.at) - toMs(b.at))
  if (!list.length) return null

  const slots = Array.isArray(r.time_slots) ? [...r.time_slots] : []
  let changed = false

  for (const action of list) {
    const atMs = toMs(action.at)
    const at = new Date(atMs).toISOString()
    const last = slots.length ? slots[slots.length - 1] : null
    const isOpen = Boolean(last && last.end == null)
    const lastEventMs = last ? toMs(isOpen ? last.start : last.end) : -Infinity
    if (Number.isFinite(lastEventMs) && atMs <= lastEventMs) continue

    if (action.action === 'pause') {
      if (!isOpen) continue
      slots[slots.length - 1] = { ...last, end: at }
      changed = true
    } else {
      if (isOpen) continue
      const preferred = getRecordPreferredStatus({ ...r, time_slots: slots })
      const components = Array.isArray(r.component_list) ? r.component_list : []
      slots.push({
        start: at,
        end: null,
        status_id: preferred.statusId,
        status_note: preferred.statusNote,
        end_at_list: components.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
      })
      changed = true
    }
  }

  return changed ? slots : null
}
