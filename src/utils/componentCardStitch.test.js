import { describe, expect, it } from 'vitest'
import {
  buildRelatedComponentOptions,
  filterRelatedComponentIds,
  relatedComponentDisplayNames,
  stitchSequenceNumber
} from './componentCardStitch'

describe('componentCardStitch', () => {
  it('stitchSequenceNumber counts stitch types up to index', () => {
    const list = [
      { type: 'component' },
      { type: 'stitch' },
      { type: 'stitch' },
      { type: 'stitch' }
    ]
    expect(stitchSequenceNumber(list, 0)).toBe(1)
    expect(stitchSequenceNumber(list, 2)).toBe(2)
    expect(stitchSequenceNumber(list, 3)).toBe(3)
  })

  it('buildRelatedComponentOptions only includes prior part components', () => {
    const list = [
      { type: 'component', id: 'a', name: 'A' },
      { type: 'stitch', id: 's1' },
      { type: 'component', id: 'b', name: 'B' }
    ]
    expect(buildRelatedComponentOptions(list, 2)).toEqual([
      { value: 'a', label: 'A' }
    ])
  })

  it('filterRelatedComponentIds drops ids not in allowed set', () => {
    expect(filterRelatedComponentIds(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c'])
  })

  it('relatedComponentDisplayNames resolves labels from list', () => {
    const list = [{ type: 'component', id: 'a', name: 'Part A' }]
    const component = { related_component_ids: ['a', 'missing'] }
    expect(relatedComponentDisplayNames(component, list)).toEqual(['Part A', 'missing'])
  })
})
