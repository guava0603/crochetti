import { describe, expect, it } from 'vitest'

import {
  getAvailableSharingSections,
  getRecordCompletedAtMs
} from '@/utils/recordResultSectionAvailability'

describe('getAvailableSharingSections', () => {
  const baseRecord = {
    project_name: 'My scarf',
    is_completed: true,
    completed_at: '2026-05-20T13:30:00.000Z',
    time_slots: [
      {
        start: '2026-05-20T10:00:00.000Z',
        end: '2026-05-20T11:00:00.000Z',
        status_id: 3
      },
      {
        start: '2026-05-20T12:00:00.000Z',
        end: '2026-05-20T13:00:00.000Z',
        status_id: 5
      }
    ],
    result: {
      images: ['https://example.com/a.jpg'],
      thought: 'Nice piece'
    }
  }

  it('includes sharing-only sections when layout is sharing and data exists', () => {
    const keys = getAvailableSharingSections(baseRecord, { layout: 'sharing' })
    expect(keys).toContain('resultSummary')
    expect(keys).toContain('extraImages')
    expect(keys).toContain('extraNote')
    expect(keys).toContain('moreStatus')
  })

  it('omits sharing meta and feedback when layout is not sharing', () => {
    const keys = getAvailableSharingSections(baseRecord, { layout: 'default' })
    expect(keys).not.toContain('projectTitle')
    expect(keys).not.toContain('completedTime')
    expect(keys).not.toContain('extraImages')
    expect(keys).not.toContain('extraNote')
    expect(keys).toContain('resultHeader')
  })

  it('omits extraImages when there are no feedback photos', () => {
    const keys = getAvailableSharingSections(
      { ...baseRecord, result: { images: [], thought: 'x' } },
      { layout: 'sharing' }
    )
    expect(keys).not.toContain('extraImages')
    expect(keys).toContain('extraNote')
  })

  it('omits moreStatus when only one status group exists', () => {
    const keys = getAvailableSharingSections(
      {
        time_slots: [baseRecord.time_slots[0]],
        result: baseRecord.result
      },
      { layout: 'sharing' }
    )
    expect(keys).not.toContain('moreStatus')
    expect(keys).toContain('resultHeader')
  })

  it('reads Firestore Timestamp completed_at', () => {
    const completedAt = {
      toMillis: () => new Date('2026-05-20T13:30:00.000Z').getTime()
    }
    const ms = getRecordCompletedAtMs({
      is_completed: true,
      completed_at: completedAt,
      time_slots: []
    })
    expect(ms).toBe(completedAt.toMillis())
  })

  it('omits projectTitle when project name is missing', () => {
    const keys = getAvailableSharingSections(
      { ...baseRecord, project_name: '', projectName: '' },
      { layout: 'sharing' }
    )
    expect(keys).not.toContain('projectTitle')
    expect(keys).toContain('completedTime')
  })
})
