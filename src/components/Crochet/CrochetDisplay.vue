<template>
  <div class="row-actions-display">
    <template v-for="(stitchNode, nIndex) in stitchNodeList" :key="nIndex">
      <CrochetNode
        :tableType="tableType"
        :node="stitchNode"
        :level="0"
        :selection="handleSelection(nIndex)"
        @add-last-selection="handleAddLastSelection"
        @remove-last-selection="handleRemoveLastSelection"
        @update-last-selection="handleUpdateLastSelection"
        @pass-selection="handlePassSelection(nIndex)"
        @set-selection="(sels) => handleSetSelection(sels, nIndex)"
        @unselect="clearSelection"
      />
      <span v-if="nIndex < stitchNodeList.length - 1" class="separator">, </span>
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { BasicStitch, createPattern } from '@/constants/crochetData.js'
import { createSelection, isInSelection, isNoSelection, isRangeSelection, updateSelection } from '@/constants/selection.js'
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
  'selection-change',
  'ask-for-selection-position'
])

// Calculate row statistics from stitch_node_list
const calculateRowStats = (stitchNodeList) => {
  let totalConsume = 0
  let totalGenerate = 0

  stitchNodeList.forEach(node => {
    if (node.type === 'stitch') {
      const stitch = BasicStitch[node.stitch_id]
      if (stitch) {
        const count = node.count || 1
        totalConsume += (stitch.consume || 0) * count
        totalGenerate += (stitch.generate || 0) * count
      }
    } else if (node.type === 'pattern') {
      const stats = calculatePatternStats(node.pattern || [], node.count || 1)
      totalConsume += stats.consume
      totalGenerate += stats.generate
    }
  })

  return { consume: totalConsume, generate: totalGenerate }
}

// Helper function to emit updated stitch node list with calculated stats
const emitUpdatedRow = (rowContent) => {
  const stats = calculateRowStats(rowContent)
  console.log('[emitUpdatedRow] emitting updated row with stats:', rowContent, stats)
  emit('update:stitchNodeList', {
    stitch_node_list: rowContent,
    generate: stats.generate,
    consume: stats.consume
  })
}

const selectionList = ref([]) // List of selected node indices for range selection
const originalSelectionList = ref([]) // Store original selection before setting new selection

const handleAddLastSelection = (selection) => {
  if (isNoSelection(selection)) {
    clearSelection()
  } else {
    selectionList.value.push(selection)
  }
}

const handleRemoveLastSelection = () => {
  if (selectionList.value.length > 0) {
    selectionList.value.pop()
  } else {
    console.warn('handleRemoveLastSelection called but selection list is already empty')
  }
}

const handleUpdateLastSelection = (selection) => {
  if (isNoSelection(selection)) {
    clearSelection()
  } else {
    if (selectionList.value.length > 0) {
      if (props.tableType !== 'edit' && isRangeSelection(selection)) {
        // [Todo] Look deep to select another one instead of cancel selection
        clearSelection()
      } else {
        selectionList.value[selectionList.value.length - 1] = selection
      }
    } else {
      console.warn('handleUpdateLastSelection called but no existing selection to update')
    }
  }
}

const handlePassSelection = (nodeIndex) => {
  if (props.tableType === 'record') {
    handleSetSelection([], nodeIndex)
  } else {
    if (selectionList.value.length === 0) {
      handleAddLastSelection(createSelection(nodeIndex, nodeIndex))
    } else if (selectionList.value.length === 1) {
      const newSelection = updateSelection(selectionList.value[0], nodeIndex)
      if (newSelection) {
        handleUpdateLastSelection(newSelection)
      } else {
        clearSelection()
      }
    } else {
      clearSelection()
    }
  }
}

const handleSetSelection = (newSelectionList, nodeIndex) => {
  originalSelectionList.value = selectionList.value
  const safeList = Array.isArray(newSelectionList) ? newSelectionList : []
  selectionList.value = [createSelection(nodeIndex, nodeIndex), ...safeList]
  console.log('[CrochetDisplay] handleSetSelection called with nodeIndex:', nodeIndex, 'newSelectionList:', newSelectionList, 'updated selectionList:', selectionList.value)
  emit('ask-for-selection-position', selectionList.value)
}

