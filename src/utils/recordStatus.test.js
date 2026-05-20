import { describe, expect, it } from 'vitest'

import { getRecordPreferredStatus, setRecordPendingStatus } from '@/utils/recordStatus'

describe('getRecordPreferredStatus', () => {
  it('returns idle status for missing or invalid records', () => {
    expect(getRecordPreferredStatus(null)).toEqual({ statusId: 0, statusNote: '' })
    expect(getRecordPreferredStatus(undefined)).toEqual({ statusId: 0, statusNote: '' })
    expect(getRecordPreferredStatus('not-an-object')).toEqual({ statusId: 0, statusNote: '' })
  })

  it('returns pending status when a new record has no time slots yet', () => {
    const record = {
      time_slots: [],
      pending_status_id: 3,
      pending_status_note: 'deep focus'
    }

    expect(getRecordPreferredStatus(record)).toEqual({
      statusId: 3,
      statusNote: 'deep focus'
    })
  })

  it('prefers the last time slot status over pending status', () => {
    const record = {
      pending_status_id: 3,
      pending_status_note: 'pending note',
      time_slots: [
        {
          start: '2026-05-20T10:00:00.000Z',
          end: '2026-05-20T11:00:00.000Z',
          status_id: 5,
          status_note: 'chatting'
        }
      ]
    }

    expect(getRecordPreferredStatus(record)).toEqual({
      statusId: 5,
      statusNote: 'chatting'
    })
  })

  it('uses the active slot status while recording', () => {
    const record = {
      pending_status_id: 1,
      time_slots: [
        {
          start: '2026-05-20T10:00:00.000Z',
          end: null,
          status_id: 6,
          status_note: 'watching tutorial'
        }
      ]
    }

    expect(getRecordPreferredStatus(record)).toEqual({
      statusId: 6,
      statusNote: 'watching tutorial'
    })
  })

  it('falls back to idle when no slot or pending status exists', () => {
    expect(getRecordPreferredStatus({ time_slots: [] })).toEqual({
      statusId: 0,
      statusNote: ''
    })
  })

  it('normalizes invalid pending status ids to idle', () => {
    const record = {
      time_slots: [],
      pending_status_id: 'not-a-number',
      pending_status_note: '  spaced note  '
    }

    expect(getRecordPreferredStatus(record)).toEqual({
      statusId: 0,
      statusNote: 'spaced note'
    })
  })
})

describe('setRecordPendingStatus', () => {
  it('stores pending status on the record', () => {
    const record = { time_slots: [] }

    setRecordPendingStatus(record, { statusId: 2, statusNote: ' listening ' })

    expect(record.pending_status_id).toBe(2)
    expect(record.pending_status_note).toBe('listening')
  })

  it('normalizes invalid status ids to idle', () => {
    const record = {}

    setRecordPendingStatus(record, { statusId: Number.NaN, statusNote: 'note' })

    expect(record.pending_status_id).toBe(0)
    expect(record.pending_status_note).toBe('note')
  })

  it('ignores invalid record targets', () => {
    expect(() => setRecordPendingStatus(null, { statusId: 4, statusNote: 'x' })).not.toThrow()
    expect(() => setRecordPendingStatus(undefined, { statusId: 4, statusNote: 'x' })).not.toThrow()
  })
})

describe('first recording session status flow', () => {
  it('keeps the user-selected status when starting the first time slot', () => {
    const record = {
      time_slots: [],
      component_list: [{ name: 'body', end_at: null }]
    }

    setRecordPendingStatus(record, { statusId: 3, statusNote: 'focus block' })

    const preferred = getRecordPreferredStatus(record)
    expect(preferred).toEqual({ statusId: 3, statusNote: 'focus block' })

    record.time_slots.push({
      start: '2026-05-20T12:00:00.000Z',
      end: null,
      status_id: preferred.statusId,
      status_note: preferred.statusNote,
      end_at_list: record.component_list.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
    })

    expect(record.time_slots).toHaveLength(1)
    expect(record.time_slots[0].status_id).toBe(3)
    expect(record.time_slots[0].status_note).toBe('focus block')
    expect(record.time_slots[0].status_id).not.toBe(0)
  })

  it('carries forward the last slot status when resuming after a pause', () => {
    const record = {
      pending_status_id: 1,
      pending_status_note: 'old pending',
      component_list: [{ name: 'body', end_at: { row_index: 1, crochet_count: 4 } }],
      time_slots: [
        {
          start: '2026-05-20T10:00:00.000Z',
          end: '2026-05-20T10:30:00.000Z',
          status_id: 5,
          status_note: 'chat break',
          end_at_list: [{ row_index: 1, crochet_count: 4 }]
        }
      ]
    }

    const preferred = getRecordPreferredStatus(record)

    record.time_slots.push({
      start: '2026-05-20T11:00:00.000Z',
      end: null,
      status_id: preferred.statusId,
      status_note: preferred.statusNote,
      end_at_list: record.component_list.map((comp) => (comp?.end_at ? { ...comp.end_at } : null))
    })

    expect(record.time_slots[1].status_id).toBe(5)
    expect(record.time_slots[1].status_note).toBe('chat break')
  })
})
