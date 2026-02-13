<template>
  <div ref="tableRef" class="row-list-vertical" :class="{ edit: type === 'edit' }">
    <div
      v-for="(row, idx) in visibleRows"
      :key="row.row_index"
      class="row-container"
      :class="{ 'dragging': draggedRowIndex === row.row_index, 'drag-over': dragOverRowIndex === row.row_index }"
      @click.stop
      @dragover="handleDragOver(row.row_index, $event)"
      @dragleave="handleDragLeave"
      @drop="handleDrop(row.row_index, $event)"
    >
      <div class="row-main">
        <div
          v-if="type === 'edit'"
          class="drag-handle"
          draggable="true"
          @dragstart="handleDragStart(row.row_index, $event)"
          @dragend="handleDragEnd"
          @mousedown.stop
        >
          ⋮⋮
        </div>
        <RowAction
          :show="showRowAction && editingRowIndex === row.row_index"
          @copy="handleCopyRow(row.row_index)"
          @delete="handleDeleteRow(row.row_index)"
          @cancel="showRowAction = false"
        />
        <CrochetRow
          :ref="el => {
            if (el && isEditing(row.row_index)) editingRowRef = el
            setRowRef(row.row_index)(el)
          }"
          :row="visibleRows[idx]"
          :previous-generate="getPreviousGenerate(row.row_index)"
          :is-editing="isEditing(row.row_index)"
          :table-type="type"
          @edit-row="handleEditRow(row.row_index)"
          @blur-row="handleBlurRow"
          @update:row="handleUpdateRow(row.row_index, $event)"
          @update:row-repeat="handleUpdateRowRepeat(row.row_index, $event)"
          @delete-row="handleDeleteRow(row.row_index)"
          @copy-row="handleCopyRow(row.row_index)"
          @show-row-action="handleShowRowAction(row.row_index, $event)"
          @show-selection-position="handleShowSelectionPosition"
          @crochet-select="handleCrochetSelect(row.row_index, $event)"
          @update-end-at="(row_index, crochet_count) => $emit('update-end-at', row_index, crochet_count)"
        />
      </div>
      <div v-if="row.count > 1" class="repeat-reminder">
        重複做{{ row.count }}行
      </div>
    </div>

    <button type="button" v-if="type==='edit'" @click="handleAddRow" class="btn-add-row">+</button>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import CrochetRow from './CrochetRow.vue'
import RowAction from './RowAction.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  type: {
    type: String,
    default: 'edit',
    validator: (value) => ['edit', 'view', 'record'].includes(value)
  },
  componentId: {
    type: Number,
    default: 0
  },
  componentName: {
    type: String,
    default: ''
  },
})

const emit = defineEmits(['update:modelValue', 'crochet-select', 'update-end-at'])

// Track which row has a selection in record mode
const selectedRowIndex = ref(null)
const isApplyingSelection = ref(false)
const rowRefs = new Map()

const activeSelectionPositionRowIndex = ref(null)

const handleShowSelectionPosition = (rowIndex) => {
  if (activeSelectionPositionRowIndex.value !== null && activeSelectionPositionRowIndex.value !== rowIndex) {
    const prevRowRef = rowRefs.get(activeSelectionPositionRowIndex.value)
    if (prevRowRef && typeof prevRowRef.closeSelectionPosition === 'function') {
      prevRowRef.closeSelectionPosition()
    }
  }
  activeSelectionPositionRowIndex.value = rowIndex
}

const setRowRef = (rowIndex) => (el) => {
  if (el) {
    rowRefs.set(rowIndex, el)
  } else {
    rowRefs.delete(rowIndex)
  }
}

// Internal copy of rows for manipulation
const internalRows = ref([...props.modelValue])

// Sync internalRows when parent updates modelValue
// This ensures we get external changes while avoiding circular updates
let isEmitting = false
watch(() => props.modelValue, (newValue) => {
  if (!isEmitting) {
    internalRows.value = [...newValue]
  }
}, { deep: true })

