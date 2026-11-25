import { describe, expect, it } from 'vitest'

import { applyLiveActivityActionsToSlots } from './recordLiveActivityActions'

const T = (s) => `2026-11-25T10:00:${String(s).padStart(2, '0')}.000Z`

function record(slots, extra = {}) {
  return {
    id: 'r1',
    time_slots: slots,
    component_list: [{ end_at: { row_index: 3, crochet_count: 5 } }],
    ...extra
  }
}

describe('applyLiveActivityActionsToSlots', () => {
  it('pause closes the open slot at the tap time', () => {
    const r = record([{ start: T(0), end: null, status_id: 101, status_note: 'n' }])
    const next = applyLiveActivityActionsToSlots(r, [{ id: 'a', action: 'pause', at: T(30) }])
    expect(next).toEqual([{ start: T(0), end: T(30), status_id: 101, status_note: 'n' }])
  })

  it('start opens a new slot with the last slot status and current positions', () => {
    const r = record([{ start: T(0), end: T(10), status_id: 101, status_note: 'n' }])
    const next = applyLiveActivityActionsToSlots(r, [{ id: 'a', action: 'start', at: T(20) }])
    expect(next[1]).toEqual({
      start: T(20),
      end: null,
      status_id: 101,
      status_note: 'n',
      end_at_list: [{ row_index: 3, crochet_count: 5 }]
    })
  })

  it('applies several taps in time order', () => {
    const r = record([{ start: T(0), end: null, status_id: 101, status_note: '' }])
    const next = applyLiveActivityActionsToSlots(r, [
      { id: 'b', action: 'start', at: T(20) },
      { id: 'a', action: 'pause', at: T(10) },
      { id: 'c', action: 'pause', at: T(40) }
    ])
    expect(next.map((s) => [s.start, s.end])).toEqual([
      [T(0), T(10)],
      [T(20), T(40)]
    ])
  })

  it('is idempotent when the queue is replayed', () => {
    const actions = [
      { id: 'a', action: 'pause', at: T(10) },
      { id: 'b', action: 'start', at: T(20) },
      { id: 'c', action: 'pause', at: T(40) }
    ]
    const r = record([{ start: T(0), end: null, status_id: 101, status_note: '' }])
    r.time_slots = applyLiveActivityActionsToSlots(r, actions)
    expect(applyLiveActivityActionsToSlots(r, actions)).toBeNull()
  })

  it('ignores taps older than a later in-app change', () => {
    const r = record([{ start: T(0), end: T(50), status_id: 101, status_note: '' }])
    expect(applyLiveActivityActionsToSlots(r, [{ id: 'a', action: 'start', at: T(20) }])).toBeNull()
  })

  it('does nothing for completed records', () => {
    const r = record([{ start: T(0), end: null }], { is_completed: true })
    expect(applyLiveActivityActionsToSlots(r, [{ id: 'a', action: 'pause', at: T(10) }])).toBeNull()
  })
})
