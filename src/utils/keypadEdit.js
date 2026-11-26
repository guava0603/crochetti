// Pure editing model for the EditCrochet keypad.
//
// The keypad edits a whole row (`root`, a stitch-node list) through a cursor:
// `containerPath` is a list of indices that walks from the root into nested
// `pattern` / `bundle` nodes. An empty path means "the row root".
//
// - Stitches are inserted at the caret in the current container.
// - 「重複花樣」 inserts an empty pattern (count 1) at the caret and moves the cursor into it.
// - 「在同一針目裡」 inserts an empty bundle (consume 1) at the caret and moves the cursor into it.
// - 確認 (confirmSelection) leaves the current container (and drops it if still empty).
//
// Insertion point ("caret"): an index 0…children.length inside the current container.
// New nodes go in at the caret; delete removes the node before it. The caret never leaves
// the current container; helpers that change the container return where it lands.
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
function getContainerNode(root, containerPath) {
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
 * Refresh each bundle's stored `generate` (bottom-up). It is the fallback when a bundle's
 * stitches can't be looked up; bundle `consume` is user-defined and is preserved.
 * Patterns store no stats: their totals are always computed from their children.
 */
function recomputeStats(list, stitchLookup) {
  const safe = Array.isArray(list) ? list : []
  for (const node of safe) {
    if (node?.type === 'pattern') {
      recomputeStats(node.pattern, stitchLookup)
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

/** Keep a caret inside 0…children.length of the current container (default: the end). */
export function clampCaret(root, containerPath, caret) {
  const len = getContainerChildren(root, containerPath).length
  const n = Number(caret)
  if (!Number.isInteger(n)) return len
  return Math.min(len, Math.max(0, n))
}

/**
 * Insert any node (stitch / rope / …) into the current container at the caret.
 * @returns {{ root: Array, caret: number }} caret moves past the inserted node.
 */
export function insertNode(root, containerPath, caret, node, stitchLookup) {
  if (!node || typeof node !== 'object') return { root: clone(root || []), caret: clampCaret(root, containerPath, caret) }
  const at = clampCaret(root, containerPath, caret)
  const nextRoot = withContainerList(root, containerPath, (list) => {
    list.splice(at, 0, clone(node))
  }, stitchLookup)
  return { root: nextRoot, caret: at + 1 }
}

function insertEmptyContainer(root, containerPath, caret, node, stitchLookup) {
  const at = clampCaret(root, containerPath, caret)
  const nextRoot = withContainerList(root, containerPath, (list) => {
    list.splice(at, 0, node)
  }, stitchLookup)
  if (!isValidContainerPath(nextRoot, containerPath)) {
    return { root: nextRoot, containerPath: safePath(containerPath), caret: at }
  }
  // Move into the new container; the caret starts inside it.
  return { root: nextRoot, containerPath: [...safePath(containerPath), at], caret: 0 }
}

/** 「重複花樣」: insert an empty pattern (×1) at the caret and move into it. */
export function insertEmptyPattern(root, containerPath, stitchLookup, caret) {
  return insertEmptyContainer(root, containerPath, caret, {
    type: 'pattern',
    pattern: [],
    count: 1
  }, stitchLookup)
}

/** 「在同一針目裡」: insert an empty bundle (consume 1) at the caret and move into it. */
export function insertEmptyBundle(root, containerPath, stitchLookup, caret) {
  return insertEmptyContainer(root, containerPath, caret, {
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
 * 確認: move to the parent container, with the caret right after the container we leave.
 * If that container is still empty, drop it so no `[ ]` / `( )` is left behind (the caret
 * then sits where it was).
 */
export function leaveContainer(root, containerPath, stitchLookup) {
  const path = safePath(containerPath)
  if (!path.length) return { root: clone(root || []), containerPath: [], caret: clampCaret(root, [], undefined) }
  const parentPath = path.slice(0, -1)
  const index = path[path.length - 1]
  const isEmpty = getContainerChildren(root, path).length === 0
  const nextRoot = isEmpty ? removeAtPath(root, path, stitchLookup) : clone(root || [])
  return { root: nextRoot, containerPath: parentPath, caret: isEmpty ? index : index + 1 }
}

/**
 * Delete button (backspace): remove the node before the caret.
 * At the start of an empty container, remove the container itself and go to the parent.
 */
export function removeBefore(root, containerPath, caret, stitchLookup) {
  const path = safePath(containerPath)
  const at = clampCaret(root, path, caret)
  if (at > 0) {
    return {
      root: withContainerList(root, path, (list) => { list.splice(at - 1, 1) }, stitchLookup),
      containerPath: path,
      caret: at - 1
    }
  }
  if (path.length && getContainerChildren(root, path).length === 0) {
    return leaveContainer(root, path, stitchLookup)
  }
  return { root: clone(root || []), containerPath: path, caret: at }
}

/** Can the delete button do anything at this caret? */
export function canRemoveBefore(root, containerPath, caret) {
  if (clampCaret(root, containerPath, caret) > 0) return true
  return safePath(containerPath).length > 0 && getContainerChildren(root, containerPath).length === 0
}

/** Set ×n on the current pattern or bundle (no-op at the root). */
export function setContainerCount(root, containerPath, count, stitchLookup) {
  const path = safePath(containerPath)
  const next = clone(Array.isArray(root) ? root : [])
  const node = getContainerNode(next, path)
  if (!path.length || !childListKey(node)) return next
  node.count = Math.max(1, Math.floor(Number(count) || 1))
  if (stitchLookup) recomputeStats(next, stitchLookup)
  return next
}

/**
 * Preview click: given the path of the clicked node, return the path of the deepest
 * pattern or bundle that is (or contains) it — both are containers with a child list,
 * so they are selected the same way. Returns null when it is not inside either.
 */
export function findLeafContainerPath(root, nodePath) {
  const path = safePath(nodePath)
  let list = Array.isArray(root) ? root : []
  let best = null
  for (let i = 0; i < path.length; i += 1) {
    const node = list[path[i]]
    if (!node) break
    const key = childListKey(node)
    if (!key) break
    best = path.slice(0, i + 1)
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
    return { root: clone(root || []), containerPath: from, caret: undefined }
  }

  const leavingEmpty = from.length > 0 && getContainerChildren(root, from).length === 0
  if (!leavingEmpty) {
    const same = clone(root || [])
    return { root: same, containerPath: to, caret: clampCaret(same, to, undefined) }
  }

  // `to` cannot be inside the empty container, so only sibling-index shifts matter.
  const depth = from.length - 1
  const sameParent = to.length > depth && from.slice(0, depth).every((v, i) => v === to[i])
  if (sameParent && to[depth] > from[depth]) {
    to = [...to]
    to[depth] -= 1
  }
  const nextRoot = removeAtPath(root, from, stitchLookup)
  // A newly selected container opens with the caret at its end.
  return { root: nextRoot, containerPath: to, caret: clampCaret(nextRoot, to, undefined) }
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
