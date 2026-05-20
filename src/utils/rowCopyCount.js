import { isSingleStitchPattern } from '@/utils/editCrochetCount'
import { getRopeChainCount } from '@/utils/ropeChainCount'

function createStitchRepeatPattern(count, stitchNode) {
  return {
    type: 'pattern',
    count: Math.max(1, Number(count) || 1),
    pattern: [{ ...stitchNode }]
  }
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

export function getCountFromRowCopy(rowCopy, selectionPath, {
  selectedNodeType = '',
  virtualWholeRow = false
} = {}) {
  const type = String(selectedNodeType || '')
  const root = Array.isArray(rowCopy) ? rowCopy : []

  if (virtualWholeRow) {
    if (root.length === 1 && root[0]?.type === 'pattern') {
      return Math.max(1, Number(root[0].count) || 1)
    }
    return 1
  }

  const leafInfo = getLeafAtSelectionPath(root, selectionPath)
  const node = leafInfo?.node
  if (!node) return 1

  if (type === 'rope') {
    return getRopeChainCount(node)
  }

  if (type === 'stitch') {
    if (isSingleStitchPattern(node)) {
      return Math.max(1, Number(node.count) || 1)
    }
    return 1
  }

  if (type === 'pattern' || type === 'bundle') {
    return Math.max(1, Number(node.count) || 1)
  }

  return 1
}

export function applyCountToRowCopy(rowCopy, selectionPath, nextCount, {
  selectedNodeType = ''
} = {}) {
  const draft = JSON.parse(JSON.stringify(Array.isArray(rowCopy) ? rowCopy : []))
  const count = Math.max(1, Number(nextCount) || 1)
  const type = String(selectedNodeType || '')
  const path = Array.isArray(selectionPath) ? selectionPath : []
  const leafInfo = getLeafAtSelectionPath(draft, path)

  if (!leafInfo?.node || leafInfo.index === null || leafInfo.index === undefined) {
    return draft
  }

  const { list, index, node } = leafInfo

  if (type === 'stitch') {
    if (node.type === 'stitch') {
      if (count <= 1) return draft
      list.splice(index, 1, createStitchRepeatPattern(count, {
        type: 'stitch',
        stitch_id: node.stitch_id,
        position: node.position
      }))
      return draft
    }

    if (isSingleStitchPattern(node)) {
      if (count <= 1) {
        list.splice(index, 1, { ...node.pattern[0] })
      } else {
        node.count = count
      }
    }
    return draft
  }

  if (type === 'pattern' || type === 'bundle') {
    if (node.type === 'pattern' || node.type === 'bundle') {
      node.count = count
    }
    return draft
  }

  if (type === 'rope' && node.type === 'rope') {
    node.chain_count = count
  }

  return draft
}
