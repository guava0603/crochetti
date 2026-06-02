import { describe, expect, it } from 'vitest'

import { resolveDisplayCount } from '@/utils/editCrochetCount'

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

describe('resolveDisplayCount', () => {
  it('reads outer pattern count at depth 1', () => {
    expect(resolveDisplayCount({
      rowCopy,
      selectionPath: [{ start: 0, end: 0 }],
      selectedNodeType: 'pattern'
    })).toBe(20)
  })

  it('reads leaf.count for a single-stitch repeat pattern at depth 1', () => {
    const tokenRowCopy = [
      { type: 'pattern', count: 6, pattern: [{ type: 'stitch', stitch_id: 1 }] }
    ]
    expect(resolveDisplayCount({
      rowCopy: tokenRowCopy,
      selectionPath: [{ start: 0, end: 0 }],
      selectedNodeType: 'pattern'
    })).toBe(6)
  })

  it('reads wrapper count when selecting inner stitch of a single-stitch repeat', () => {
    const tokenRowCopy = [
      { type: 'pattern', count: 6, pattern: [{ type: 'stitch', stitch_id: 1 }] }
    ]
    expect(resolveDisplayCount({
      rowCopy: tokenRowCopy,
      selectionPath: [{ start: 0, end: 0 }, { start: 0, end: 0 }],
      selectedNodeType: 'stitch'
    })).toBe(6)
  })

  it('reads plain inner stitch count as 1 inside a multi-stitch pattern', () => {
    expect(resolveDisplayCount({
      rowCopy,
      selectionPath: [{ start: 0, end: 0 }, { start: 0, end: 0 }],
      selectedNodeType: 'stitch'
    })).toBe(1)
  })

  it('reads inner compact repeat from pending when row copy is empty', () => {
    expect(resolveDisplayCount({
      rowCopy: [],
      selectionPath: [{ start: 0, end: 0 }, { start: 0, end: 0 }],
      selectedNodeType: 'stitch',
      pendingPattern: [
        { type: 'pattern', count: 5, pattern: [{ type: 'stitch', stitch_id: 2 }] }
      ]
    })).toBe(5)
  })

  it('uses selectedCount for virtual whole row', () => {
    expect(resolveDisplayCount({
      rowCopy: [{ type: 'pattern', count: 12, pattern: [{ type: 'stitch', stitch_id: 1 }] }],
      selectionPath: [],
      selectedNodeType: 'pattern',
      virtualWholeRow: true,
      selectedCount: 3
    })).toBe(3)
  })
})
