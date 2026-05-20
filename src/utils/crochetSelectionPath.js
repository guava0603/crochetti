import { createSelection } from '@/constants/selection'

export function isSelectionRange(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    Object.prototype.hasOwnProperty.call(value, 'start') &&
    Object.prototype.hasOwnProperty.call(value, 'end')
  )
}

export function hasSingleWrappedRootPattern(rootList) {
  const list = Array.isArray(rootList) ? rootList : []
  if (list.length !== 1) return false
  const node = list[0]
  return node?.type === 'pattern' && Number(node?.count || 1) > 1
}

/**
 * Merge a preview click into the row selection path.
 *
 * Supports:
 * - leaf selection in the currently displayed list: { start, end }
 * - drilled selection from pattern/bundle innards: { rootIndex, innerPath }
 */
export function mergeInnerSelectionPath({
  baseSelection = [],
  payload,
  rootList = []
} = {}) {
  const base = Array.isArray(baseSelection) ? baseSelection : []

  if (payload && typeof payload === 'object' && Array.isArray(payload.innerPath)) {
    const rootIndex = Number(payload.rootIndex)
    const innerPath = payload.innerPath.filter(isSelectionRange)
    if (!Number.isFinite(rootIndex) || innerPath.length === 0) return null

    const rootSel = createSelection(rootIndex, rootIndex)

    if (base.length === 0) {
      if (hasSingleWrappedRootPattern(rootList)) {
        return [rootSel, ...innerPath]
      }
      return innerPath.length === 1 ? innerPath : [rootSel, ...innerPath]
    }

    return [...base, ...innerPath]
  }

  if (isSelectionRange(payload)) {
    if (base.length === 0) {
      return [payload]
    }
    return [...base, payload]
  }

  return null
}

/**
 * Apply a count override only when the selected leaf supports its own repeat count.
 */
export function shouldApplyCountOverrideToLeaf(leaf) {
  if (!leaf || typeof leaf !== 'object') return false
  return leaf.type === 'pattern' || leaf.type === 'bundle'
}
