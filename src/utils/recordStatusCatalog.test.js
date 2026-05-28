import { describe, expect, it } from 'vitest'

import {
  allocateNextCustomStatusId,
  appendNoteIfNew,
  getNoteSuggestionsForStatus,
  mergeRecordNotesIntoProfile,
  mergeRecordStatusesIntoCatalog,
  normalizeRecordLinkedStatuses
} from '@/utils/recordStatusCatalog'

describe('recordStatusCatalog', () => {
  it('merges record statuses into user catalog', () => {
    const merged = mergeRecordStatusesIntoCatalog([{ id: 100, name: 'A' }], [{ id: 101, name: 'B' }])
    expect(merged).toEqual([
      { id: 100, name: 'A' },
      { id: 101, name: 'B' }
    ])
  })

  it('resolves linked record names from catalog', () => {
    const linked = normalizeRecordLinkedStatuses(
      [{ id: 100 }],
      [{ id: 100, name: 'Renamed' }]
    )
    expect(linked).toEqual([{ id: 100, name: 'Renamed' }])
  })

  it('allocates ids from 100 upward', () => {
    expect(allocateNextCustomStatusId([])).toBe(100)
    expect(allocateNextCustomStatusId([{ id: 100, name: 'A' }])).toBe(101)
  })

  it('stores and filters notes by status_id', () => {
    const notes = appendNoteIfNew([], { statusId: 3, description: 'Deep work' })
    expect(getNoteSuggestionsForStatus(notes, 3)).toEqual(['Deep work'])
    expect(getNoteSuggestionsForStatus(notes, 100)).toEqual([])
  })

  it('merges legacy record notes into profile notes', () => {
    const merged = mergeRecordNotesIntoProfile(
      [{ status_id: 100, description: 'Note A' }],
      [{ status_id: 101, description: 'Note B' }]
    )
    expect(merged).toHaveLength(2)
  })
})
