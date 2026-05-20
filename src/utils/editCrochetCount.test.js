import { describe, expect, it } from 'vitest'

import {
  readStitchRepeatFromPending,
  resolveEditCount
} from '@/utils/editCrochetCount'

describe('readStitchRepeatFromPending', () => {
  it('returns 1 for a plain stitch', () => {
    expect(readStitchRepeatFromPending([{ type: 'stitch', stitch_id: 2 }])).toBe(1)
  })

  it('returns the repeat count for a single-stitch pattern wrapper', () => {
    expect(readStitchRepeatFromPending([
      { type: 'pattern', count: 5, pattern: [{ type: 'stitch', stitch_id: 2 }] }
    ])).toBe(5)
  })
})

describe('resolveEditCount', () => {
  it('uses outer pattern count at depth 1', () => {
    expect(resolveEditCount({
      selectedNodeType: 'pattern',
      selectedCount: 20,
      pendingPattern: [{ type: 'stitch', stitch_id: 2 }, { type: 'stitch', stitch_id: 3 }],
      selectionDepth: 1
    })).toBe(20)
  })

  it('uses inner stitch repeat at depth 2', () => {
    expect(resolveEditCount({
      selectedNodeType: 'stitch',
      selectedCount: 1,
      pendingPattern: [{ type: 'stitch', stitch_id: 2 }],
      selectionDepth: 2
    })).toBe(1)
  })

  it('reads wrapped inner stitch repeat from pending pattern', () => {
    expect(resolveEditCount({
      selectedNodeType: 'stitch',
      selectedCount: 1,
      pendingPattern: [
        { type: 'pattern', count: 5, pattern: [{ type: 'stitch', stitch_id: 2 }] }
      ],
      selectionDepth: 2
    })).toBe(5)
  })
})
