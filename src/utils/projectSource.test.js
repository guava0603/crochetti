import { describe, expect, it } from 'vitest'
import { buildProjectSourceFromCopyFrom } from '@/utils/projectSource'

describe('buildProjectSourceFromCopyFrom', () => {
  it('returns null for empty values', () => {
    expect(buildProjectSourceFromCopyFrom(undefined)).toBe(null)
    expect(buildProjectSourceFromCopyFrom(null)).toBe(null)
    expect(buildProjectSourceFromCopyFrom('')).toBe(null)
    expect(buildProjectSourceFromCopyFrom('   ')).toBe(null)
  })

  it('builds copy source for a single id', () => {
    expect(buildProjectSourceFromCopyFrom('abc')).toEqual({
      type: 'copy',
      source_project_ids: ['abc']
    })
  })

  it('splits and trims multiple ids', () => {
    expect(buildProjectSourceFromCopyFrom(' a,  b ,,c ')).toEqual({
      type: 'copy',
      source_project_ids: ['a', 'b', 'c']
    })
  })
})

