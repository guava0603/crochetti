<template>
  <div class="row-actions-display">
    <template v-for="(stitchNode, nIndex) in stitchNodeList" :key="nIndex">
      <CrochetNode
        :table-type="tableType"
        :node="stitchNode"
        :level="0"
        :selection="handleSelection(selectionList, nIndex)"
        @selection-change="(next) => handleChildSelectionChange(nIndex, next)"
      />
      <span v-if="nIndex < stitchNodeList.length - 1" class="separator">, </span>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { createPattern } from '@/constants/crochetData.js'
import { createSelection, isInSelection, isRangeSelection } from '@/constants/selection.js'
import { addStitchToPatternList } from '@/utils/patternEdit.js'
import { crochetValidate } from '@/utils/crochetValidate.js'
import { calculateConsumeGenerate } from '@/utils/calculateConsumeGenerate.js'
import CrochetNode from './CrochetNode.vue'

const props = defineProps({
  tableType: {
    type: String,
    required: true
  },
  stitchNodeList: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'update:stitchNodeList',
  'selection-change'
])

const selectionList = ref([])

const emitSelectionChange = () => {
  emit('selection-change', selectionList.value)
}

// Helper function to emit updated stitch node list with calculated stats
const emitUpdatedRow = (rowContent) => {
  const safeRowContent = Array.isArray(rowContent) ? rowContent : []
  const normalizedRowContent = crochetValidate(safeRowContent)
  const stats = calculateConsumeGenerate(normalizedRowContent)
  emit('update:stitchNodeList', {
    stitch_node_list: normalizedRowContent,
    generate: stats.generate,
    consume: stats.consume
  })
}

const setStitchNodeList = (nextList) => {
  const safe = Array.isArray(nextList) ? nextList : []
  emitUpdatedRow(safe)
}

const handleSelection = (selectionListValue, nIndex) => {
  if (!Array.isArray(selectionListValue) || selectionListValue.length === 0) return null
  const firstRange = selectionListValue[0]
  return isInSelection(firstRange, nIndex) ? selectionListValue : null
}

const getSelectionInfo = () => {
  const selectionListValue = Array.isArray(selectionList.value) ? selectionList.value : []
  if (selectionListValue.length === 0) return null

  const lastRange = selectionListValue[selectionListValue.length - 1]
  const rowContent = [...props.stitchNodeList]
  let currentList = rowContent
  const pathStack = []

  for (let i = 0; i < selectionListValue.length - 1; i += 1) {
    const nodeIndex = selectionListValue[i].start
    const node = currentList[nodeIndex]
    if (!node) return null
    if (node.type === 'pattern' && Array.isArray(node.pattern)) {
      pathStack.push({ node, list: currentList, index: nodeIndex })
      currentList = node.pattern
    } else if (node.type === 'bundle' && Array.isArray(node.bundle)) {
      pathStack.push({ node, list: currentList, index: nodeIndex })
      currentList = node.bundle
    } else {
      return null
    }
  }

  return {
    rowContent,
    currentList,
    pathStack,
    lastRange
  }
}

const isSameSinglePath = (a, b) => {
  const listA = Array.isArray(a) ? a : []
  const listB = Array.isArray(b) ? b : []
  if (listA.length !== listB.length) return false
  for (let i = 0; i < listA.length; i += 1) {
    const sa = listA[i]
    const sb = listB[i]
    if (!sa || !sb) return false
    if (sa.start !== sa.end) return false
    if (sb.start !== sb.end) return false
    if (sa.start !== sb.start) return false
  }
  return true
}

const handleChildSelectionChange = (rootIndex, nextSelectionList) => {
  if (props.tableType === 'view') return

  // Edit table: always select nothing.
  let next = []
  if (props.tableType === 'record') {
    const safeChild = Array.isArray(nextSelectionList) ? nextSelectionList : []
    next = [createSelection(rootIndex, rootIndex), ...safeChild]

    if (isSameSinglePath(selectionList.value, next)) {
      next = []
    }
  }
  selectionList.value = next
  emitSelectionChange()
}

const clearSelection = () => {
  if (selectionList.value.length === 0) return
  selectionList.value = []
  emitSelectionChange()
}