// Recalculate row_index for all rows starting from a given array index
const recalculateRowIndices = (startArrayIndex) => {
  for (let i = startArrayIndex + 1; i < internalRows.value.length; i++) {
    const prevRow = internalRows.value[i - 1]
    internalRows.value[i].row_index = prevRow.row_index + prevRow.count
  }
}

// Update parent with current rows
const emitUpdate = () => {
  isEmitting = true
  emit('update:modelValue', [...internalRows.value])
  // Reset the flag after Vue updates
  nextTick(() => {
    isEmitting = false
  })
}

const tableRef = ref(null)
const editingRowRef = ref(null)
const editingRowIndex = ref(undefined)
const showRowAction = ref(false)
const draggedRowIndex = ref(null)
const dragOverRowIndex = ref(null)

// Click outside handler
const handleClickOutside = (event) => {
  if (editingRowIndex.value !== undefined && tableRef.value) {
    if (!tableRef.value.contains(event.target)) {
      handleBlurRow()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const addStitch = (stitchId) => {
  if (editingRowRef.value) {
    editingRowRef.value.addStitch(stitchId)
  }
}

const addBundle = (bundle) => {
  if (editingRowRef.value) {
    editingRowRef.value.addBundle(bundle)
  }
}

// Drag and drop handlers
const handleDragStart = (rowIndex, event) => {
  console.log('Drag start row', rowIndex)
  draggedRowIndex.value = rowIndex
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', rowIndex)
}

const handleDragOver = (rowIndex, event) => {
  if (draggedRowIndex.value !== null && draggedRowIndex.value !== rowIndex) {
    event.preventDefault()
    dragOverRowIndex.value = rowIndex
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragLeave = () => {
  dragOverRowIndex.value = null
}

const handleDrop = (targetRowIndex, event) => {
  if (draggedRowIndex.value === null || draggedRowIndex.value === targetRowIndex) {
    return
  }

  event.preventDefault()

  const draggedArrayIndex = internalRows.value.findIndex(r => r.row_index === draggedRowIndex.value)
  const targetArrayIndex = internalRows.value.findIndex(r => r.row_index === targetRowIndex)

  if (draggedArrayIndex === -1 || targetArrayIndex === -1) {
    return
  }

  // Remove the dragged row from its current position
  const [draggedRow] = internalRows.value.splice(draggedArrayIndex, 1)

  // Insert it at the target position
  // If dragging down, the target index needs adjustment since we removed an item
  const insertIndex = draggedArrayIndex < targetArrayIndex ? targetArrayIndex : targetArrayIndex
  internalRows.value.splice(insertIndex, 0, draggedRow)

  // Recalculate all row indices from the beginning
  recalculateAllRowIndices()
  emitUpdate()

  dragOverRowIndex.value = null
}

const handleDragEnd = () => {
  draggedRowIndex.value = null
  dragOverRowIndex.value = null
}

const recalculateAllRowIndices = () => {
  for (let i = 0; i < internalRows.value.length; i++) {
    if (i === 0) {
      internalRows.value[i].row_index = 1
    } else {
      const prevRow = internalRows.value[i - 1]
      internalRows.value[i].row_index = prevRow.row_index + prevRow.count
    }
  }
}

const handleEditRow = (rowIndex) => {
  console.log('handleEditRow', rowIndex)
  if (editingRowIndex.value !== rowIndex) {
    showRowAction.value = false
  }
  editingRowIndex.value = rowIndex
}

const handleBlurRow = () => {
  editingRowIndex.value = undefined
  showRowAction.value = false
}

const handleShowRowAction = (rowIndex) => {
  if (showRowAction.value && editingRowIndex.value === rowIndex) {
    // Toggle off if already shown for the same row
    showRowAction.value = false
  } else {
    editingRowIndex.value = rowIndex
    showRowAction.value = true
  }
}

const handleCrochetSelect = (rowIndex, isSelected) => {
  if (isApplyingSelection.value) {
    return
  }
  if (props.type === 'record') {
    if (!isSelected) {
      if (selectedRowIndex.value === rowIndex) {
        selectedRowIndex.value = null
      }
      return
    }

    // Clear selections in other rows
    if (selectedRowIndex.value !== null && selectedRowIndex.value !== rowIndex) {
      const prevRowRef = rowRefs.get(selectedRowIndex.value)
      if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
        prevRowRef.clearSelection()
      }
    }

    selectedRowIndex.value = rowIndex
  }
}

const applySelection = (endAt) => {
  const { row_index, selectionList } = endAt
  if (props.type !== 'record') return

  if (!selectionList || selectionList.length === 0) {
    if (selectedRowIndex.value !== null) {
      const prevRowRef = rowRefs.get(selectedRowIndex.value)
      if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
        prevRowRef.clearSelection()
      }
    }
    selectedRowIndex.value = null
    return
  }

  if (selectedRowIndex.value !== null && selectedRowIndex.value !== row_index) {
    const prevRowRef = rowRefs.get(selectedRowIndex.value)
    if (prevRowRef && typeof prevRowRef.clearSelection === 'function') {
      prevRowRef.clearSelection()
    }
  }

  selectedRowIndex.value = row_index
  const rowRef = rowRefs.get(row_index)
  if (rowRef && typeof rowRef.setSelection === 'function') {
    isApplyingSelection.value = true
    rowRef.setSelection(selectionList)
    nextTick(() => {
      isApplyingSelection.value = false
    })
  }
}

const handleUpdateRow = (rowIndex, updatedRow) => {
  const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
  if (arrayIndex !== -1) {
    internalRows.value[arrayIndex] = updatedRow
    emitUpdate()
  }
}

const handleUpdateRowRepeat = (rowIndex, newCount) => {
  const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
  if (arrayIndex !== -1) {
    internalRows.value[arrayIndex].count = newCount
    recalculateRowIndices(arrayIndex)
    emitUpdate()
  }
}

const handleCopyRow = (rowIndex) => {
  const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
  if (arrayIndex === -1) return

  const rowToCopy = internalRows.value[arrayIndex]

  // Calculate the row_index for the new row
  const lastRow = internalRows.value[internalRows.value.length - 1]
  const newRowIndex = lastRow ? lastRow.row_index + lastRow.count : 1

  // Create new row by copying content and count
  const newRow = {
    row_index: newRowIndex,
    count: rowToCopy.count,
    content: {
      stitch_node_list: JSON.parse(JSON.stringify(rowToCopy.content.stitch_node_list)),
      generate: rowToCopy.content.generate,
      consume: rowToCopy.content.consume
    }
  }

  internalRows.value.push(newRow)
  emitUpdate()

  // Switch to editing the new row
  editingRowIndex.value = newRowIndex
}

const handleDeleteRow = (rowIndex) => {
  const arrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
  if (arrayIndex === -1) return

  // Remove the row
  internalRows.value.splice(arrayIndex, 1)

  // Recalculate row indices for all subsequent rows
  recalculateRowIndices(arrayIndex - 1)

  emitUpdate()

  // Clear editing state if the deleted row was being edited
  if (editingRowIndex.value === rowIndex) {
    editingRowIndex.value = undefined
  }

  showRowAction.value = false
}

const handleAddRow = () => {
  // Calculate the row_index for the new row
  const lastRow = internalRows.value[internalRows.value.length - 1]
  const newRowIndex = lastRow ? lastRow.row_index + lastRow.count : 1

  // Create new row
  const newRow = {
    row_index: newRowIndex,
    count: 1,
    content: {
      stitch_node_list: [],
      generate: 0,
      consume: 0
    }
  }

  internalRows.value.push(newRow)
  emitUpdate()

  // Switch to editing the new row
  editingRowIndex.value = newRowIndex
}

const setSelectionForRow = (rowIndex, nodeIndex, innerStitchIndex = null) => {
  const rowRef = rowRefs.get(rowIndex)
  if (rowRef && typeof rowRef.setSelection === 'function') {
    rowRef.setSelection(nodeIndex, innerStitchIndex)
    return true
  }
  return false
}

defineExpose({
  addStitch,
  addBundle,
  setSelectionForRow,
  applySelection
})

const visibleRows = computed(() => {
  const maxVisible = 100

  if (editingRowIndex.value === undefined) {
    return internalRows.value.slice(-maxVisible)
  }

  const editingIndexInList = internalRows.value.findIndex(row => row.row_index === editingRowIndex.value)

  if (editingIndexInList === -1) {
    return internalRows.value.slice(-maxVisible)
  }

  const start = Math.max(0, editingIndexInList - Math.floor(maxVisible / 2))
  const end = Math.min(internalRows.value.length, start + maxVisible)

  return internalRows.value.slice(start, end)
})

const isEditing = (rowIndex) => {
  return editingRowIndex.value === rowIndex
}

const getPreviousGenerate = (rowIndex) => {
  // Find the row with this row_index in the array
  const currentRowArrayIndex = internalRows.value.findIndex(r => r.row_index === rowIndex)
  if (currentRowArrayIndex <= 0) return 0

  const previousRow = internalRows.value[currentRowArrayIndex - 1]
  if (!previousRow) return 0
  return previousRow.content.generate
}
</script>

<style scoped>
.row-list-vertical {
  display: flex;
  flex-direction: column;
  margin-top: 1rem;
  overflow: visible;
}
.row-list-vertical.edit {
  margin-left: 20px;
}

.btn-add-row {
  width: 100%;
  background: transparent;
  color: #42b983;
  padding: 0.5rem;
  border: 2px dotted #42b983;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  margin-top: 0.5rem;
}

.btn-add-row:hover {
  background: #f9fafb;
  border-color: #42b983;
  color: #42b983;
}

.row-container {
  width: 100%;
  overflow: visible;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: all 0.2s;
}

.row-main {
  display: flex;
  align-items: stretch;
  width: 100%;
  position: relative;
}

.repeat-reminder {
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.1;
  margin-top: 4px;
  margin-bottom: 8px;
}

.drag-handle {
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 24px;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 1rem;
  user-select: none;
  z-index: 10;
}

.drag-handle:hover {
  color: #42b983;
}

.drag-handle:active {
  cursor: grabbing;
}

.row-container.dragging {
  opacity: 0.5;
}

.row-container.dragging .drag-handle {
  cursor: grabbing;
}

.row-container.drag-over {
  border-top: 3px solid #42b983;
  padding-top: 3px;
}

.row-container > :not(.drag-handle) {
  flex: 1;
}

:deep(.row-table) {
  display: grid;
  grid-template-columns: 50px 1fr 50px;
  align-items: stretch;
}

:deep(.row-table-cell) {
  padding: 0.25rem 0.75rem;
  border-right: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
}

:deep(.row-table-cell:last-child) {
  border-right: none;
}

:deep(.row-number) {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  text-align: center;
  background: #f9fafb;
}

:deep(.row-stitches) {
  font-size: 0.875rem;
  line-height: 1.8;
  color: #4b5563;
  overflow-x: scroll;
  text-overflow: ellipsis;
  white-space: nowrap;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

:deep(.row-stitches::-webkit-scrollbar) {
  display: none; /* Chrome, Safari, Opera */
}

:deep(.row-generate) {
  font-size: 1rem;
  font-weight: 600;
  color: #42b983;
  text-align: center;
  background: #f0fdf4;
  transition: all 0.3s;
}

:deep(.row-generate.valid) {
  background: #d1fae5;
  color: #065f46;
}

:deep(.row-generate.less) {
  background: #fed7aa;
  color: #9a3412;
}

:deep(.row-generate.invalid) {
  background: #fee2e2;
  color: #991b1b;
}

:deep(.stitch-preview) {
  color: #111827;
}
</style>
