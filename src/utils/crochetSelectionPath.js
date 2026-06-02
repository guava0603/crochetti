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
 * Turn a bubbled CrochetNode selection into a payload for mergeInnerSelectionPath.
 * Returns null when the payload cannot be interpreted.
 */
export function normalizePreviewClickPayload(rootIndex, payload) {
  const root = Number(rootIndex)
  if (!Number.isFinite(root)) return null

  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    Array.isArray(payload.innerPath)
  ) {
    return payload
  }

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (!isSelectionRange(first)) return null

    if (first.start === root) {
      const deeper = payload.slice(1)
      return deeper.length
        ? { rootIndex: root, innerPath: deeper }
        : createSelection(root, root)
    }

    if (payload.every(isSelectionRange)) {
      return payload.length === 1
        ? createSelection(root, root)
        : { rootIndex: root, innerPath: payload }
    }

    return null
  }

  return createSelection(root, root)
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
    if (!Number.isFinite(rootIndex) || innerPath.length === 0) {
      return null
    }

    const rootSel = createSelection(rootIndex, rootIndex)

    if (base.length === 0) {
      if (hasSingleWrappedRootPattern(rootList)) {
        // First drill into a lone row pattern (e.g. [短針, 7中長針]×3): select the pattern token only.
        return [rootSel]
      }
      // innerPath is relative to rootIndex (e.g. [{0,0}] inside 2中長針), never a row-root path by itself.
      return [rootSel, ...innerPath]
    }

    return [...base, rootSel, ...innerPath]
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
