import { isRangeSelection } from '@/constants/selection.js'

export const computeCurrentSelectedData = (selectionList, stitchNodeList) => {
  const safeList = Array.isArray(selectionList) ? selectionList : []
  const rootList = Array.isArray(stitchNodeList) ? stitchNodeList : []

  if (safeList.length === 0) {
    return {
      selectionState: 'select_range',
      selectedNodeType: 'pattern',
      selectedCount: 1,
      currentPattern: rootList
    }
  }

  const lastSelection = safeList[safeList.length - 1]
  if (!lastSelection || lastSelection.start === null || lastSelection.end === null) {
    return null
  }

  const selectionState = isRangeSelection(lastSelection) ? 'select_range' : 'select_one'
  if (selectionState === 'select_range') {
    if (selectionList.length === 1) {
      return {
        selectionState,
        selectedNodeType: 'pattern',
        selectedCount: 1,
        currentPattern: rootList
      }
    }
    return {
      selectionState,
      selectedNodeType: 'pattern',
      selectedCount: 1,
      currentPattern: null
    }
  }

  const selectionPath = safeList.slice(0, -1)
  let currentList = rootList

  for (const selection of selectionPath) {
    const index = selection?.start
    const nextNode = currentList?.[index]
    if (!nextNode) {
      return null
    }

    if (nextNode.type === 'pattern') {
      currentList = Array.isArray(nextNode.pattern) ? nextNode.pattern : []
      continue
    }

    if (nextNode.type === 'bundle') {
      currentList = Array.isArray(nextNode.bundle) ? nextNode.bundle : []
      continue
    }

    return null
  }

  const leafIndex = lastSelection.start
  const node = currentList?.[leafIndex]
  if (!node) {
    return null
  }

  if (node.type === 'pattern') {
    const inner = Array.isArray(node.pattern) ? node.pattern : []
    return {
      selectionState,
      selectedNodeType: 'pattern',
      selectedCount: node.count || 1,
      currentPattern: inner
    }
  }

  if (node.type === 'bundle') {
    return {
      selectionState,
      selectedNodeType: 'bundle',
      selectedCount: node.count || 1,
      currentPattern: Array.isArray(node.bundle) ? node.bundle : []
    }
  }

  return {
    selectionState,
    selectedNodeType: 'stitch',
    selectedCount: 1,
    currentPattern: [node]
  }
}
