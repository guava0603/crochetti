import {
  getLeafAtSelectionPath,
  isSingleStitchPattern,
  resolveDisplayCount
} from '@/utils/editCrochetCount'

function createStitchRepeatPattern(count, stitchNode) {
  return {
    type: 'pattern',
    count: Math.max(1, Number(count) || 1),
    pattern: [{ ...stitchNode }]
  }
}

export { getLeafAtSelectionPath } from '@/utils/editCrochetCount'

export function getCountFromRowCopy(rowCopy, selectionPath, options = {}) {
  return resolveDisplayCount({
    rowCopy,
    selectionPath,
    ...options
  })
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
