import { describe, expect, it } from 'vitest'

import { createSelection } from '@/constants/selection'
import {
  hasSingleWrappedRootPattern,
  mergeInnerSelectionPath
} from '@/utils/crochetSelectionPath'

describe('mergeInnerSelectionPath', () => {
  it('appends a leaf selection to an existing parent pattern path', () => {
    const base = [createSelection(0, 0)]
    const payload = createSelection(0, 0)

    expect(mergeInnerSelectionPath({ baseSelection: base, payload })).toEqual([
      createSelection(0, 0),
      createSelection(0, 0)
    ])
  })

  it('selects a top-level stitch when the displayed list is the row root', () => {
    const payload = createSelection(1, 1)

    expect(mergeInnerSelectionPath({ baseSelection: [], payload })).toEqual([
      createSelection(1, 1)
    ])
  })

  it('builds a full path when drilling into a wrapped root pattern with empty base selection', () => {
    const payload = {
      rootIndex: 0,
      innerPath: [createSelection(0, 0)]
    }
    const rootList = [{ type: 'pattern', count: 20, pattern: [{ type: 'stitch', stitch_id: 2 }] }]

    expect(mergeInnerSelectionPath({ baseSelection: [], payload, rootList })).toEqual([
      createSelection(0, 0),
      createSelection(0, 0)
    ])
  })

  it('keeps the outer pattern selected when drilling to the second inner stitch', () => {
    const base = [createSelection(0, 0)]
    const payload = createSelection(1, 1)

    expect(mergeInnerSelectionPath({ baseSelection: base, payload })).toEqual([
      createSelection(0, 0),
      createSelection(1, 1)
    ])
  })
})

describe('hasSingleWrappedRootPattern', () => {
  it('detects a single repeated root pattern', () => {
    expect(hasSingleWrappedRootPattern([{ type: 'pattern', count: 20, pattern: [] }])).toBe(true)
    expect(hasSingleWrappedRootPattern([{ type: 'stitch', stitch_id: 2 }])).toBe(false)
  })
})
