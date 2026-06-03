/**
 * Undo/redo snapshots for EditCrochet draft editing.
 */

export function captureEditCrochetSnapshot({
  pendingPattern,
  pendingStitchId,
  pendingPosition,
  pendingReplaceNode,
  countDirty,
  rowCopyCount,
  stitchEditTab
}) {
  return {
    pendingPattern: JSON.parse(JSON.stringify(Array.isArray(pendingPattern) ? pendingPattern : [])),
    pendingStitchId: pendingStitchId ?? null,
    pendingPosition: String(pendingPosition ?? ''),
    pendingReplaceNode: pendingReplaceNode
      ? JSON.parse(JSON.stringify(pendingReplaceNode))
      : null,
    countDirty: Boolean(countDirty),
    rowCopyCount: Math.max(1, Number(rowCopyCount) || 1),
    stitchEditTab: String(stitchEditTab || 'change')
  }
}

export function snapshotsEqual(a, b) {
  if (!a || !b) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export function createEditCrochetHistory() {
  const undoStack = []
  const redoStack = []

  return {
    undoStack,
    redoStack,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    clear() {
      undoStack.length = 0
      redoStack.length = 0
    },
    pushUndo(current) {
      const snap = captureEditCrochetSnapshot(current)
      const top = undoStack[undoStack.length - 1]
      if (snapshotsEqual(top, snap)) return
      undoStack.push(snap)
      redoStack.length = 0
    },
    undo(current) {
      if (!undoStack.length) return null
      const previous = undoStack.pop()
      redoStack.push(captureEditCrochetSnapshot(current))
      return previous
    },
    redo(current) {
      if (!redoStack.length) return null
      const next = redoStack.pop()
      undoStack.push(captureEditCrochetSnapshot(current))
      return next
    }
  }
}
