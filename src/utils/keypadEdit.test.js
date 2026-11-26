import { describe, it, expect } from 'vitest'
import { calculateConsumeGenerateCore } from './crochetStatsCore.js'
import {
  canRemoveBefore,
  clampCaret,
  canStartBundle,
  canStartPattern,
  findLeafContainerPath,
  getContainerKind,
  insertEmptyBundle,
  insertEmptyPattern,
  leaveContainer,
  moveToContainer,
  pruneEmptyContainers,
  removeBefore,
  insertNode,
  setContainerCount
} from './keypadEdit.js'

const lookup = {
  1: { consume: 1, generate: 1 }, // x
  2: { consume: 1, generate: 2 } // v
}
const x = { type: 'stitch', stitch_id: 1 }
const v = { type: 'stitch', stitch_id: 2 }

// Insert at the end of a container (caret past the last child).
const appendNode = (root, containerPath, node) => insertNode(root, containerPath, undefined, node, lookup).root

describe('keypadEdit', () => {
  it('appends stitches at root and into a new pattern', () => {
    let root = appendNode([], [], x)
    expect(root).toEqual([x])

    const started = insertEmptyPattern(root, [], lookup)
    expect(started.containerPath).toEqual([1])
    expect(getContainerKind(started.root, [1])).toBe('pattern')

    root = appendNode(started.root, started.containerPath, v)
    root = appendNode(root, started.containerPath, x)
    expect(root[1].pattern).toEqual([v, x])
    // Patterns store no stats; totals come from their children.
    expect(root[1]).not.toHaveProperty('generate')
    expect(calculateConsumeGenerateCore([root[1]], 1, lookup).generate).toBe(3)
  })

  it('does not mutate its input', () => {
    const root = [x]
    appendNode(root, [], v)
    insertEmptyPattern(root, [], lookup)
    expect(root).toEqual([x])
  })

  it('rule 1: hides the pattern section inside an empty pattern', () => {
    expect(canStartPattern([], [])).toBe(true)
    const { root, containerPath } = insertEmptyPattern([], [], lookup)
    expect(canStartPattern(root, containerPath)).toBe(false)
    const filled = appendNode(root, containerPath, x)
    expect(canStartPattern(filled, containerPath)).toBe(true)
  })

  it('bundle mode only takes stitches', () => {
    const { root, containerPath } = insertEmptyBundle([x], [], lookup)
    expect(getContainerKind(root, containerPath)).toBe('bundle')
    expect(canStartPattern(root, containerPath)).toBe(false)
    expect(canStartBundle(root, containerPath)).toBe(false)
    const next = appendNode(appendNode(root, containerPath, x), containerPath, x)
    expect(next[1]).toMatchObject({ type: 'bundle', consume: 1, generate: 2, bundle: [x, x] })
  })

  it('×n applies to the current pattern or bundle, never the root', () => {
    const { root, containerPath } = insertEmptyPattern([], [], lookup)
    const filled = appendNode(root, containerPath, x)
    expect(filled[0]).toMatchObject({ type: 'pattern', count: 1 })
    const counted = setContainerCount(filled, containerPath, 6, lookup)
    expect(counted[0]).toMatchObject({ count: 6 })
    expect(calculateConsumeGenerateCore(counted, 1, lookup)).toEqual({ consume: 6, generate: 6 })
    expect(setContainerCount(counted, [], 3, lookup)).toEqual(counted)

    const inBundle = insertEmptyBundle([], [], lookup)
    const bundled = appendNode(inBundle.root, inBundle.containerPath, x)
    expect(bundled[0]).toMatchObject({ type: 'bundle', count: 1 })
    const bundleCounted = setContainerCount(bundled, inBundle.containerPath, 4, lookup)
    expect(bundleCounted[0]).toMatchObject({ type: 'bundle', count: 4 })
    expect(calculateConsumeGenerateCore(bundleCounted, 1, lookup).generate).toBe(4)
  })

  it('確認 leaves the container (dropping it when empty) with the caret after it', () => {
    const { root, containerPath } = insertEmptyPattern([x], [], lookup)
    // Empty: removed, caret stays where the container was.
    expect(leaveContainer(root, containerPath, lookup)).toEqual({ root: [x], containerPath: [], caret: 1 })

    const filled = appendNode(root, containerPath, v)
    const left = leaveContainer(filled, containerPath, lookup)
    expect(left.containerPath).toEqual([])
    expect(left.root).toHaveLength(2)
    expect(left.caret).toBe(2) // right after the pattern at index 1
  })

  it('inserts at the caret and moves the caret past the new node', () => {
    const t = { type: 'stitch', stitch_id: 3 }
    let r = insertNode([x, v], [], 1, t, lookup)
    expect(r.root).toEqual([x, t, v])
    expect(r.caret).toBe(2)
    r = insertNode(r.root, [], 0, v, lookup)
    expect(r.root).toEqual([v, x, t, v])
    expect(r.caret).toBe(1)
    // Out-of-range carets are clamped to the container.
    expect(insertNode([x], [], 99, v, lookup)).toEqual({ root: [x, v], caret: 2 })
    expect(clampCaret([x, v], [], -3)).toBe(0)
    expect(clampCaret([x, v], [], undefined)).toBe(2)
  })

  it('starts a pattern at the caret, inside the current container', () => {
    const { root, containerPath, caret } = insertEmptyPattern([x, v], [], lookup, 1)
    expect(root[1]).toMatchObject({ type: 'pattern', pattern: [] })
    expect(root[2]).toEqual(v)
    expect(containerPath).toEqual([1])
    expect(caret).toBe(0)
  })

  it('delete removes the node before the caret, then the empty container', () => {
    let r = removeBefore([x, v], [], 1, lookup)
    expect(r).toEqual({ root: [v], containerPath: [], caret: 0 })
    expect(canRemoveBefore(r.root, [], 0)).toBe(false) // nothing before the caret
    expect(removeBefore(r.root, [], 0, lookup).root).toEqual([v])

    const { root, containerPath } = insertEmptyPattern([x], [], lookup)
    const filled = appendNode(root, containerPath, v)
    const once = removeBefore(filled, containerPath, 1, lookup)
    expect(once.containerPath).toEqual([1])
    expect(once.root[1].pattern).toEqual([])
    expect(once.caret).toBe(0)
    expect(canRemoveBefore(once.root, once.containerPath, 0)).toBe(true) // empty container
    expect(removeBefore(once.root, once.containerPath, 0, lookup)).toEqual({ root: [x], containerPath: [], caret: 1 })
    expect(canRemoveBefore([], [], 0)).toBe(false)
  })

  it('preview click selects the deepest pattern or bundle, or nothing', () => {
    const root = [
      x,
      { type: 'pattern', count: 2, pattern: [v, { type: 'pattern', count: 3, pattern: [x] }, { type: 'bundle', bundle: [x, v] }] },
      { type: 'bundle', bundle: [x, x] }
    ]
    expect(findLeafContainerPath(root, [0])).toBeNull()
    expect(findLeafContainerPath(root, [1, 0])).toEqual([1])
    expect(findLeafContainerPath(root, [1, 1, 0])).toEqual([1, 1])
    // A bundle is selected exactly like a pattern: tapping inside it selects it.
    expect(findLeafContainerPath(root, [1, 2, 1])).toEqual([1, 2])
    expect(findLeafContainerPath(root, [1, 2])).toEqual([1, 2])
    expect(findLeafContainerPath(root, [2, 0])).toEqual([2])
    expect(findLeafContainerPath(root, [2])).toEqual([2])
  })

  it('moving away from an empty container drops it and keeps the target', () => {
    const base = [{ type: 'pattern', count: 2, pattern: [x] }]
    const { root, containerPath } = insertEmptyPattern(base, [], lookup) // [0] filled, [1] empty
    const withThird = [...root, { type: 'pattern', count: 4, pattern: [v] }]
    const moved = moveToContainer(withThird, containerPath, [2], lookup)
    expect(moved.root).toHaveLength(2)
    expect(moved.containerPath).toEqual([1])
    expect(moved.root[1].count).toBe(4)
    expect(moved.caret).toBe(1) // a newly selected container opens with the caret at its end
  })

  it('prunes empty containers before saving', () => {
    const root = [x, { type: 'pattern', count: 2, pattern: [{ type: 'bundle', bundle: [] }] }, { type: 'bundle', bundle: [v] }]
    expect(pruneEmptyContainers(root, lookup)).toEqual([x, { type: 'bundle', bundle: [v], generate: 2 }])
  })
})