const revertSelection = () => {
  selectionList.value = originalSelectionList.value
}

const handleSelection = (nIndex) => {
  if (selectionList.value.length === 0) return null
  const firstRange = selectionList.value[0]
  return isInSelection(firstRange, nIndex) ? selectionList.value : null
}

watch(selectionList, () => {
  const validatedSelection = validateSelectionList(selectionList.value)
  if (JSON.stringify(validatedSelection) !== JSON.stringify(selectionList.value)) {
    selectionList.value = validatedSelection
    return
  }

  emitSelection()
}, { deep: true })

// Helper to emit selection with derived properties
const emitSelection = () => {
  emit('selection-change', selectionList.value)
}

const validateSelectionList = (selectionListValue) => {
  if (!selectionListValue || selectionListValue.length === 0) return []

  const selectionPath = selectionListValue.slice(0, -1)
  const lastSelection = selectionListValue[selectionListValue.length - 1]

  if (!lastSelection || isNoSelection(lastSelection)) return []

  let currentPattern = props.stitchNodeList

  for (const selection of selectionPath) {
    if (isNoSelection(selection) || isRangeSelection(selection)) return []
    if (!currentPattern || currentPattern.length <= selection.start) return []

    const nextNode = currentPattern[selection.start]
    if (!nextNode || nextNode.type !== 'pattern' || !Array.isArray(nextNode.pattern)) return []
    currentPattern = nextNode.pattern
  }

  if (!currentPattern || currentPattern.length <= lastSelection.start) return []
  if (isRangeSelection(lastSelection)) {
    if (lastSelection.start < 0 || lastSelection.end >= currentPattern.length) return []
  }

  return selectionListValue
}

const calculatePatternStats = (pattern, repeatCount = 1) => {
  let totalConsume = 0
  let totalGenerate = 0

  pattern.forEach(anchor => {
    if (anchor.type === 'stitch') {
      const stitch = BasicStitch[anchor.stitch_id]
      if (stitch) {
        const count = anchor.count || 1
        totalConsume += (stitch.consume || 0) * count
        totalGenerate += (stitch.generate || 0) * count
      }
    } else if (anchor.type === 'bundle') {
      const count = anchor.count || 1
      totalConsume += (anchor.consume || 1) * count
      totalGenerate += (anchor.generate || 0) * count
    } else if (anchor.type === 'pattern') {
      const nested = calculatePatternStats(anchor.pattern || [], anchor.count || 1)
      totalConsume += nested.consume
      totalGenerate += nested.generate
    }
  })

  return {
    consume: totalConsume * repeatCount,
    generate: totalGenerate * repeatCount
  }
}

const getSelectionInfo = () => {
  if (selectionList.value.length === 0) return null

  const lastRange = selectionList.value[selectionList.value.length - 1]
  const rowContent = [...props.stitchNodeList]
  let currentList = rowContent
  const pathStack = []

  for (let i = 0; i < selectionList.value.length - 1; i += 1) {
    const nodeIndex = selectionList.value[i].start
    const node = currentList[nodeIndex]
    if (!node || node.type !== 'pattern' || !Array.isArray(node.pattern)) return null
    pathStack.push({ node, list: currentList, index: nodeIndex })
    currentList = node.pattern
  }

  return {
    rowContent,
    currentList,
    pathStack,
    lastRange
  }
}

