import { describe, it, expect } from 'vitest'
import {
  appendNode,
  canRemoveLast,
  canStartBundle,
  canStartPattern,
  findLeafPatternPath,
  getContainerCount,
  getContainerKind,
  insertEmptyBundle,
  insertEmptyPattern,
  leaveContainer,
  moveToContainer,
  pruneEmptyContainers,
  removeLast,
  setContainerCount
} from './keypadEdit.js'

const lookup = {
  1: { consume: 1, generate: 1 }, // x
  2: { consume: 1, generate: 2 } // v
}
const x = { type: 'stitch', stitch_id: 1 }
const v = { type: 'stitch', stitch_id: 2 }

describe('keypadEdit', () => {
  it('appends stitches at root and into a new pattern', () => {
    let root = appendNode([], [], x, lookup)
    expect(root).toEqual([x])

    const started = insertEmptyPattern(root, [], lookup)
    expect(started.containerPath).toEqual([1])
    expect(getContainerKind(started.root, [1])).toBe('pattern')

    root = appendNode(started.root, started.containerPath, v, lookup)
    root = appendNode(root, started.containerPath, x, lookup)
    expect(root[1].pattern).toEqual([v, x])
    expect(root[1].generate).toBe(3)
  })

  it('does not mutate its input', () => {
    const root = [x]
    appendNode(root, [], v, lookup)
    insertEmptyPattern(root, [], lookup)
    expect(root).toEqual([x])
  })

  it('rule 1: hides the pattern section inside an empty pattern', () => {
    expect(canStartPattern([], [])).toBe(true)
    const { root, containerPath } = insertEmptyPattern([], [], lookup)
    expect(canStartPattern(root, containerPath)).toBe(false)
    const filled = appendNode(root, containerPath, x, lookup)
    expect(canStartPattern(filled, containerPath)).toBe(true)
  })

  it('bundle mode only takes stitches', () => {
    const { root, containerPath } = insertEmptyBundle([x], [], lookup)
    expect(getContainerKind(root, containerPath)).toBe('bundle')
    expect(canStartPattern(root, containerPath)).toBe(false)
    expect(canStartBundle(root, containerPath)).toBe(false)
    const next = appendNode(appendNode(root, containerPath, x, lookup), containerPath, x, lookup)
    expect(next[1]).toMatchObject({ type: 'bundle', consume: 1, generate: 2, bundle: [x, x] })
  })

  it('×n applies only to the current pattern', () => {
    const { root, containerPath } = insertEmptyPattern([], [], lookup)
    const filled = appendNode(root, containerPath, x, lookup)
    expect(getContainerCount(filled, containerPath)).toBe(1)
    const counted = setContainerCount(filled, containerPath, 6, lookup)
    expect(counted[0]).toMatchObject({ count: 6, consume: 6, generate: 6 })
    expect(getContainerCount(counted, [])).toBeNull()
    expect(setContainerCount(counted, [], 3, lookup)).toEqual(counted)
  })

  it('last-page leaves the container and drops it when empty', () => {
    const { root, containerPath } = insertEmptyPattern([x], [], lookup)
    expect(leaveContainer(root, containerPath, lookup)).toEqual({ root: [x], containerPath: [] })

    const filled = appendNode(root, containerPath, v, lookup)
    const left = leaveContainer(filled, containerPath, lookup)
    expect(left.containerPath).toEqual([])
    expect(left.root).toHaveLength(2)
  })

  it('delete-last pops a child, then removes the empty container', () => {
    const { root, containerPath } = insertEmptyPattern([x], [], lookup)
    const filled = appendNode(root, containerPath, v, lookup)
    const once = removeLast(filled, containerPath, lookup)
    expect(once.containerPath).toEqual([1])
    expect(once.root[1].pattern).toEqual([])
    const twice = removeLast(once.root, once.containerPath, lookup)
    expect(twice).toEqual({ root: [x], containerPath: [] })
    expect(canRemoveLast([], [])).toBe(false)
  })

  it('preview click selects the deepest pattern, or nothing', () => {
    const root = [
      x,
      { type: 'pattern', count: 2, pattern: [v, { type: 'pattern', count: 3, pattern: [x] }, { type: 'bundle', bundle: [x, v] }] }
    ]
    expect(findLeafPatternPath(root, [0])).toBeNull()
    expect(findLeafPatternPath(root, [1, 0])).toEqual([1])
    expect(findLeafPatternPath(root, [1, 1, 0])).toEqual([1, 1])
    expect(findLeafPatternPath(root, [1, 2, 1])).toEqual([1])
  })

  it('moving away from an empty container drops it and keeps the target', () => {
    const base = [{ type: 'pattern', count: 2, pattern: [x] }]
    const { root, containerPath } = insertEmptyPattern(base, [], lookup) // [0] filled, [1] empty
    const withThird = [...root, { type: 'pattern', count: 4, pattern: [v] }]
    const moved = moveToContainer(withThird, containerPath, [2], lookup)
    expect(moved.root).toHaveLength(2)
    expect(moved.containerPath).toEqual([1])
    expect(moved.root[1].count).toBe(4)
  })

  it('prunes empty containers before saving', () => {
    const root = [x, { type: 'pattern', count: 2, pattern: [{ type: 'bundle', bundle: [] }] }, { type: 'bundle', bundle: [v] }]
    expect(pruneEmptyContainers(root, lookup)).toEqual([x, { type: 'bundle', bundle: [v], generate: 2 }])
  })
})
