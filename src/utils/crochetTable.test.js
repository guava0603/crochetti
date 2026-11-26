import { describe, it, expect } from 'vitest'
import { hasStitchData } from './crochetTable.js'

const row = (list) => ({ row_index: 1, count: 1, content: { stitch_node_list: list } })

describe('hasStitchData', () => {
  it('is false for null, no rows, or only empty rows', () => {
    expect(hasStitchData(null)).toBe(false)
    expect(hasStitchData(undefined)).toBe(false)
    expect(hasStitchData([])).toBe(false)
    expect(hasStitchData([row([]), { row_index: 2 }])).toBe(false)
  })

  it('is true once any row has a stitch', () => {
    expect(hasStitchData([row([]), row([{ type: 'stitch', stitch_id: 1 }])])).toBe(true)
  })
})
