import { describe, expect, it } from 'vitest'

import {
  applyCountToRowCopy,
  getCountFromRowCopy
} from '@/utils/rowCopyCount'

const rowCopy = [
  {
    type: 'pattern',
    count: 20,
    pattern: [
      { type: 'stitch', stitch_id: 2 },
      { type: 'stitch', stitch_id: 3 }
    ]
  }
]

describe('getCountFromRowCopy', () => {
  it('reads outer pattern count from row copy', () => {
    expect(getCountFromRowCopy(rowCopy, [{ start: 0, end: 0 }], {
      selectedNodeType: 'pattern'
    })).toBe(20)
  })

  it('reads leaf.count for a single-stitch repeat pattern at depth 1', () => {
    const tokenRowCopy = [
      { type: 'pattern', count: 6, pattern: [{ type: 'stitch', stitch_id: 1 }] }
    ]
    expect(getCountFromRowCopy(tokenRowCopy, [{ start: 0, end: 0 }], {
      selectedNodeType: 'pattern'
    })).toBe(6)
  })

  it('reads wrapper count when selectedNodeType is stitch but leaf is the repeat wrapper', () => {
    const tokenRowCopy = [
      { type: 'pattern', count: 6, pattern: [{ type: 'stitch', stitch_id: 1 }] }
    ]
    expect(getCountFromRowCopy(tokenRowCopy, [{ start: 0, end: 0 }], {
      selectedNodeType: 'stitch'
    })).toBe(6)
  })

  it('reads wrapper count when selecting inner stitch of a single-stitch repeat token', () => {
    const tokenRowCopy = [
      { type: 'pattern', count: 6, pattern: [{ type: 'stitch', stitch_id: 1 }] }
    ]
    expect(getCountFromRowCopy(tokenRowCopy, [{ start: 0, end: 0 }, { start: 0, end: 0 }], {
      selectedNodeType: 'stitch'
    })).toBe(6)
  })

  it('reads plain inner stitch count as 1', () => {
    expect(getCountFromRowCopy(rowCopy, [{ start: 0, end: 0 }, { start: 0, end: 0 }], {
      selectedNodeType: 'stitch'
    })).toBe(1)
  })
})

describe('applyCountToRowCopy', () => {
  it('updates outer pattern count without touching inner stitches', () => {
    const next = applyCountToRowCopy(rowCopy, [{ start: 0, end: 0 }], 25, {
      selectedNodeType: 'pattern'
    })
    expect(next[0].count).toBe(25)
    expect(next[0].pattern).toHaveLength(2)
  })

  it('wraps an inner stitch with its own repeat count', () => {
    const next = applyCountToRowCopy(rowCopy, [{ start: 0, end: 0 }, { start: 0, end: 0 }], 5, {
      selectedNodeType: 'stitch'
    })
    expect(next[0].count).toBe(20)
    expect(next[0].pattern[0].type).toBe('pattern')
    expect(next[0].pattern[0].count).toBe(5)
  })
})
