// Pure editing model for the EditCrochet keypad.
//
// The keypad edits a whole row (`root`, a stitch-node list) through a cursor:
// `containerPath` is a list of indices that walks from the root into nested
// `pattern` / `bundle` nodes. An empty path means "the row root".
//
// - Stitches are appended to the current container.
// - 「重複花樣」 appends an empty pattern (count 1) and moves the cursor into it.
// - 「在同一針目裡」 appends an empty bundle (consume 1) and moves the cursor into it.
// - The last-page button leaves the current container (and drops it if still empty).
//
// Every mutating helper returns a fresh deep copy; inputs are never mutated.

import { calculateConsumeGenerateCore } from '@/utils/crochetStatsCore.js'

const clone = (value) => JSON.parse(JSON.stringify(value ?? null))

const childListKey = (node) => {
  if (node?.type === 'pattern') return 'pattern'
  if (node?.type === 'bundle') return 'bundle'
  return null
}

const safePath = (path) => (Array.isArray(path) ? path.filter((n) => Number.isInteger(n) && n >= 0) : [])

/** Node the cursor points at, or null for the root (or an invalid path). */
export function getContainerNode(root, containerPath) {
  const path = safePath(containerPath)
  let list = Array.isArray(root) ? root : []
  let node = null
  for (const idx of path) {
    node = list[idx]
    const key = childListKey(node)
    if (!key) return null
    list = Array.isArray(node[key]) ? node[key] : []
  }
  return node
}

/** 'root' | 'pattern' | 'bundle' | null (invalid path). */
export function getContainerKind(root, containerPath) {
  if (!safePath(containerPath).length) return 'root'
  const node = getContainerNode(root, containerPath)
  return childListKey(node)
}

/** Children of the current container (empty array when invalid). */
export function getContainerChildren(root, containerPath) {
  if (!safePath(containerPath).length) return Array.isArray(root) ? root : []
  const node = getContainerNode(root, containerPath)
  const key = childListKey(node)
  return key && Array.isArray(node[key]) ? node[key] : []
}

/** True when `containerPath` still points at a pattern/bundle (or is the root). */
export function isValidContainerPath(root, containerPath) {
  return getContainerKind(root, containerPath) !== null
}

/**
 * Recompute derived consume/generate for every pattern/bundle (bottom-up).
 * Bundle `consume` is user-defined (always 1 from the keypad) and is preserved.
 */
export function recomputeStats(list, stitchLookup) {
  const safe = Array.isArray(list) ? list : []
  for (const node of safe) {
    if (node?.type === 'pattern') {
      recomputeStats(node.pattern, stitchLookup)
      const stats = calculateConsumeGenerateCore(node.pattern || [], node.count || 1, stitchLookup)
      node.consume = stats.consume
      node.generate = stats.generate
    } else if (node?.type === 'bundle') {
      recomputeStats(node.bundle, stitchLookup)
      node.generate = calculateConsumeGenerateCore(node.bundle || [], 1, stitchLookup).generate
    }
  }
  return safe
}

// Clone the row, run `mutate` on the current container's child list, then refresh stats.
function withContainerList(root, containerPath, mutate, stitchLookup) {
  const next = clone(Array.isArray(root) ? root : [])
  if (!isValidContainerPath(next, containerPath)) return next
  const path = safePath(containerPath)
  if (path.length) {
    const node = getContainerNode(next, path)
    const key = childListKey(node)
    if (!Array.isArray(node[key])) node[key] = []
    mutate(node[key])
  } else {
    mutate(next)
  }
  if (stitchLookup) recomputeStats(next, stitchLookup)
  return next
}

/** Append any node (stitch / rope / …) to the current container. */
export function appendNode(root, containerPath, node, stitchLookup) {
  if (!node || typeof node !== 'object') return clone(root || [])
  return withContainerList(root, containerPath, (list) => {
    list.push(clone(node))
  }, stitchLookup)
}

function insertEmptyContainer(root, containerPath, node, stitchLookup) {
  let newIndex = -1
  const nextRoot = withContainerList(root, containerPath, (list) => {
    list.push(node)
    newIndex = list.length - 1
  }, stitchLookup)
  if (newIndex < 0) return { root: nextRoot, containerPath: safePath(containerPath) }
  return { root: nextRoot, containerPath: [...safePath(containerPath), newIndex] }
}

/** 「重複花樣」: append an empty pattern (×1) and move into it. */
export function insertEmptyPattern(root, containerPath, stitchLookup) {
  return insertEmptyContainer(root, containerPath, {
    type: 'pattern',
    pattern: [],
    count: 1,
    consume: 0,
    generate: 0
  }, stitchLookup)
}

/** 「在同一針目裡」: append an empty bundle (consume 1) and move into it. */
export function insertEmptyBundle(root, containerPath, stitchLookup) {
  return insertEmptyContainer(root, containerPath, {
    type: 'bundle',
    bundle: [],
    consume: 1,
    generate: 0,
    count: 1
  }, stitchLookup)
}

/**
 * Pattern section visibility.
 * - root: always allowed.
 * - pattern: only once it has at least one child (prevents `[[[…]]]` chains).
 * - bundle: never (a bundle only takes stitches).
 */
