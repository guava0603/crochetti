export function isSingleStitchPattern(node) {
  if (!node || node.type !== 'pattern') return false
  const inner = Array.isArray(node.pattern) ? node.pattern : []
  return inner.length === 1 && inner[0]?.type === 'stitch'
}

export function readStitchRepeatFromPending(pendingPattern) {
  const first = Array.isArray(pendingPattern) ? pendingPattern[0] : null
  if (!first) return 1
  if (first.type === 'stitch') return 1
  if (isSingleStitchPattern(first)) {
    return Math.max(1, Number(first.count) || 1)
  }
  return 1
}

export function resolveEditCount({
  selectedNodeType,
  selectedCount,
  pendingPattern,
  virtualWholeRow = false,
  selectionDepth = 0
} = {}) {
  const type = String(selectedNodeType || '')

  if (type === 'rope') {
    const first = Array.isArray(pendingPattern) ? pendingPattern[0] : null
    const raw = first?.chain_count ?? first?.chainCount
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1
  }

  if (type === 'stitch') {
    return readStitchRepeatFromPending(pendingPattern)
  }

  if (type === 'pattern' || type === 'bundle') {
    // Inner pattern repeat (e.g. 5x inside 20[x,v]) vs outer row repeat.
    if (!virtualWholeRow && selectionDepth >= 2) {
      return Math.max(1, Number(selectedCount) || 1)
    }
    return Math.max(1, Number(selectedCount) || 1)
  }

  if (virtualWholeRow) {
    const first = Array.isArray(pendingPattern) ? pendingPattern[0] : null
    if (first?.type === 'pattern') {
      return Math.max(1, Number(first.count) || 1)
    }
    return Math.max(1, Number(selectedCount) || 1)
  }

  return Math.max(1, Number(selectedCount) || 1)
}

export function isEditingInnerRepeat({
  selectedNodeType,
  selectionDepth = 0,
  virtualWholeRow = false
} = {}) {
  const type = String(selectedNodeType || '')
  if (virtualWholeRow) return false
  if (type === 'stitch') return selectionDepth >= 2
  if (type === 'pattern' || type === 'bundle') return selectionDepth >= 2
  return false
}

export function isEditingOuterPatternRepeat({
  selectedNodeType,
  selectionDepth = 0,
  virtualWholeRow = false
} = {}) {
  const type = String(selectedNodeType || '')
  if (virtualWholeRow) return true
  if (type === 'pattern' || type === 'bundle') return selectionDepth <= 1
  return false
}
