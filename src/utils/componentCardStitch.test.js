import { describe, expect, it } from 'vitest'
import {
  buildRelatedComponentOptions,
  filterRelatedComponentIds,
  relatedComponentDisplayNames,
  resolveComponentIndexInList,
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

  it('buildRelatedComponentOptions lists every component before the current index', () => {
    const list = [
      { type: 'component-crochet', id: 'a', name: 'A' },
      { type: 'stitch', id: 's1', name: 'Seam 1' },
      { type: 'component-crochet', id: 'b', name: 'B' }
    ]
    expect(buildRelatedComponentOptions(list, 2)).toEqual([
      { value: 'a', label: 'A' },
      { value: 's1', label: 'Seam 1' }
    ])
  })

  it('buildRelatedComponentOptions returns no options for the first component', () => {
    const list = [{ type: 'stitch', id: 's1', name: 'Seam' }]
    expect(buildRelatedComponentOptions(list, 0)).toEqual([])
  })

  it('buildRelatedComponentOptions resolves index from component when explicit index is -1', () => {
    const list = [
      { type: 'component-crochet', id: 'a', name: 'A' },
      { type: 'component-crochet', id: 'b', name: 'B' },
      { type: 'stitch', id: 's1', name: 'Seam' }
    ]
    const stitch = list[2]
    expect(buildRelatedComponentOptions(list, -1, stitch)).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ])
  })

  it('resolveComponentIndexInList prefers id match over stale explicit index', () => {
    const list = [
      { type: 'component-crochet', id: 'a', name: 'A' },
      { type: 'stitch', id: 's1', name: 'Seam' }
    ]
    const stitch = list[1]
    expect(resolveComponentIndexInList(list, stitch, 0)).toBe(1)
  })

  it('filterRelatedComponentIds drops ids not in allowed set', () => {
    expect(filterRelatedComponentIds(['a', 'b', 'c'], ['a', 'c'])).toEqual(['a', 'c'])
  })

  it('filterRelatedComponentIds returns empty when nothing is allowed', () => {
    expect(filterRelatedComponentIds(['a', 'b'], [])).toEqual([])
  })

  it('relatedComponentDisplayNames resolves labels from list', () => {
    const list = [{ type: 'component', id: 'a', name: 'Part A' }]
    const component = { related_component_ids: ['a', 'missing'] }
    expect(relatedComponentDisplayNames(component, list)).toEqual(['Part A', 'missing'])
  })
})