const setSelection = (next) => {
  const safe = Array.isArray(next) ? next : []
  if (props.tableType === 'view') {
    clearSelection()
    return
  }

  if (props.tableType === 'record') {
    selectionList.value = safe.map(sel => createSelection(sel.start, sel.start))
    emitSelectionChange()
    return
  }

  // edit
  if (safe.length <= 1) {
    selectionList.value = safe.length === 1 ? [safe[0]] : []
  } else {
    selectionList.value = safe.map(sel => createSelection(sel.start, sel.start))
  }
  emitSelectionChange()
}

const addInnerSelection = (next) => {
  if (props.tableType === 'view') return

  const last = selectionList.value.length > 0 ? selectionList.value[selectionList.value.length - 1] : null
  if (isRangeSelection(last)) {
    selectionList.value = [...selectionList.value.slice(0, -1), next]
  } else {
    selectionList.value.push(next)
  }
  emitSelectionChange()
}

const recalcAncestorPatterns = (pathStack) => {
  for (let i = pathStack.length - 1; i >= 0; i -= 1) {
    const { node } = pathStack[i]
    if (node.type === 'pattern' && Array.isArray(node.pattern)) {
      const stats = calculateConsumeGenerate(node.pattern, node.count || 1)
      node.consume = stats.consume
      node.generate = stats.generate
    } else if (node.type === 'bundle' && Array.isArray(node.bundle)) {
      const stats = calculateConsumeGenerate(node.bundle, 1)
      node.generate = stats.generate
    }
  }
}

const cleanupEmptyParents = (pathStack) => {
  while (pathStack.length > 0) {
    const parentEntry = pathStack[pathStack.length - 1]
    const parentNode = parentEntry.node
    if (parentNode.type === 'pattern' && Array.isArray(parentNode.pattern) && parentNode.pattern.length === 0) {
      parentEntry.list.splice(parentEntry.index, 1)
      pathStack.pop()
      continue
    }
    break
  }
}

const flattenPatternIfNeeded = (currentList, selectedIndex, patternNode, pathStack) => {
  if (!patternNode || patternNode.type !== 'pattern') return false
  const repeat = patternNode.count || 1
  if (repeat !== 1) return false

  const inner = Array.isArray(patternNode.pattern) ? patternNode.pattern : []
  if (inner.length === 0) {
    currentList.splice(selectedIndex, 1)
    cleanupEmptyParents(pathStack)
    return true
  }

  currentList.splice(selectedIndex, 1, ...inner)
  return true
}

const updateNodeCount = (newCount) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  const selectedIndex = lastRange.start
  const selectedNode = currentList[selectedIndex]
  if (!selectedNode) return

  let removedSelected = false

  if (newCount === 0) {
    currentList.splice(selectedIndex, 1)
    removedSelected = true
  } else {
    if (selectedNode.type === 'stitch') {
      const patternNode = {
        type: 'pattern',
        pattern: [{ type: 'stitch', stitch_id: selectedNode.stitch_id }],
        count: Math.max(2, newCount)
      }
      const stats = calculateConsumeGenerate(patternNode.pattern, patternNode.count)
      patternNode.consume = stats.consume
      patternNode.generate = stats.generate
      currentList.splice(selectedIndex, 1, patternNode)
    } else {
      selectedNode.count = newCount
      if (selectedNode.type === 'pattern' && Array.isArray(selectedNode.pattern)) {
        // If pattern count becomes 1, unwrap it into parent list.
        if (flattenPatternIfNeeded(currentList, selectedIndex, selectedNode, pathStack)) {
          removedSelected = true
        } else {
          const stats = calculateConsumeGenerate(selectedNode.pattern, selectedNode.count || 1)
          selectedNode.consume = stats.consume
          selectedNode.generate = stats.generate
        }
      }
    }
  }

  if (removedSelected) {
    cleanupEmptyParents(pathStack)
  }

  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

// Selection is owned by CrochetDisplay.

const addStitch = (payload) => {
  const stitchId = typeof payload === 'number' ? payload : payload?.stitchId
  if (stitchId === null || stitchId === undefined) return

  const nextList = addStitchToPatternList(props.stitchNodeList, payload)
  emitUpdatedRow(nextList)
}