export function canStartPattern(root, containerPath) {
  const kind = getContainerKind(root, containerPath)
  if (kind === 'root') return true
  if (kind === 'pattern') return getContainerChildren(root, containerPath).length > 0
  return false
}

/** Bundle section visibility: anywhere except inside a bundle. */
export function canStartBundle(root, containerPath) {
  const kind = getContainerKind(root, containerPath)
  return kind === 'root' || kind === 'pattern'
}

function removeAtPath(root, nodePath, stitchLookup) {
  const path = safePath(nodePath)
  if (!path.length) return clone(root || [])
  const parentPath = path.slice(0, -1)
  const idx = path[path.length - 1]
  return withContainerList(root, parentPath, (list) => {
    if (idx < list.length) list.splice(idx, 1)
  }, stitchLookup)
}

/**
 * Last-page button: move the cursor to the parent container.
 * If the container we leave is still empty, drop it so no `[ ]` / `( )` is left behind.
 */
export function leaveContainer(root, containerPath, stitchLookup) {
  const path = safePath(containerPath)
  if (!path.length) return { root: clone(root || []), containerPath: [] }
  const parentPath = path.slice(0, -1)
  const isEmpty = getContainerChildren(root, path).length === 0
  const nextRoot = isEmpty ? removeAtPath(root, path, stitchLookup) : clone(root || [])
  return { root: nextRoot, containerPath: parentPath }
}

/**
 * Delete-last button: remove the last child of the current container.
 * When the container is already empty, remove the container itself and go to the parent.
 */
export function removeLast(root, containerPath, stitchLookup) {
  const path = safePath(containerPath)
  const children = getContainerChildren(root, path)
  if (children.length > 0) {
    return {
      root: withContainerList(root, path, (list) => { list.pop() }, stitchLookup),
      containerPath: path
    }
  }
  if (!path.length) return { root: clone(root || []), containerPath: [] }
  return leaveContainer(root, path, stitchLookup)
}

/** Can the delete-last button do anything? */
export function canRemoveLast(root, containerPath) {
  return getContainerChildren(root, containerPath).length > 0 || safePath(containerPath).length > 0
}

/** Set ×n on the current pattern (no-op for root / bundle). */
export function setContainerCount(root, containerPath, count, stitchLookup) {
  const path = safePath(containerPath)
  const next = clone(Array.isArray(root) ? root : [])
  const node = getContainerNode(next, path)
  if (!path.length || node?.type !== 'pattern') return next
  node.count = Math.max(1, Math.floor(Number(count) || 1))
  if (stitchLookup) recomputeStats(next, stitchLookup)
  return next
}

/** ×n of the current pattern, or null when the cursor is not on a pattern. */
export function getContainerCount(root, containerPath) {
  if (!safePath(containerPath).length) return null
  const node = getContainerNode(root, containerPath)
  if (node?.type !== 'pattern') return null
  return Math.max(1, Number(node.count) || 1)
}

/**
 * Preview click: given the path of the clicked node, return the path of the deepest
 * pattern that is (or contains) it. Returns null when it is not inside any pattern.
 */
export function findLeafPatternPath(root, nodePath) {
  const path = safePath(nodePath)
  let list = Array.isArray(root) ? root : []
  let best = null
  for (let i = 0; i < path.length; i += 1) {
    const node = list[path[i]]
    if (!node) break
    if (node.type === 'pattern') best = path.slice(0, i + 1)
    const key = childListKey(node)
    if (!key) break
    list = Array.isArray(node[key]) ? node[key] : []
  }
  return best
}

/**
 * Move the cursor to `targetPath`. The container being left is dropped when empty,
 * and `targetPath` is shifted to stay on the same node.
 */
export function moveToContainer(root, currentPath, targetPath, stitchLookup) {
  const from = safePath(currentPath)
  let to = safePath(targetPath)
  const samePath = from.length === to.length && from.every((v, i) => v === to[i])
  if (samePath || !isValidContainerPath(root, to)) {
    return { root: clone(root || []), containerPath: from }
  }

  const leavingEmpty = from.length > 0 && getContainerChildren(root, from).length === 0
  if (!leavingEmpty) return { root: clone(root || []), containerPath: to }

  // `to` cannot be inside the empty container, so only sibling-index shifts matter.
  const depth = from.length - 1
  const sameParent = to.length > depth && from.slice(0, depth).every((v, i) => v === to[i])
  if (sameParent && to[depth] > from[depth]) {
    to = [...to]
    to[depth] -= 1
  }
  return { root: removeAtPath(root, from, stitchLookup), containerPath: to }
}

/** Remove empty patterns/bundles anywhere in the tree (used before saving). */
export function pruneEmptyContainers(list, stitchLookup) {
  const walk = (nodes) => {
    const out = []
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const key = childListKey(node)
      if (key) {
        node[key] = walk(node[key])
        if (!node[key].length) continue
      }
      out.push(node)
    }
    return out
  }
  const next = walk(clone(Array.isArray(list) ? list : []))
  if (stitchLookup) recomputeStats(next, stitchLookup)
  return next
}
