import { describe, expect, it } from 'vitest'

import { createSelection } from '@/constants/selection'
import { computeCurrentSelectedData } from '@/utils/crochetSelection'
import { resolveDisplayCount } from '@/utils/editCrochetCount'
import {
  hasSingleWrappedRootPattern,
  mergeInnerSelectionPath,
  normalizePreviewClickPayload
} from '@/utils/crochetSelectionPath'

/** Preview list for [2短針, 2中長針] with outer ×1 (two compact single-stitch patterns). */
const twoCompactPreviewList = () => [
  { type: 'pattern', count: 2, pattern: [{ type: 'stitch', stitch_id: 1 }] },
  { type: 'pattern', count: 2, pattern: [{ type: 'stitch', stitch_id: 2 }] }
]

const wrappedTwoCompactRow = () => [
  {
    type: 'pattern',
    count: 1,
    pattern: twoCompactPreviewList()
  }
]

describe('normalizePreviewClickPayload', () => {
  it('maps compact inner drill [{0,0}] to the list index for both first and second compact tokens', () => {
    const compactInnerDrill = [createSelection(0, 0)]

    expect(normalizePreviewClickPayload(0, compactInnerDrill)).toEqual(createSelection(0, 0))
    expect(normalizePreviewClickPayload(1, compactInnerDrill)).toEqual(createSelection(1, 1))
  })

  it('maps outer compact click (empty array) to the list index', () => {
    expect(normalizePreviewClickPayload(0, [])).toEqual(createSelection(0, 0))
    expect(normalizePreviewClickPayload(1, [])).toEqual(createSelection(1, 1))
  })

  it('passes through explicit { rootIndex, innerPath } payloads', () => {
    const payload = { rootIndex: 1, innerPath: [createSelection(0, 0), createSelection(1, 1)] }
    expect(normalizePreviewClickPayload(1, payload)).toEqual(payload)
  })
})

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

  it('selects only the root pattern on first drill into a lone wrapped row pattern', () => {
    const payload = {
      rootIndex: 0,
      innerPath: [createSelection(0, 0)]
    }
    const rootList = [{ type: 'pattern', count: 20, pattern: [{ type: 'stitch', stitch_id: 2 }] }]

    expect(mergeInnerSelectionPath({ baseSelection: [], payload, rootList })).toEqual([
      createSelection(0, 0)
    ])
  })

  it('drills into a compact inner pattern inside a multi-stitch parent', () => {
    const base = [createSelection(0, 0)]
    const payload = {
      rootIndex: 1,
      innerPath: [createSelection(0, 0)]
    }

    expect(mergeInnerSelectionPath({ baseSelection: base, payload })).toEqual([
      createSelection(0, 0),
      createSelection(1, 1),
      createSelection(0, 0)
    ])
  })

  it('does not treat innerPath[0] as row index when base is empty (e.g. second compact in list)', () => {
    const payload = {
      rootIndex: 1,
      innerPath: [createSelection(0, 0)]
    }

    expect(
      mergeInnerSelectionPath({
        baseSelection: [],
        payload,
        rootList: wrappedTwoCompactRow()
      })
    ).toEqual([createSelection(1, 1), createSelection(0, 0)])
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

describe('[2短針, 2中長針] preview click flow', () => {
  const compactInnerDrill = [createSelection(0, 0)]

  it('selects 2短針 (index 0) with display count 2', () => {
    const previewList = twoCompactPreviewList()
    const payload = normalizePreviewClickPayload(0, compactInnerDrill)
    const path = mergeInnerSelectionPath({ baseSelection: [], payload, rootList: previewList })

    expect(path).toEqual([createSelection(0, 0)])

    const data = computeCurrentSelectedData(path, previewList)
    expect(data?.selectedNodeType).toBe('pattern')
    expect(data?.selectedCount).toBe(2)
    expect(resolveDisplayCount({
      rowCopy: previewList,
      selectionPath: path,
      selectedNodeType: data?.selectedNodeType ?? '',
      virtualWholeRow: false,
      selectedCount: data?.selectedCount ?? 1,
      pendingPattern: data?.currentPattern ?? null
    })).toBe(2)
  })

  it('selects 2中長針 (index 1) with display count 2, not 短針 at index 0', () => {
    const previewList = twoCompactPreviewList()
    const payload = normalizePreviewClickPayload(1, compactInnerDrill)
    const path = mergeInnerSelectionPath({ baseSelection: [], payload, rootList: previewList })

    expect(path).toEqual([createSelection(1, 1)])

    const data = computeCurrentSelectedData(path, previewList)
    expect(data?.selectedNodeType).toBe('pattern')
    expect(data?.selectedCount).toBe(2)
    expect(resolveDisplayCount({
      rowCopy: previewList,
      selectionPath: path,
      selectedNodeType: data?.selectedNodeType ?? '',
      virtualWholeRow: false,
      selectedCount: data?.selectedCount ?? 1,
      pendingPattern: data?.currentPattern ?? null
    })).toBe(2)
  })

  it('selects second compact inside a wrapped row when outer pattern is already selected', () => {
    const row = wrappedTwoCompactRow()
    const base = [createSelection(0, 0)]
    const payload = normalizePreviewClickPayload(1, compactInnerDrill)
    const path = mergeInnerSelectionPath({ baseSelection: base, payload, rootList: row })

    expect(path).toEqual([createSelection(0, 0), createSelection(1, 1)])

    const data = computeCurrentSelectedData(path, row)
    expect(data?.selectedNodeType).toBe('pattern')
    expect(data?.selectedCount).toBe(2)
  })
})

describe('hasSingleWrappedRootPattern', () => {
  it('detects a single repeated root pattern', () => {
    expect(hasSingleWrappedRootPattern([{ type: 'pattern', count: 20, pattern: [] }])).toBe(true)
    expect(hasSingleWrappedRootPattern([{ type: 'stitch', stitch_id: 2 }])).toBe(false)
  })
})
