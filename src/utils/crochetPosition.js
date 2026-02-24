import { getNodePerRepeatGenerate, getNodeTotalGenerate, getPatternRepeatGenerate } from '@/utils/crochetGenerate.js'

export const getNodeSize = (node) => {
  if (!node) return 0

  if (node.type === 'stitch') return node.count || 1
  if (node.type === 'bundle') return node.count || 1
  if (node.type === 'pattern') return node.count || 1

  return 0
}

// Compute how many stitches have been generated within a row, based on a nested selection path.
// This is used for converting selection UI -> end_at.crochet_count.
export const computeGenerateDone = (selectionList, stitchList, counts) => {
  if (!Array.isArray(selectionList) || selectionList.length === 0) return 0

  let total = 0
  let currentList = stitchList
  let countIndex = 0

  for (let level = 0; level < selectionList.length; level += 1) {
    const selection = selectionList[level]
    const index = selection?.start
    if (index === null || index === undefined) break

    for (let i = 0; i < index; i += 1) {
      total += getNodeTotalGenerate(currentList?.[i])
    }

    const node = currentList?.[index]
    if (!node) break

    const size = getNodeSize(node)
    const selectedCount = size > 1 ? (counts?.[countIndex] ?? 1) : 1
    if (size > 1) countIndex += 1

    if (node.type === 'pattern') {
      const perRepeat = getPatternRepeatGenerate(node.pattern || [])
      if (level === selectionList.length - 1) {
        total += perRepeat * selectedCount
        return total
      }

      total += perRepeat * Math.max(0, selectedCount - 1)
      currentList = node.pattern || []
      continue
    }

    if (node.type === 'stitch') {
      // The selectedCount means how many repetitions of this stitch have been completed.
      total += getNodePerRepeatGenerate(node) * Math.max(0, selectedCount)
      return total
    }

    if (node.type === 'bundle') {
      const perRepeat = getNodePerRepeatGenerate(node)

      if (level === selectionList.length - 1) {
        total += perRepeat * Math.max(0, selectedCount)
        return total
      }

      total += perRepeat * Math.max(0, selectedCount - 1)
      currentList = node.bundle || []
      continue
    }

    break
  }

  return total
}

// Convert end_at.crochet_count to a nested selection path within a row.
// Used for applying selection highlight to RecordingTable based on persisted end_at.
export function endAtToSelectionList(row, endAt) {
  if (!row?.content?.stitch_node_list) return []

  const rootNodes = row.content.stitch_node_list
  let path = []

  const isArrayNonEmpty = (arr) => Array.isArray(arr) && arr.length > 0

  function descend(nodes, count) {
    if (!Array.isArray(nodes) || nodes.length === 0) return
    let remaining = Math.max(0, Number(count || 0))

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i]
      const nodeGen = getNodeTotalGenerate(node)

      if (remaining < nodeGen) {
        path.push({ start: i, end: i })

        if (node?.type === 'pattern' && isArrayNonEmpty(node.pattern)) {
          const per = getNodePerRepeatGenerate(node)
          const rawRemainder = per > 0 ? (remaining % per) : remaining
          const nextCount = rawRemainder === 0 && remaining > 0 ? per : rawRemainder

          if (!(node.pattern.length === 1 && node.pattern[0]?.type === 'stitch')) {
            descend(node.pattern, nextCount)
          }
        } else if (node?.type === 'bundle' && isArrayNonEmpty(node.bundle)) {
          const per = getNodePerRepeatGenerate(node)
          const rawRemainder = per > 0 ? (remaining % per) : remaining
          const nextCount = rawRemainder === 0 && remaining > 0 ? per : rawRemainder
          descend(node.bundle, nextCount)
        }

        return
      }

      if (remaining === nodeGen) {
        path.push({ start: i, end: i })

        if (node?.type === 'pattern' && isArrayNonEmpty(node.pattern)) {
          const per = getNodePerRepeatGenerate(node) || nodeGen
          if (!(node.pattern.length === 1 && node.pattern[0]?.type === 'stitch')) {
            descend(node.pattern, per)
          }
        } else if (node?.type === 'bundle' && isArrayNonEmpty(node.bundle)) {
          const per = getNodePerRepeatGenerate(node) || nodeGen
          descend(node.bundle, per)
        }

        return
      }

      remaining -= nodeGen
    }
  }

  descend(rootNodes, endAt?.crochet_count)

  if (path.length === 0 && Array.isArray(rootNodes) && rootNodes.length > 0) {
    path = [{ start: rootNodes.length - 1, end: rootNodes.length - 1 }]
  }

  return path
}
