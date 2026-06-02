import { getRopeChainCount } from '@/utils/ropeChainCount'

/**
 * Edit-crochet × / ch display spec (authoritative — implemented by countAtSelection).
 *
 * Inputs: row snapshot (`rowCopy` or `pendingPattern`), `selectionPath`, `selectedNodeType`.
 * Depth = selectionPath.length.
 *
 * | Leaf node | Parent | selectedNodeType | × shows |
 * |-----------|--------|------------------|---------|
 * | rope | — | rope | chain count |
 * | stitch | single-stitch pattern (`6短針` wrapper) | stitch | **parent.count** (e.g. 6) |
 * | pattern / bundle | — | pattern or bundle | **leaf.count** (e.g. 20 for `20[x,v]`, **6** for `6短針` at depth 1) |
 * | stitch | other / none | stitch | **1** |
 * | (no leaf) | — | — | **1** |
 *
 * virtualWholeRow (no table selection): × = **selectedCount** from selection state.
 *
 * Notes:
 * - Compact `6短針` stores repeat on `pattern.count`; table prefix shows it. At depth 1 on that
 *   pattern, × still shows **6** (same as leaf.count), not a separate outer multiplier.
 * - After plain stitch 1→N, EditingTable drills selection inward so depth-2 stitch uses parent.count.
 * - Do not cache one count across depths; always call resolveDisplayCount.
 */
export function isSingleStitchPattern(node) {
  if (!node || node.type !== 'pattern') return false
  const inner = Array.isArray(node.pattern) ? node.pattern : []
  return inner.length === 1 && inner[0]?.type === 'stitch'
}

export function getLeafAtSelectionPath(rootList, selectionPath) {
  const root = Array.isArray(rootList) ? rootList : []
  const path = Array.isArray(selectionPath) ? selectionPath : []

  if (!path.length) {
    return { list: root, index: null, node: null }
  }

  let currentList = root
  for (let i = 0; i < path.length - 1; i += 1) {
    const idx = path[i]?.start
    const node = currentList?.[idx]
    if (!node) return null

    if (node.type === 'pattern') {
      currentList = Array.isArray(node.pattern) ? node.pattern : []
      continue
    }
    if (node.type === 'bundle') {
      currentList = Array.isArray(node.bundle) ? node.bundle : []
      continue
    }
    return null
  }

  const last = path[path.length - 1]
  const leafIdx = last?.start
  if (leafIdx === null || leafIdx === undefined) return null

  return {
    list: currentList,
    index: leafIdx,
    node: currentList?.[leafIdx] ?? null
  }
}

function countAtSelection(rootList, selectionPath, selectedNodeType) {
  const type = String(selectedNodeType || '')
  const path = Array.isArray(selectionPath) ? selectionPath : []
  const leaf = getLeafAtSelectionPath(rootList, path)?.node
  if (!leaf) return 1

  if (type === 'rope' && leaf.type === 'rope') {
    return getRopeChainCount(leaf)
  }

  const parent = path.length > 1
    ? getLeafAtSelectionPath(rootList, path.slice(0, -1))?.node
    : null

  if (leaf.type === 'stitch' && isSingleStitchPattern(parent)) {
    return Math.max(1, Number(parent.count) || 1)
  }

  if (leaf.type === 'pattern' || leaf.type === 'bundle') {
    return Math.max(1, Number(leaf.count) || 1)
  }

  return 1
}

/** Displayed × / ch value for the current edit selection. */
export function resolveDisplayCount({
  rowCopy,
  selectionPath = [],
  selectedNodeType = '',
  virtualWholeRow = false,
  pendingPattern = null,
  selectedCount = 1
} = {}) {
  const root = Array.isArray(rowCopy) ? rowCopy : []
  const pending = Array.isArray(pendingPattern) ? pendingPattern : []

  if (virtualWholeRow) {
    return Math.max(1, Number(selectedCount) || 1)
  }

  if (root.length) {
    return countAtSelection(root, selectionPath, selectedNodeType)
  }

  if (pending.length) {
    return countAtSelection(pending, selectionPath, selectedNodeType)
  }

  return 1
}