const addBundle = (bundle) => {
  const rowContent = [...props.stitchNodeList]

  // Add bundle directly at end (do NOT wrap into a pattern)
  rowContent.push(bundle)
  emitUpdatedRow(rowContent)
}

const deleteSelected = () => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo

  if (isRangeSelection(lastRange)) {
    const start = Math.min(lastRange.start, lastRange.end)
    const end = Math.max(lastRange.start, lastRange.end)
    currentList.splice(start, end - start + 1)
    cleanupEmptyParents(pathStack)
    recalcAncestorPatterns(pathStack)
    emitUpdatedRow(rowContent)
    return
  }

  const selectedIndex = lastRange.start
  if (selectedIndex === null || selectedIndex === undefined) return

  currentList.splice(selectedIndex, 1)
  cleanupEmptyParents(pathStack)
  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const createPatternFromRange = (repeatCount = 1) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (!isRangeSelection(lastRange)) return

  const start = Math.min(lastRange.start, lastRange.end)
  const end = Math.max(lastRange.start, lastRange.end)
  const selectedNodes = currentList.slice(start, end + 1)

  if (repeatCount === 1) return

  const pattern = selectedNodes.flatMap((node) => {
    if (
      node.type === 'pattern' &&
      Array.isArray(node.pattern) &&
      node.pattern.length === 1 &&
      (node.count || 1) === 1
    ) {
      return node.pattern.map(innerNode => ({ ...innerNode }))
    }
    return [{ ...node }]
  })
  const newPattern = createPattern(repeatCount, pattern)
  currentList.splice(start, end - start + 1, newPattern)

  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const createPatternFromWholeRow = (repeatCount = 1) => {
  if (repeatCount === 1) return

  const rowContent = [...props.stitchNodeList]
  if (rowContent.length === 0) return
  const pattern = rowContent.flatMap((node) => {
    if (
      node.type === 'pattern' &&
      Array.isArray(node.pattern) &&
      node.pattern.length === 1 &&
      (node.count || 1) === 1
    ) {
      return node.pattern.map(innerNode => ({ ...innerNode }))
    }
    return [{ ...node }]
  })
  const newPattern = createPattern(repeatCount, pattern)
  emitUpdatedRow([newPattern])
}

const changeSelectedStitch = (stitchId) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  let selectedNode = currentList[lastRange.start]
  if (!selectedNode || selectedNode.type !== 'stitch') {
    if (selectedNode && selectedNode.type === 'pattern' && Array.isArray(selectedNode.pattern) && selectedNode.pattern.length === 1 && selectedNode.pattern[0].type === 'stitch') {
      // Handle case where stitch is wrapped in a pattern with count=1
      selectedNode = selectedNode.pattern[0]
    } else {
      return
    }
  }

  selectedNode.stitch_id = stitchId
  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const updateNodePattern = (newPattern) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  const selectedNode = currentList[lastRange.start]
  if (!selectedNode || selectedNode.type !== 'pattern') return

  selectedNode.pattern = newPattern
  const stats = calculateConsumeGenerate(newPattern, selectedNode.count || 1)
  selectedNode.consume = stats.consume
  selectedNode.generate = stats.generate

  // If this pattern has count==1, unwrap it.
  flattenPatternIfNeeded(currentList, lastRange.start, selectedNode, pathStack)

  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const replaceSelectedNode = (nextNode) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  const selectedIndex = lastRange.start
  if (selectedIndex === null || selectedIndex === undefined) return
  if (!nextNode || typeof nextNode !== 'object') return

  currentList.splice(selectedIndex, 1, nextNode)
  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

defineExpose({
  clearSelection,
  setSelection,
  addInnerSelection,
  addStitch,
  addBundle,
  deleteSelected,
  setStitchNodeList,
  updateNodeCount,
  changeSelectedStitch,
  updateNodePattern,
  replaceSelectedNode,
  createPatternFromRange,
  createPatternFromWholeRow
})
</script>

<style scoped>
.row-actions-display {
  flex: 1;
  min-width: 0;
  line-height: 1.2;
  font-size: 0.875rem;
  overflow: visible;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  position: relative;
}

.separator {
  color: #6b7280;
}
</style>