const recalcAncestorPatterns = (pathStack) => {
  for (let i = pathStack.length - 1; i >= 0; i -= 1) {
    const { node } = pathStack[i]
    if (node.type === 'pattern' && Array.isArray(node.pattern)) {
      const stats = calculatePatternStats(node.pattern, node.count || 1)
      node.consume = stats.consume
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

const updateNodeCount = (newCount) => {
  console.log('[updateNodeCount]', newCount)

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
      const stats = calculatePatternStats(patternNode.pattern, patternNode.count)
      patternNode.consume = stats.consume
      patternNode.generate = stats.generate
      currentList.splice(selectedIndex, 1, patternNode)
    } else {
      selectedNode.count = newCount
      if (selectedNode.type === 'pattern' && Array.isArray(selectedNode.pattern)) {
        const stats = calculatePatternStats(selectedNode.pattern, selectedNode.count || 1)
        selectedNode.consume = stats.consume
        selectedNode.generate = stats.generate
      }
    }
  }

  if (removedSelected) {
    cleanupEmptyParents(pathStack)
  }

  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const clearSelection = () => {
  selectionList.value = []
  emitSelection()
}

const setSelection = (newSelectionList) => {
  console.log('setSelection called with:', newSelectionList)
  if (!newSelectionList || newSelectionList.length === 0) {
    console.warn('Invalid newSelectionList for setSelection:', newSelectionList)
    return
  }

  selectionList.value = newSelectionList
  emitSelection()
}

const addStitch = (stitchId) => {
  const rowContent = [...props.stitchNodeList]

  console.log('[addStitch]', stitchId, rowContent)
  // Check if last node is same stitch type, increment count instead of adding new
  if (rowContent.length > 0) {
    const lastNode = rowContent[rowContent.length - 1]
    if (lastNode) {
      if (lastNode.pattern.length === 1 && lastNode.pattern[0].type === 'stitch' && lastNode.pattern[0].stitch_id === stitchId) {
        lastNode.count += 1
        const stats = calculatePatternStats(lastNode.pattern, lastNode.count)
        lastNode.consume = stats.consume
        lastNode.generate = stats.generate
        emitUpdatedRow(rowContent)
        return
      }
    }
  }

  // Add new SimpleStitch at end
  rowContent.push({
    type: 'pattern',
    pattern: [{ type: 'stitch', stitch_id: stitchId }],
    count: 1,
    consume: BasicStitch[stitchId]?.consume || 0,
    generate: BasicStitch[stitchId]?.generate || 0
  })
  emitUpdatedRow(rowContent)
}

const addBundle = (bundle) => {
  console.log('[addBundle]', bundle)
  const rowContent = [...props.stitchNodeList]

  // Add bundle wrapped in a pattern at end
  const newPattern = createPattern(1, [bundle])
  rowContent.push(newPattern)
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
    clearSelection()
    return
  }

  const selectedIndex = lastRange.start
  if (selectedIndex === null || selectedIndex === undefined) return

  currentList.splice(selectedIndex, 1)
  cleanupEmptyParents(pathStack)
  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
  clearSelection()
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

const changeSelectedStitch = (stitchId) => {
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  const selectedNode = currentList[lastRange.start]
  if (!selectedNode || selectedNode.type !== 'stitch') return

  selectedNode.stitch_id = stitchId
  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

const updateNodePattern = (newPattern) => {
  console.log('[updateNodePattern]', newPattern)
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) return

  const { rowContent, currentList, pathStack, lastRange } = selectionInfo
  if (isRangeSelection(lastRange)) return

  const selectedNode = currentList[lastRange.start]
  if (!selectedNode || selectedNode.type !== 'pattern') return

  selectedNode.pattern = newPattern
  const stats = calculatePatternStats(newPattern, selectedNode.count || 1)
  selectedNode.consume = stats.consume
  selectedNode.generate = stats.generate

  recalcAncestorPatterns(pathStack)
  emitUpdatedRow(rowContent)
}

defineExpose({
  addStitch,
  addBundle,
  deleteSelected,
  updateNodeCount,
  changeSelectedStitch,
  updateNodePattern,
  createPatternFromRange,
  clearSelection,
  setSelection,
  revertSelection
})
</script>

<style scoped>
.row-actions-display {
  flex: 1;
  line-height: 1;
  font-size: 0.875rem;
  overflow: visible;
  white-space: nowrap;
  position: relative;
}

.separator {
  color: #6b7280;
}
</style>
