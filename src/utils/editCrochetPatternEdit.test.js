import { describe, expect, it } from 'vitest'

import { removeLastPatternNode } from '@/utils/editCrochetPatternEdit'

describe('removeLastPatternNode', () => {
  it('removes the last node from a pattern list', () => {
    const list = [
      { type: 'stitch', stitch_id: 1 },
      { type: 'stitch', stitch_id: 2 }
    ]
    expect(removeLastPatternNode(list)).toEqual({
      nextList: [{ type: 'stitch', stitch_id: 1 }],
      becameEmpty: false
    })
  })

  it('reports empty when the list had one node', () => {
    expect(removeLastPatternNode([{ type: 'stitch', stitch_id: 1 }])).toEqual({
      nextList: [],
      becameEmpty: true
    })
  })

  it('reports empty for an already empty list', () => {
    expect(removeLastPatternNode([])).toEqual({
      nextList: [],
      becameEmpty: true
    })
  })
})
